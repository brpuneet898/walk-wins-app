import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useSteps, DailyRecord } from '../../context/StepContext';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const { setLifetimeSteps, setDailyRecords, isLoggingOut } = useSteps();

  const isSyncing = useRef(false);
  const lastStepValueFromListener = useRef(0);
  const isInitialized = useRef(false);

  const syncToFirebase = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const todayString = getLocalDateString();
      const storedSteps = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const currentStepCount = storedSteps ? parseInt(storedSteps, 10) : 0;
      
      if (currentStepCount === 0 && !dailyDocSnap.exists()) return;

      const dailyDocRef = doc(db, `users/${currentUser.uid}/dailySteps`, todayString);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const dailyDocSnap = await getDoc(dailyDocRef);
      const stepsAlreadyInDb = dailyDocSnap.exists() ? dailyDocSnap.data().steps : 0;
      const incrementAmount = currentStepCount - stepsAlreadyInDb;

      if (incrementAmount > 0) {
        await setDoc(dailyDocRef, { steps: currentStepCount });
        await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });

        setLifetimeSteps(prevTotal => prevTotal + incrementAmount);
        
        const dailyStepsRef = collection(db, `users/${currentUser.uid}/dailySteps`);
        const q = query(dailyStepsRef, orderBy('__name__', 'desc'));
        const querySnapshot = await getDocs(q);
        const records: DailyRecord[] = querySnapshot.docs.map(d => ({
          id: d.id,
          steps: d.data().steps || 0,
        }));
        setDailyRecords(records);

        console.log(`[SYNC] Synced ${incrementAmount} new steps and updated context.`);
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
      setIsPedometerAvailable(isAvailable);
      if (!isAvailable) return;

      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') return;

      await finalizePreviousDaySteps();

      const todayString = getLocalDateString();
      const storedData = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      setTodaysSteps(initialTodaysSteps);

      subscription = Pedometer.watchStepCount(result => {
        const currentListenerSteps = result.steps;
        if (!isInitialized.current) {
          lastStepValueFromListener.current = currentListenerSteps;
          isInitialized.current = true;
          return;
        }
        let incrementStep = currentListenerSteps - lastStepValueFromListener.current;
        lastStepValueFromListener.current = currentListenerSteps;
        if (incrementStep < 0) incrementStep = 0;
        if (incrementStep > 0) {
          setTodaysSteps(prevSteps => prevSteps + incrementStep);
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
      if (hourlySyncInterval) {
        clearInterval(hourlySyncInterval);
      }
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
            if(incrementAmount > 0) {
              await setDoc(dailyDocRef, { steps: finalStepCount });
              await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });
              
              setLifetimeSteps(prevTotal => prevTotal + incrementAmount);
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

  const formattedStepCount = String(todaysSteps).padStart(4, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Steps</Text>
      <View style={styles.content}>
        {!isPedometerAvailable ? (
          <Text style={styles.infoText}>Pedometer not available.</Text>
        ) : (
          <View style={styles.stepBox}>
            <Text style={styles.stepCount}>{formattedStepCount}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, alignItems: 'center' },
    header: { fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stepBox: { width: 200, height: 200, borderWidth: 5, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    stepCount: { fontSize: 60, fontWeight: 'bold' },
    infoText: { fontSize: 18, color: '#333', marginTop: 20 },
});