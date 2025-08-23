import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState, ScrollView } from 'react-native';
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
import { Svg, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
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
  const { isLoggingOut, isBoostActive, boostType, coins, lifetimeSteps, boostSteps: ctxBoostSteps = 0, setBoostSteps } = useSteps() as any;
  const router = useRouter();
  const isSyncing = useRef(false);
  const lastStepValueFromListener = useRef(0);
  const boostStepsRef = useRef(0); // accumulate steps that occur during boost windows
  const isInitialized = useRef(false);

  const coinScale = useSharedValue(1);
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

  const totalEarnings = calculateTotalEarnings(lifetimeSteps, coins, boostSteps);

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
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch weekly data
  const fetchWeeklyData = async () => {
    try {
  const currentUser = currentAuth.currentUser;
      if (!currentUser) return;

      const today = new Date();
      const weekData = [];
      const dayLabels = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
      
      // Get Monday of current week
      const monday = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) and Monday (1)
      monday.setDate(today.getDate() + diff);

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const dateString = getLocalDateString(date);
        const dayLabel = dayLabels[i];
        const isToday = dateString === getLocalDateString(today);
        
        // Get steps for this date
        const dailyStepsRef = doc(db, `users/${currentUser.uid}/dailySteps`, dateString);
        const dailyStepsSnap = await getDoc(dailyStepsRef);
        const steps = dailyStepsSnap.exists() ? dailyStepsSnap.data().steps || 0 : 0;
        
        weekData.push({
          dayLabel,
          date: date.getDate().toString(),
          steps: isToday ? todaysSteps : steps,
          goal: dailyStepGoal,
          isToday
        });
      }
      
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  };

  const fetchUserRank = async () => {
    try {
  const currentUser = currentAuth.currentUser;
      if (!currentUser) return;

      const todayString = getLocalDateString();
      
      // Get all users' daily steps for today
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userStepsData = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const dailyStepsRef = doc(db, `users/${userId}/dailySteps`, todayString);
        const dailyStepsSnap = await getDoc(dailyStepsRef);
        
        if (dailyStepsSnap.exists()) {
          userStepsData.push({
            userId,
            steps: dailyStepsSnap.data().steps || 0
          });
        } else {
          userStepsData.push({
            userId,
            steps: 0
          });
        }
      }

      // Sort by steps in descending order
      userStepsData.sort((a, b) => b.steps - a.steps);

      // Find current user's rank
      const userRankIndex = userStepsData.findIndex(user => user.userId === currentUser.uid);
      if (userRankIndex !== -1) {
        setUserRank(userRankIndex + 1);
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
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

  const syncToFirebase = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
  const currentUser = currentAuth.currentUser;
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

        // Also sync any boosted steps accumulated locally for today
        try {
          const storedBoost = await AsyncStorage.getItem(`dailyBoostSteps_${todayString}`);
          const boostCount = storedBoost ? parseInt(storedBoost, 10) : 0;
          if (boostCount > 0) {
            // write boostSteps into the daily doc (merge)
            await setDoc(dailyDocRef, { steps: currentStepCount, boostSteps: boostCount });
            // increment aggregated boostSteps on user doc
            await updateDoc(userDocRef, { boostSteps: increment(boostCount) });
            // clear stored boost and reset local accumulator
            await AsyncStorage.removeItem(`dailyBoostSteps_${todayString}`);
            boostStepsRef.current = 0;
            // also sync context value (best-effort)
            setBoostSteps((prev: number) => Math.max((prev || 0) - boostCount, 0));
          }
        } catch (e) {
          console.error('Error syncing boostSteps:', e);
        }

        // Fetch updated rank and weekly data after syncing
        await fetchUserRank();
        await fetchWeeklyData();
      }
    } catch (error) {
      console.error('[SYNC] Error:', error);
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
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().dailyStepGoal) {
          setDailyStepGoal(userDoc.data().dailyStepGoal);
        }
      }

      const todayString = getLocalDateString();
      const storedData = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      setTodaysSteps(initialTodaysSteps);

      // Fetch initial data
  await fetchUserProfile(); // 👈 ADD: Fetch user profile
  await fetchUserRank();
  await fetchWeeklyData();

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
            try {
              // If we're in a boost window, accumulate boosted steps locally and persist to device storage
              if (isBoostActive) {
                boostStepsRef.current += incrementStep;
                const todayStringLocal = getLocalDateString();
                AsyncStorage.setItem(`dailyBoostSteps_${todayStringLocal}`, String(boostStepsRef.current));
                // update app-wide boostSteps immediately so UI earnings reflect boosted rate right away
                setBoostSteps((prev: number) => (Number(prev) || 0) + incrementStep);
              }
            } catch (e) {
              // silent fail for AsyncStorage
            }
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

  // Update weekly data when today's steps change
  useEffect(() => {
    if (weeklyData.length > 0) {
      setWeeklyData(prev => prev.map(day => 
        day.isToday ? { ...day, steps: todaysSteps } : day
      ));
    }
  }, [todaysSteps]);

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
  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));
  const progress = Math.min((todaysSteps / dailyStepGoal) * 100, 100);
  const formattedStepCount = todaysSteps.toLocaleString();

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
                  <FontAwesome name="database" size={16} color="#FFD700" />
                  <Text style={styles.coinText}>
                    ₹ {totalEarnings >= 0 ? totalEarnings.toFixed(2) : '0.00'}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>

          {/* Boost Card */}
          {isBoostActive && (
            <LinearGradient
              colors={['#8BC34A', '#689F38']}
              style={styles.boostCard}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.boostTitle}>
                🌅 {boostType?.toUpperCase()} BOOST ACTIVE!
              </Text>
              <Text style={styles.boostSubtitle}>Earning 2x coins!</Text>
            </LinearGradient>
          )}

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
          </View>

          {/* Goal Display Only */}
          <View style={styles.goalDisplayContainer}>
            <Text style={styles.goalDisplayText}>
              Daily Goal: {dailyStepGoal.toLocaleString()} steps
            </Text>
            <Text style={styles.goalEditHint}>
              💡 Tap your profile to edit goal
            </Text>
          </View>

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
                    {userRank ? `# ${userRank}` : '# —'}
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
  coinText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  boostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
  },
  boostTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  boostSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
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
  goalDisplayContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  goalDisplayText: {
    fontSize: 16,
    color: '#BBBBBB',
    fontWeight: '500',
    marginBottom: 8,
  },
  goalEditHint: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
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
});