import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useSteps } from '../../context/StepContext';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AnimatedBackground = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const opacity2 = useSharedValue(0.6);

  React.useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.2, { duration: 2500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1.2, { duration: 3000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      -1,
      true
    );
    opacity2.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const layers = Array.from({ length: 48 });

  return (
    <View style={styles.backgroundContainer} pointerEvents="none">
      <Animated.View style={[styles.circleContainer, { top: -160, left: -160, width: 360, height: 360 }, animatedStyle1]}>
        {layers.map((_, i) => (
          <View
            key={`c1-${i}`}
            style={{
              position: 'absolute',
              top: i * 1.2,
              left: i * 1.2,
              width: 340 - i * 3,
              height: 340 - i * 3,
              borderRadius: (340 - i * 3) / 2,
              backgroundColor: '#3B82F6',
              opacity: 0.004 + (i * 0.0009),
            }}
          />
        ))}
      </Animated.View>

      <Animated.View style={[styles.circleContainer, { bottom: -180, right: -180, width: 380, height: 380 }, animatedStyle2]}>
        {layers.map((_, i) => (
          <View
            key={`c2-${i}`}
            style={{
              position: 'absolute',
              top: i * 1.2,
              left: i * 1.2,
              width: 360 - i * 3,
              height: 360 - i * 3,
              borderRadius: (360 - i * 3) / 2,
              backgroundColor: '#22D3EE',
              opacity: 0.004 + (i * 0.0009),
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [dailyStepGoal, setDailyStepGoal] = useState(3000);
  const { isLoggingOut, isBoostActive, boostType } = useSteps();
  const isSyncing = useRef(false);
  const lastStepValueFromListener = useRef(0);
  const isInitialized = useRef(false);

  const handleGoalChange = async (newGoal: number) => {
    if (newGoal < 3000) newGoal = 3000;
    setDailyStepGoal(newGoal);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, { dailyStepGoal: newGoal });
      } catch (err) {
        // ignore update errors silently
      }
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
      console.error('[SYNC] Error:', error);
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

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      try {
        const todaySteps = await Pedometer.getStepCountAsync(startOfToday, new Date());
        if (todaySteps.steps > initialTodaysSteps) {
          setTodaysSteps(todaySteps.steps);
        }
      } catch (error) {
        // fallback to watchStepCount
      }

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
      console.error('Error finalizing previous day:', error);
    } finally {
      isSyncing.current = false;
    }
  };

  const progress = Math.min((todaysSteps / dailyStepGoal) * 100, 100);
  const formattedStepCount = String(todaysSteps).padStart(4, '0');

  return (
    <View style={styles.page}>
      <AnimatedBackground />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Today's Steps</Text>
      </View>

      {isBoostActive && (
        <View style={styles.boostCard}>
          <Text style={styles.boostTitle}>🌅 {boostType?.toUpperCase()} BOOST ACTIVE!</Text>
          <Text style={styles.boostSubtitle}>Earning 2x coins! (0.02 per step)</Text>
        </View>
      )}

      <View style={styles.centerArea}>
        <View style={styles.stepBox}>
          {/* Progress ring circle */}
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Circle cx="110" cy="110" r="95" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="rgba(31,41,55,0.18)" />
            <Circle
              cx="110"
              cy="110"
              r="95"
              stroke="#00C6FF"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 95}`}
              strokeDashoffset={`${(1 - progress / 100) * (2 * Math.PI * 95)}`}
              rotation="-90"
              origin="110, 110"
            />
            <Text />
          </Svg>

          <View style={styles.stepInner}>
            <Text style={styles.stepCount}>{formattedStepCount}</Text>
          </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  circleContainer: {
    position: 'absolute',
  },

  headerContainer: {
    paddingTop: 40, // moved down
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24, // match coin header
    fontWeight: '700',
  },

  boostCard: {
    backgroundColor: 'rgba(31,41,55,0.45)',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  boostTitle: { color: '#fff', fontWeight: '700' },
  boostSubtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },

  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  stepBox: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    // background kept subtle to match overall aesthetic
    backgroundColor: 'transparent',
  },
  stepInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: { fontSize: 48, fontWeight: 'bold', color: '#fff' },

  goalContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  goalButtons: {
    flexDirection: 'row',
    marginTop: 10,
    width: 150,
    justifyContent: 'space-around',
  },

  progressBarBackground: {
    width: '80%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00C6FF',
    borderRadius: 10,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },

  // legacy / fallback styles (kept for safety)
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, alignItems: 'center' },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },

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

  // debug / test styles left intentionally (not used)
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
});