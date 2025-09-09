import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - firebaseConfig is a JS module without TS types
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useSteps } from '../../context/StepContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
// Audio and mood imports
import { useAudio } from '../../context/AudioContext';
import MoodModal from '../../components/MoodModal';
import { getAvailableMoods, getCurrentSpecialTime } from '../../utils/moodUtils';
// --- Types ---
type WeeklyDay = {
  dayLabel: string;
  date: string;
  steps: number;
  goal: number;
  isToday: boolean;
};
import { LinearGradient } from 'expo-linear-gradient';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

import { calculateTotalEarnings } from '../../utils/earnings';
// Level system imports  
import { useLevelSystem } from '../../context/LevelContext';

const AnimatedBackground = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);

  React.useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity2.value = withRepeat(
      withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
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

  return (
    <View style={styles.backgroundContainer} pointerEvents="none">
      <Animated.View style={[styles.circle1, animatedStyle1]} />
      <Animated.View style={[styles.circle2, animatedStyle2]} />
    </View>
  );
};

// Weekly Progress Circle Component
type WeeklyProgressCircleProps = {
  dayLabel: string;
  date: string;
  steps: number;
  goal: number;
  isToday: boolean;
};
const WeeklyProgressCircle = ({ dayLabel, date, steps, goal, isToday }: WeeklyProgressCircleProps) => {
  const progress = Math.min((steps / goal) * 100, 100);
  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.weeklyCircleContainer, isToday && styles.todayCircle]}>
      <View style={styles.weeklyCircle}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Defs>
            <SvgGradient id={`weeklyGradient-${dayLabel}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={isToday ? "#FFD700" : "#8BC34A"} />
              <Stop offset="100%" stopColor={isToday ? "#FFA000" : "#4CAF50"} />
            </SvgGradient>
          </Defs>
          
          {/* Background circle */}
          <Circle
            cx="25"
            cy="25"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <Circle
            cx="25"
            cy="25"
            r={radius}
            stroke={`url(#weeklyGradient-${dayLabel})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin="25, 25"
            fill="transparent"
          />
        </Svg>
        
        <View style={styles.weeklyCircleContent}>
          <Text style={[styles.weeklyDayLabel, isToday && styles.todayLabel]}>{dayLabel}</Text>
        </View>
      </View>
      <Text style={[styles.weeklyDate, isToday && styles.todayDate]}>{date}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(3000);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); // 👈 ADD: User profile state
  const [showLineGraph, setShowLineGraph] = useState(false); // 👈 ADD: Line graph visibility state
  
  // Mood/Audio states
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [availableMoods, setAvailableMoods] = useState<string[]>([]);
  const [showBoostTooltip, setShowBoostTooltip] = useState(false);
  
  // Audio context
  const { currentSong, isPlaying } = useAudio();
  
  // Refs must be declared before using them
  const isSyncing = useRef(false);
  const lastStepValueFromListener = useRef(0);
  const boostStepsRef = useRef(0); // accumulate steps that occur during boost windows
  const isInitialized = useRef(false);
  
  const { isLoggingOut, isBoostActive, boostType, coins, boostSteps: ctxBoostSteps = 0, setBoostSteps, leaderboardData } = useSteps() as any;
  
  // Level system integration
  const { currentLevel, updateLifetimeSteps, lifetimeSteps } = useLevelSystem();
  
  const isBoostActiveRef = useRef(isBoostActive); // Track current boost status
  
  // Debug logging for boost state
  console.log(`[HOME DEBUG] isBoostActive from context: ${isBoostActive}, boostType: ${boostType}`);
  
  // Update ref whenever boost status changes
  isBoostActiveRef.current = isBoostActive;
  const router = useRouter();

  const coinScale = useSharedValue(1);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.8);
  
  // @ts-ignore
  const currentAuth = auth as any;
  // @ts-ignore
  const currentDb = db as any;
  const user = currentAuth.currentUser; // 👈 ADD: Get current user

  const { boostSteps = 0 } = useSteps() as any;

  // 👈 ADD: Function to get user initial
  const getUserInitial = () => {
    if (userProfile?.username) {
      // Get first letter of username
      return userProfile.username.charAt(0).toUpperCase();
    } else if (user?.email) {
      // Fallback to first letter of email
      return user.email.charAt(0).toUpperCase();
    }
    // Fallback to generic icon if no data
    return null;
  };

  const totalEarnings = calculateTotalEarnings(lifetimeSteps, coins, ctxBoostSteps, currentLevel);

  // boostSteps now comes from StepContext (real-time via onSnapshot)

  // 👈 ADD: Fetch user profile data
  const fetchUserProfile = async () => {
    try {
  const currentUser = currentAuth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
    } catch (error: any) {
      if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
        console.log('[PROFILE] App is offline - using cached profile data');
      } else {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  // Fetch weekly data
  const fetchWeeklyData = async () => {
    console.log('[WEEKLY DATA] Starting to fetch weekly data...');
    console.log('[WEEKLY DATA] Current todaysSteps value:', todaysSteps);
    try {
      const currentUser = currentAuth.currentUser;
      if (!currentUser) {
        console.log('[WEEKLY DATA] No current user, skipping fetch');
        return;
      }

      // Don't fetch during logout to prevent permission errors
      if (isLoggingOut) {
        console.log('[WEEKLY DATA] Skipping fetch during logout');
        return;
      }

      console.log('[WEEKLY DATA] Current user ID:', currentUser.uid);

      const today = new Date();
      const weekData = [];
      const dayLabels = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
      
      // Get Monday of current week
      const monday = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) and Monday (1)
      monday.setDate(today.getDate() + diff);

      console.log('[WEEKLY DATA] Today:', getLocalDateString(today));
      console.log('[WEEKLY DATA] Monday of current week:', getLocalDateString(monday));

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const dateString = getLocalDateString(date);
        const dayLabel = dayLabels[i];
        const isToday = dateString === getLocalDateString(today);
        
        let steps = 0;
        
        if (isToday) {
          // For today, use the live todaysSteps value
          steps = todaysSteps;
          console.log(`[WEEKLY DATA] ${dateString} (${dayLabel}): IS TODAY - Using live todaysSteps=${steps}`);
        } else {
          // For other days, check both Firestore and AsyncStorage
          try {
            console.log(`[WEEKLY DATA] Fetching data for ${dateString} (${dayLabel})...`);
            
            // First check AsyncStorage for potentially newer data
            const storedSteps = await AsyncStorage.getItem(`dailySteps_${dateString}`);
            const localSteps = storedSteps ? parseInt(storedSteps, 10) : 0;
            console.log(`[WEEKLY DATA] ${dateString} AsyncStorage steps: ${localSteps}`);
            
            // Then try Firestore (with proper error handling)
            let firestoreSteps = 0;
            try {
              // Double-check we still have a valid user before Firestore call
              if (currentAuth.currentUser && !isLoggingOut) {
                const dailyStepsRef = doc(db, `users/${currentUser.uid}/dailySteps`, dateString);
                const dailyStepsSnap = await getDoc(dailyStepsRef);
                firestoreSteps = dailyStepsSnap.exists() ? dailyStepsSnap.data().steps || 0 : 0;
                console.log(`[WEEKLY DATA] ${dateString} Firestore steps: ${firestoreSteps}`);
              } else {
                console.log(`[WEEKLY DATA] User no longer authenticated, skipping Firestore for ${dateString}`);
              }
            } catch (firestoreError: any) {
              console.log(`[WEEKLY DATA] Firestore error for ${dateString}:`, firestoreError.message);
              // If Firestore fails, we'll use local data
            }
            
            // Use the higher value (most recent data)
            steps = Math.max(firestoreSteps, localSteps);
            
            console.log(`[WEEKLY DATA] ${dateString} (${dayLabel}): Firestore=${firestoreSteps}, Local=${localSteps}, Using=${steps}`);
          } catch (error: any) {
            console.log(`[WEEKLY DATA] Error fetching data for ${dateString}:`, error.message);
            steps = 0;
          }
        }
        
        weekData.push({
          dayLabel,
          date: date.getDate().toString(),
          steps,
          goal: dailyStepGoal,
          isToday
        });

        console.log(`[WEEKLY DATA] Added to weekData: ${dayLabel} = ${steps} steps (isToday: ${isToday})`);
      }
      
      console.log('[WEEKLY DATA] Final week data:', weekData.map(d => `${d.dayLabel}:${d.steps}`).join(', '));
      console.log('[WEEKLY DATA] Setting weeklyData state...');
      setWeeklyData(weekData);
    } catch (error: any) {
      console.error('[WEEKLY DATA] Major error:', error.message);
      if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
        console.log('[WEEKLY] App is offline - using cached weekly data');
      } else {
        console.error('Error fetching weekly data:', error);
      }
    }
  };

  const getUserRankFromLeaderboard = () => {
    try {
      const currentUser = currentAuth.currentUser;
      if (!currentUser || !leaderboardData || leaderboardData.length === 0) {
        setUserRank(null);
        return;
      }

      // Find the current user in the leaderboard data by userId
      const userEntry = leaderboardData.find((entry: any) => {
        return entry.userId === currentUser.uid;
      });

      if (userEntry) {
        setUserRank(userEntry.rank);
      } else {
        // User not found in leaderboard
        setUserRank(null);
      }
    } catch (error) {
      console.error('Error getting user rank from leaderboard:', error);
      setUserRank(null);
    }
  };

  const handleCoinPress = () => {
    // Animate coin press
    coinScale.value = withSpring(0.9, {}, () => {
      coinScale.value = withSpring(1);
    });
    
    // Navigate to coin screen
    router.push('/coin');
  };

  const handleBoostBadgeTap = () => {
    setShowBoostTooltip(true);
  };

  const syncToFirebase = async (skipAuthCheck = false) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      const currentUser = currentAuth.currentUser;
      if (!currentUser && !skipAuthCheck) {
        console.log('[SYNC] No current user, skipping sync');
        return;
      }
      
      // If we're logging out, use the stored user ID for final sync
      let userIdToUse = currentUser?.uid;
      if (isLoggingOut && !userIdToUse) {
        const storedUserId = await AsyncStorage.getItem('lastUserId');
        if (storedUserId) {
          userIdToUse = storedUserId;
          console.log('[SYNC] Using stored user ID for logout sync:', userIdToUse);
        } else {
          console.log('[SYNC] No stored user ID available for logout sync');
          return;
        }
      }
      
      if (!userIdToUse) {
        console.log('[SYNC] No user ID available for sync');
        return;
      }
      
      console.log('[SYNC] Starting sync for user:', userIdToUse);
      
      const todayString = getLocalDateString();
      const storedSteps = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const currentStepCount = storedSteps ? parseInt(storedSteps, 10) : 0;
      
      console.log('[SYNC] Current step count to sync:', currentStepCount);
      
      if (currentStepCount === 0) {
        console.log('[SYNC] No steps to sync');
        return;
      }
      
      const dailyDocRef = doc(db, `users/${userIdToUse}/dailySteps`, todayString);
      const userDocRef = doc(db, 'users', userIdToUse);
      
      // Check current steps in database with better error handling
      let stepsAlreadyInDb = 0;
      try {
        const dailyDocSnap = await getDoc(dailyDocRef);
        stepsAlreadyInDb = dailyDocSnap.exists() ? dailyDocSnap.data().steps || 0 : 0;
        console.log('[SYNC] Steps already in DB:', stepsAlreadyInDb);
      } catch (readError: any) {
        console.log('[SYNC] Error reading from DB, assuming 0 steps:', readError.message);
        stepsAlreadyInDb = 0;
      }
      
      const incrementAmount = currentStepCount - stepsAlreadyInDb;
      
      if (incrementAmount > 0) {
        console.log('[SYNC] Incrementing by:', incrementAmount);
        
        try {
          await setDoc(dailyDocRef, { steps: currentStepCount }, { merge: true });
          console.log('[SYNC] Successfully updated daily steps');
          
          await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });
          console.log('[SYNC] Successfully updated lifetime steps');

          // Update level system with new lifetime steps (only if not logging out)
          if (!isLoggingOut) {
            const newLifetimeSteps = lifetimeSteps + incrementAmount;
            await updateLifetimeSteps(newLifetimeSteps);
          }

          // Also sync any boosted steps accumulated locally for today
          try {
            const storedBoost = await AsyncStorage.getItem(`dailyBoostSteps_${todayString}`);
            const boostCount = storedBoost ? parseInt(storedBoost, 10) : 0;
            if (boostCount > 0) {
              console.log('[SYNC] Syncing boost steps:', boostCount);
              // write boostSteps into the daily doc (merge)
              await setDoc(dailyDocRef, { steps: currentStepCount, boostSteps: boostCount }, { merge: true });
              // increment aggregated boostSteps on user doc
              await updateDoc(userDocRef, { boostSteps: increment(boostCount) });
              // clear stored boost and reset local accumulator
              await AsyncStorage.removeItem(`dailyBoostSteps_${todayString}`);
              boostStepsRef.current = 0;
              // also sync context value (best-effort) - only if not logging out
              if (!isLoggingOut) {
                setBoostSteps((prev: number) => Math.max((prev || 0) - boostCount, 0));
              }
            }
          } catch (boostError: any) {
            console.error('[SYNC] Error syncing boostSteps:', boostError.message);
          }

          // Fetch updated rank and weekly data after syncing (only if not logging out)
          if (!isLoggingOut && currentUser) {
            getUserRankFromLeaderboard();
            await fetchWeeklyData();
          }
          
          console.log('[SYNC] Sync completed successfully');
        } catch (writeError: any) {
          if (writeError.code === 'permission-denied') {
            console.error('[SYNC] Permission denied - authentication may have expired');
            // Don't throw error during logout to prevent blocking
            if (!isLoggingOut) {
              throw writeError;
            }
          } else {
            console.error('[SYNC] Write error:', writeError.message);
            if (!isLoggingOut) {
              throw writeError; // Re-throw to be caught by outer try-catch
            }
          }
        }
      } else {
        console.log('[SYNC] No new steps to sync');
      }
    } catch (error: any) {
      // Handle Firebase offline errors gracefully
      if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
        console.log('[SYNC] App is offline - will retry when connection is restored');
      } else if (error?.code === 'permission-denied') {
        console.error('[SYNC] Permission denied error - check Firebase rules and authentication');
        // During logout, don't show this as an error since it's expected
        if (!isLoggingOut) {
          console.error('[SYNC] This may indicate an authentication issue');
        }
      } else {
        console.error('[SYNC] Error:', error.message);
      }
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
  let subscription: any = null;
  let hourlySyncInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      if (!isAvailable) return;
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') return;

      await finalizePreviousDaySteps();

      // Fetch daily step goal from database
      const currentUser = currentAuth.currentUser;
      if (currentUser) {
        // Store user ID for potential logout sync
        await AsyncStorage.setItem('lastUserId', currentUser.uid);
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().dailyStepGoal) {
          setDailyStepGoal(userDoc.data().dailyStepGoal);
        }
      }

      const todayString = getLocalDateString();
      const storedData = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      
      // Check Firestore for today's steps and use the higher value
      let finalTodaysSteps = initialTodaysSteps;
      try {
        const dailyStepsRef = doc(db, `users/${currentUser.uid}/dailySteps`, todayString);
        const dailyStepsSnap = await getDoc(dailyStepsRef);
        if (dailyStepsSnap.exists()) {
          const firestoreSteps = dailyStepsSnap.data().steps || 0;
          if (firestoreSteps > initialTodaysSteps) {
            finalTodaysSteps = firestoreSteps;
            // Update local storage with Firestore value
            await AsyncStorage.setItem(`dailySteps_${todayString}`, String(firestoreSteps));
            console.log(`[STEP SYNC] Loaded ${firestoreSteps} steps from Firestore (local had ${initialTodaysSteps})`);
          }
        }
      } catch (error) {
        console.log('[STEP SYNC] Failed to load from Firestore, using local value');
      }
      
      setTodaysSteps(finalTodaysSteps);

      // Fetch initial data
      console.log('[INIT] Fetching initial data...');
      await fetchUserProfile(); // 👈 ADD: Fetch user profile
      getUserRankFromLeaderboard();
      await fetchWeeklyData();
      console.log('[INIT] Initial data fetch completed');

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      try {
        const todaySteps = await Pedometer.getStepCountAsync(startOfToday, new Date());
        if (todaySteps.steps > finalTodaysSteps) {
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
            console.log(`[STEP DEBUG] Adding ${incrementStep} steps. Boost active: ${isBoostActiveRef.current}`);
            setTodaysSteps(prevSteps => prevSteps + incrementStep);
            try {
              // If we're in a boost window, accumulate boosted steps locally and persist to device storage
              if (isBoostActiveRef.current) {
                console.log(`[BOOST DEBUG] Adding ${incrementStep} boost steps! Total boost: ${boostStepsRef.current + incrementStep}`);
                boostStepsRef.current += incrementStep;
                const todayStringLocal = getLocalDateString();
                AsyncStorage.setItem(`dailyBoostSteps_${todayStringLocal}`, String(boostStepsRef.current));
                // update app-wide boostSteps immediately so UI earnings reflect boosted rate right away
                setBoostSteps((prev: number) => (Number(prev) || 0) + incrementStep);
                console.log(`[BOOST DEBUG] Updated context boostSteps. Previous context value: ${boostSteps}`);
                
                // Force sync boost steps to Firestore immediately during boost periods
                // But only if we're not in the process of logging out
                if (!isLoggingOut) {
                  setTimeout(() => {
                    console.log(`[BOOST DEBUG] Force syncing boost steps to Firestore...`);
                    syncToFirebase();
                  }, 1000); // Sync after 1 second delay
                }
              } else {
                console.log(`[BOOST DEBUG] No boost - normal step tracking only`);
              }
            } catch (e) {
              // silent fail for AsyncStorage
              console.error('[BOOST DEBUG] Error saving boost steps:', e);
            }
          }
      });
      hourlySyncInterval = setInterval(syncToFirebase, 3600000);
    };
    init();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[APP STATE] App going to background, syncing data...');
        // Only sync if we have a current user or if we're in the process of logging out
        if (currentAuth.currentUser || isLoggingOut) {
          syncToFirebase();
        }
      }
    });

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
      if (hourlySyncInterval) clearInterval(hourlySyncInterval);
      
      // Final sync - always attempt, regardless of logout state
      console.log('[CLEANUP] Performing final sync before unmount, isLoggingOut:', isLoggingOut);
      syncToFirebase(true); // Skip auth check for final sync
    };
  }, [isLoggingOut]);

  // Listen for goal changes from profile page
  useEffect(() => {
    const checkForGoalUpdates = async () => {
  const currentUser = currentAuth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().dailyStepGoal) {
          const newGoal = userDoc.data().dailyStepGoal;
          if (newGoal !== dailyStepGoal) {
            setDailyStepGoal(newGoal);
            await fetchWeeklyData(); // Refresh weekly data with new goal
          }
        }
      }
    };

    // Check for updates every 5 seconds when app is active
    const goalUpdateInterval = setInterval(checkForGoalUpdates, 5000);
    
    return () => clearInterval(goalUpdateInterval);
  }, [dailyStepGoal]);

  // Update rank when leaderboard data changes
  useEffect(() => {
    getUserRankFromLeaderboard();
  }, [leaderboardData]);

  // Update weekly data when today's steps change
  useEffect(() => {
    console.log('[WEEKLY UPDATE] todaysSteps changed to:', todaysSteps);
    console.log('[WEEKLY UPDATE] Current weeklyData length:', weeklyData.length);
    if (weeklyData.length > 0) {
      console.log('[WEEKLY UPDATE] Updating today\'s steps in weeklyData...');
      const updatedData = weeklyData.map(day => {
        if (day.isToday) {
          console.log(`[WEEKLY UPDATE] Found today (${day.dayLabel}), updating steps from ${day.steps} to ${todaysSteps}`);
          return { ...day, steps: todaysSteps };
        }
        return day;
      });
      console.log('[WEEKLY UPDATE] New weekly data:', updatedData.map(d => `${d.dayLabel}:${d.steps}`).join(', '));
      setWeeklyData(updatedData);
    } else {
      console.log('[WEEKLY UPDATE] weeklyData is empty, skipping update');
    }
  }, [todaysSteps]);

  // Force refresh weekly data when app starts or user changes
  useEffect(() => {
    const refreshData = async () => {
      if (user) {
        console.log('[WEEKLY DATA] Force refreshing data on user/app state change');
        await fetchWeeklyData();
      }
    };
    
    // Small delay to ensure authentication is settled
    const timeout = setTimeout(refreshData, 1000);
    return () => clearTimeout(timeout);
  }, [user, dailyStepGoal]); // Refresh when user or daily goal changes

  useEffect(() => {
    const saveToDevice = async () => {
      const todayString = getLocalDateString();
      await AsyncStorage.setItem(`dailySteps_${todayString}`, String(todaysSteps));
    };
    if (isInitialized.current) {
      saveToDevice();
    }
  }, [todaysSteps]);

  // Update available moods based on time
  useEffect(() => {
    const updateMoods = () => {
      const moods = getAvailableMoods();
      setAvailableMoods(moods);
    };

    // Update immediately
    updateMoods();

    // Update every minute to catch sunrise/sunset times
    const interval = setInterval(updateMoods, 60000);

    return () => clearInterval(interval);
  }, []);

  // Handle boost tooltip animations
  useEffect(() => {
    if (showBoostTooltip) {
      // Show tooltip with animation
      tooltipOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
      tooltipScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      
      // Auto-hide after 5 seconds
      const timeout = setTimeout(() => {
        tooltipOpacity.value = withSpring(0, { damping: 20, stiffness: 300 });
        tooltipScale.value = withSpring(0.8, { damping: 20, stiffness: 300 });
        setTimeout(() => setShowBoostTooltip(false), 300); // Wait for animation to complete
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      // Hide tooltip immediately
      tooltipOpacity.value = 0;
      tooltipScale.value = 0.8;
    }
  }, [showBoostTooltip]);

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
  const currentUser = currentAuth.currentUser;
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
            
            // Update level system with new lifetime steps
            const newLifetimeSteps = lifetimeSteps + incrementAmount;
            await updateLifetimeSteps(newLifetimeSteps);
          }
        }
      }
      await AsyncStorage.setItem('lastSyncDate', todayString);
    } catch (error: any) {
      // Handle Firebase offline errors gracefully
      if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
        console.log('[FINALIZE] App is offline - will retry finalizing when connection is restored');
      } else {
        console.error('Error finalizing previous day:', error);
      }
    } finally {
      isSyncing.current = false;
    }
  };
  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));
  const progress = Math.min((todaysSteps / dailyStepGoal) * 100, 100);
  const formattedStepCount = todaysSteps.toLocaleString();

  // Debug logging for line graph
  console.log('[RENDER] Current weeklyData:', weeklyData.map(d => `${d.dayLabel}:${d.steps}(today:${d.isToday})`).join(', '));
  console.log('[RENDER] Current todaysSteps:', todaysSteps);

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.gradientBackground}
      >
        <AnimatedBackground />
        
        {/* Single ScrollView with all content */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.profileSection}>
              <Pressable style={styles.avatar} onPress={() => router.push('/profile')}>
                {/* 👈 UPDATED: Changed fallback icon color to blue */}
                {getUserInitial() ? (
                  <Text style={styles.avatarInitial}>{getUserInitial()}</Text>
                ) : (
                  <FontAwesome name="user" size={16} color="#64B5F6" />
                )}
              </Pressable>
              <View>
                <Text style={styles.headerTitle}>My Progress</Text>
                <Text style={styles.dateText}>Today's Steps</Text>
              </View>
            </View>
            
            {/* Coin Display - Replaces notification button */}
            <Pressable onPress={handleCoinPress}>
              <Animated.View style={[styles.coinContainer, coinAnimatedStyle]}>
                <LinearGradient
                  colors={['rgba(255,215,0,0.2)', 'rgba(255,193,7,0.15)']}
                  style={styles.coinGradient}
                >
                  <Image 
                    source={require('../../assets/images/icon.png')}
                    style={styles.coinIcon}
                  />
                  <Text style={styles.coinText}>
                    {totalEarnings >= 0 ? totalEarnings.toFixed(2) : '0.00'}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>

          {/* Spacer to restore gap between header and progress circle */}
          <View style={styles.spacer} />

          {/* Main Progress Circle */}
          <View style={styles.stepContainer}>
            <LinearGradient
              colors={['rgba(139,195,74,0.1)', 'rgba(76,175,80,0.05)']}
              style={styles.stepBackground}
            >
              <Svg width={280} height={280} viewBox="0 0 280 280">
                <Defs>
                  <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#8BC34A" />
                    <Stop offset="100%" stopColor="#4CAF50" />
                  </SvgGradient>
                </Defs>
                
                <Circle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="15"
                  fill="transparent"
                />
                <Circle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke="url(#progressGradient)"
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${(1 - progress / 100) * (2 * Math.PI * 120)}`}
                  rotation="-90"
                  origin="140, 140"
                  fill="transparent"
                />
              </Svg>

              <View style={styles.stepInner}>
                <Text style={styles.stepCount}>{formattedStepCount}</Text>
                <Text style={styles.goalText}>of {dailyStepGoal.toLocaleString()} goal</Text>
                
                <View style={styles.locationDot}>
                  <Ionicons name="location" size={12} color="#8BC34A" />
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Circular Boost Badge - positioned outside stepContainer */}
          {isBoostActive && (
            <TouchableOpacity 
              style={styles.boostBadge}
              onPress={handleBoostBadgeTap}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={boostType === 'sunrise' ? ['#FFD700', '#FFA000'] : ['#FF6B35', '#F7931E']}
                style={styles.boostBadgeGradient}
              >
                <Ionicons 
                  name="sunny" 
                  size={28} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Circular Mood Badge - positioned on left side */}
          <TouchableOpacity 
            style={styles.moodBadge}
            onPress={() => setShowMoodModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.moodBadgeGradient}
            >
              <Ionicons 
                name="musical-note" 
                size={28} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Boost Tooltip - positioned outside stepContainer */}
          {showBoostTooltip && isBoostActive && (
            <Animated.View 
              style={[
                styles.boostTooltip,
                {
                  opacity: tooltipOpacity,
                  transform: [{ scale: tooltipScale }],
                }
              ]}
            >
              <View style={styles.boostTooltipContent}>
                <Text style={styles.boostTooltipText}>
                  {boostType === 'sunrise' ? 'Sunrise' : 'Sunset'} Boost
                </Text>
                <Text style={styles.boostTooltipSubtext}>
                  2x Coin Multiplication Rate
                </Text>
              </View>
              <View style={styles.boostTooltipArrow} />
            </Animated.View>
          )}

          {/* Weekly Progress Circles */}
          <View style={styles.weeklyContainer}>
            <Text style={styles.weeklyTitle}>This Week</Text>
            <View style={styles.weeklyRow}>
              {weeklyData.map((day, index) => (
                <WeeklyProgressCircle
                  key={index}
                  dayLabel={day.dayLabel}
                  date={day.date}
                  steps={day.steps}
                  goal={day.goal}
                  isToday={day.isToday}
                />
              ))}
            </View>
            
            {/* Toggle Button for Line Graph */}
            <TouchableOpacity 
              style={styles.graphToggleButton}
              onPress={() => setShowLineGraph(!showLineGraph)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(139, 195, 74, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.graphToggleGradient}
              >
                <Ionicons 
                  name={showLineGraph ? "chevron-up" : "analytics"} 
                  size={20} 
                  color="#8BC34A" 
                />
                <Text style={styles.graphToggleText}>
                  {showLineGraph ? "Hide Trend" : "Show Trend"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Weekly Line Graph - Conditional Render */}
          {showLineGraph && (
            <View style={styles.weeklyGraphContainer}>
              <View style={styles.weeklyGraphBackground}>
                <LinearGradient
                  colors={['rgba(111, 175, 45, 0.3)', 'rgba(139, 195, 74, 0.2)']}
                  style={styles.weeklyGraphGradient}
                >
                  <Svg width="100%" height={200} viewBox="0 0 350 200" style={{ alignSelf: 'center' }}>
                  <Defs>
                    <SvgGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <Stop offset="100%" stopColor="#8BC34A" stopOpacity="1" />
                    </SvgGradient>
                    <SvgGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                      <Stop offset="100%" stopColor="#4CAF50" stopOpacity="0.1" />
                    </SvgGradient>
                  </Defs>
                  
                  {/* Grid lines */}
                  {[1, 2, 3, 4, 5].map((line) => (
                    <Circle
                      key={line}
                      cx={50 + (line * 50)}
                      cy={160}
                      r="0.5"
                      fill="rgba(255,255,255,0.3)"
                    />
                  ))}
                  
                  {/* Data line and points */}
                  {weeklyData.length > 0 && (
                    <>
                      {/* Line path */}
                      <Path
                        d={weeklyData.map((day, index) => {
                          const x = 50 + (index * 42);
                          const maxSteps = Math.max(...weeklyData.map(d => d.steps), 1); // Use minimum of 1 to avoid division by zero
                          const y = 160 - ((day.steps / maxSteps) * 120);
                          console.log(`[LINE GRAPH] ${day.dayLabel} (${day.isToday ? 'TODAY' : 'other'}): steps=${day.steps}, maxSteps=${maxSteps}, x=${x}, y=${y}`);
                          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
                        }).join(' ')}
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Area under curve */}
                      <Path
                        d={`${weeklyData.map((day, index) => {
                          const x = 50 + (index * 42);
                          const maxSteps = Math.max(...weeklyData.map(d => d.steps), 1); // Use minimum of 1 to avoid division by zero
                          const y = 160 - ((day.steps / maxSteps) * 120);
                          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
                        }).join(' ')} L${50 + ((weeklyData.length - 1) * 42)},160 L50,160 Z`}
                        fill="url(#areaGradient)"
                      />
                      
                      {/* Data points */}
                      {weeklyData.map((day, index) => {
                        const x = 50 + (index * 42);
                        const maxSteps = Math.max(...weeklyData.map(d => d.steps), 1); // Use minimum of 1 to avoid division by zero
                        const y = 160 - ((day.steps / maxSteps) * 120);
                        return (
                          <Circle
                            key={index}
                            cx={x}
                            cy={y}
                            r={day.isToday ? "8" : "6"}
                            fill={day.isToday ? "#FFD700" : "#FFFFFF"}
                            stroke={day.isToday ? "#4CAF50" : "#8BC34A"}
                            strokeWidth="2"
                          />
                        );
                      })}
                    </>
                  )}
                </Svg>
                
                {/* Day labels */}
                <View style={styles.weeklyGraphLabels}>
                  {weeklyData.map((day, index) => (
                    <View key={index} style={styles.weeklyGraphLabel}>
                      <Text style={[styles.weeklyGraphDayText, day.isToday && styles.weeklyGraphTodayText]}>
                        {day.dayLabel}
                      </Text>
                      <Text style={styles.weeklyGraphStepsText}>
                        {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}K` : day.steps.toString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </View>
          )}

          {/* Rank Box */}
          <Pressable style={styles.rankBox} onPress={() => router.push('/leaderboard')}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.rankBoxGradient}
            >
              <View style={styles.rankContent}>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankLabel}>🏆 Your Rank</Text>
                  <Text style={styles.rankNumber}>
                    {userRank ? `# ${userRank}` : '# _'}
                  </Text>
                  <Text style={styles.rankSteps}>{formattedStepCount} steps today</Text>
                </View>
                <View style={styles.rankArrow}>
                  <FontAwesome name="chevron-right" size={20} color="#8BC34A" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </LinearGradient>
      
      {/* Mood Selection Modal */}
      <MoodModal
        visible={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        availableMoods={availableMoods}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8BC34A',
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#4CAF50',
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(100,181,246,0.2)', // 👈 CHANGED: Blue background instead of green
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2, // 👈 ADD: Border for more contrast
    borderColor: '#64B5F6', // 👈 ADD: Blue border
  },
  // 👈 UPDATED: New style for the initial text with blue color
  avatarInitial: {
    fontSize: 16, // Same size as the original icon
    fontWeight: '900',
    color: '#64B5F6', // 👈 CHANGED: Blue text instead of green
    textAlign: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dateText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  // ...rest of existing styles remain the same...
  coinContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  coinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  coinIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFD700',
  },
  coinText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  boostBadge: {
    position: 'absolute',
    top: 120,
    right: 60,
    width: 30,
    height: 60,
    borderRadius: 30,
    zIndex: 10,
  },
  boostBadgeGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  moodBadge: {
    position: 'absolute',
    top: 120,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 10,
  },
  moodBadgeGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  spacer: {
    height: 70,
  },
  stepContainer: {
    marginBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepBackground: {
    width: 280,
    height: 280,
    borderRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  stepInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  goalText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
  locationDot: {
    marginTop: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139,195,74,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  weeklyTitle: {
    fontSize: 16,
    color: '#BBBBBB',
    fontWeight: '600',
    marginBottom: 15,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  weeklyCircleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  todayCircle: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 8,
    paddingVertical: 5,
  },
  weeklyCircle: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  weeklyCircleContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayLabel: {
    color: '#FFD700',
  },
  weeklyDate: {
    fontSize: 9,
    color: '#888888',
    marginTop: 4,
    fontWeight: '500',
  },
  todayDate: {
    color: '#FFD700',
    fontWeight: '700',
  },
  rankBox: {
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  rankBoxGradient: {
    padding: 20,
    borderRadius: 16,
  },
  rankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankInfo: {
    flex: 1,
  },
  rankLabel: {
    color: '#BBBBBB',
    fontWeight: '600',
    fontSize: 16,
  },
  rankNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 22,
    marginTop: 4,
  },
  rankSteps: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
  },
  rankArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139,195,74,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostTooltip: {
    position: 'absolute',
    top: 50,
    right: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 160,
    zIndex: 1000,
  },
  boostTooltipContent: {
    alignItems: 'center',
  },
  boostTooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  boostTooltipSubtext: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
  },
  boostTooltipArrow: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.8)',
  },
  weeklyGraphContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  weeklyGraphBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  weeklyGraphGradient: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  weeklyGraphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  weeklyGraphLabel: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyGraphDayText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  weeklyGraphTodayText: {
    color: '#FFD700',
  },
  weeklyGraphStepsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  graphToggleButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  graphToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  graphToggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});