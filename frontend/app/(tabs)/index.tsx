import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useSteps } from '../../context/StepContext';
import { FontAwesome } from '@expo/vector-icons';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [dailyStepGoal, setDailyStepGoal] = useState(3000); // State for the daily step goal
  const { isLoggingOut, isBoostActive, boostType } = useSteps();
  const isSyncing = useRef(false);
  const lastStepValueFromListener = useRef(0);
  const isInitialized = useRef(false);

  // Function to handle changes to the step goal
  const handleGoalChange = async (newGoal: number) => {
    if (newGoal < 3000) newGoal = 3000; // Enforce minimum goal
    setDailyStepGoal(newGoal);

    // Save the new goal to the user's document in Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { dailyStepGoal: newGoal });
    }
  };

  const syncToFirebase = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const todayString = getLocalDateString();
      const storedSteps = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const currentStepCount = storedSteps ? parseInt(storedSteps, 10) : 0;
      if (currentStepCount === 0) return;
      const dailyDocRef = doc(db, `users/${currentUser.uid}/dailySteps`, todayString);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const dailyDocSnap = await getDoc(dailyDocRef);
      const stepsAlreadyInDb = dailyDocSnap.exists() ? dailyDocSnap.data().steps : 0;
      const incrementAmount = currentStepCount - stepsAlreadyInDb;
      if (incrementAmount > 0) {
        await setDoc(dailyDocRef, { steps: currentStepCount });
        await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });
      }
    } catch (error) {
      console.error("[SYNC] Error:", error);
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    let subscription: Pedometer.PedometerListener | null = null;
    let hourlySyncInterval: NodeJS.Timeout | null = null;

    const init = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      console.log('Pedometer available:', isAvailable);
      setIsPedometerAvailable(isAvailable);
      if (!isAvailable) {
        console.log('Pedometer not available on this device');
        return;
      }
      const { status } = await Pedometer.requestPermissionsAsync();
      console.log('Permission status:', status);
      if (status !== 'granted') {
        console.log('Permission not granted');
        return;
      }

      await finalizePreviousDaySteps();

      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().dailyStepGoal) {
          setDailyStepGoal(userDoc.data().dailyStepGoal);
        }
      }

      const todayString = getLocalDateString();
      const storedData = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      setTodaysSteps(initialTodaysSteps);

      subscription = Pedometer.watchStepCount(result => {
        console.log('Step count from sensor:', result.steps);
        const currentListenerSteps = result.steps;
        if (!isInitialized.current) {
          lastStepValueFromListener.current = currentListenerSteps;
          isInitialized.current = true;
          console.log('Initialized with steps:', currentListenerSteps);
          return;
        }
        let incrementStep = currentListenerSteps - lastStepValueFromListener.current;
        lastStepValueFromListener.current = currentListenerSteps;
        if (incrementStep < 0) incrementStep = 0;
        if (incrementStep > 0) {
          console.log('Adding steps:', incrementStep);
          setTodaysSteps(prevSteps => {
            const newSteps = prevSteps + incrementStep;
            console.log('New total steps:', newSteps);



            return newSteps;
          });
        }
      });
      hourlySyncInterval = setInterval(syncToFirebase, 3600000);
    };
    init();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        syncToFirebase();
      }
    });

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
      if (hourlySyncInterval) clearInterval(hourlySyncInterval);
      if (!isLoggingOut) {
        syncToFirebase();
      }
    };
  }, [isLoggingOut]);

  useEffect(() => {
    const saveToDevice = async () => {
      const todayString = getLocalDateString();
      await AsyncStorage.setItem(`dailySteps_${todayString}`, String(todaysSteps));
    };
    if (isInitialized.current) {
      saveToDevice();
    }
  }, [todaysSteps]);

  const finalizePreviousDaySteps = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      const todayString = getLocalDateString();
      const lastSyncDate = await AsyncStorage.getItem('lastSyncDate');
      if (lastSyncDate === todayString) return;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = getLocalDateString(yesterday);
      if (lastSyncDate && lastSyncDate === yesterdayString) {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const stepsToFinalize = await AsyncStorage.getItem(`dailySteps_${lastSyncDate}`);
        const finalStepCount = stepsToFinalize ? parseInt(stepsToFinalize, 10) : 0;
        if (finalStepCount > 0) {
          const dailyDocRef = doc(db, `users/${currentUser.uid}/dailySteps`, lastSyncDate);
          const userDocRef = doc(db, 'users', currentUser.uid);
          const dailyDocSnap = await getDoc(dailyDocRef);
          const stepsAlreadyInDb = dailyDocSnap.exists() ? dailyDocSnap.data().steps : 0;
          const incrementAmount = finalStepCount - stepsAlreadyInDb;
          if (incrementAmount > 0) {
            await setDoc(dailyDocRef, { steps: finalStepCount });
            await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });
          }
        }
      }
      await AsyncStorage.setItem('lastSyncDate', todayString);
    } catch (error) {
      console.error("Error finalizing previous day:", error);
    } finally {
      isSyncing.current = false;
    }
  };

  const progress = Math.min((todaysSteps / dailyStepGoal) * 100, 100);
  const formattedStepCount = String(todaysSteps).padStart(4, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Steps</Text>


      {isBoostActive && (
        <View style={styles.boostBanner}>
          <Text style={styles.boostText}>
            🌅 {boostType?.toUpperCase()} BOOST ACTIVE! 🌅
          </Text>
          <Text style={styles.boostSubtext}>
            Earning 2x coins! (0.02 per step)
          </Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.stepBox}>
          <Text style={styles.stepCount}>{formattedStepCount}</Text>
        </View>



        <View style={styles.goalContainer}>
          <Text style={styles.goalText}>Daily Goal: {dailyStepGoal} steps</Text>
          <View style={styles.goalButtons}>
            <Pressable onPress={() => handleGoalChange(dailyStepGoal - 100)}>
              <FontAwesome name="minus-circle" size={32} color="#dc3545" />
            </Pressable>
            <Pressable onPress={() => handleGoalChange(dailyStepGoal + 100)}>
              <FontAwesome name="plus-circle" size={32} color="#28a745" />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(0)}% Complete</Text>

        <Pressable
          style={styles.testButton}
          onPress={() => {
            console.log('Manual step button pressed');
            setTodaysSteps(prev => prev + 10);
          }}
        >
          <Text style={styles.testButtonText}>Add 10 Steps (Test)</Text>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, alignItems: 'center' },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  stepBox: { width: 200, height: 200, borderWidth: 5, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  stepCount: { fontSize: 60, fontWeight: 'bold' },
  goalContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 18,
    color: '#333',
  },
  goalButtons: {
    flexDirection: 'row',
    marginTop: 10,
    width: 150,
    justifyContent: 'space-around',
  },
  progressBarBackground: {
    width: '80%',
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  progressText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  debugText: {
    fontSize: 12,
    color: '#ff0000',
    marginBottom: 5,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boostBanner: {
    backgroundColor: '#FFD700',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  boostText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B00',
    textAlign: 'center',
  },
  boostSubtext: {
    fontSize: 12,
    color: '#FF6B00',
    marginTop: 3,
    textAlign: 'center',
  },
  coinBox: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  coinLabel: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 5,
  },
  coinCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 5,
  },
  coinRate: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
  },
});