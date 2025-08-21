import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, StatusBar, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSteps } from '../../context/StepContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Generate daily challenge for today
const generateDailyChallenge = () => {
  const today = getLocalDateString();
//   Use date as seed for consistent challenge per day
  const seed = parseInt(today.replace(/-/g, ''), 10);
  const random = Math.sin(seed) * 10000;
  const randomInt = Math.floor((random - Math.floor(random)) * 6) + 5; // 5-10
  return randomInt * 1000;
};

export default function SocialScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [dailyChallenge, setDailyChallenge] = useState(0);
  const [hasJoinedChallenge, setHasJoinedChallenge] = useState(false);
  const [challengeStartSteps, setChallengeStartSteps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasClaimedReward, setHasClaimedReward] = useState(false);
  const { isLoggingOut } = useSteps();

  // Join challenge function
  const joinChallenge = async () => {
    if (!auth.currentUser) return;
    
    setIsLoading(true);
    try {
      const today = getLocalDateString();
      const userId = auth.currentUser.uid;
      
      // Get current steps when joining
      const storedData = await AsyncStorage.getItem(`dailySteps_${today}`);
      const currentSteps = storedData ? parseInt(storedData, 10) : 0;
      
      // Store challenge participation in Firebase
      const challengeRef = doc(db, 'users', userId);
      const challengeData = {
        [`dailyChallenge_${today}`]: {
          challengeGoal: dailyChallenge,
          startSteps: currentSteps,
          joinedAt: new Date().toISOString(),
          completed: false
        }
      };
      
      await updateDoc(challengeRef, challengeData);
      
      setHasJoinedChallenge(true);
      setChallengeStartSteps(currentSteps);
    } catch (error) {
      console.error('Error joining challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Award coins when challenge is completed
  const awardChallengeCoins = async () => {
    if (!auth.currentUser || hasClaimedReward) return;
    
    try {
      const today = getLocalDateString();
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      
      // Update coins and mark challenge as completed with reward claimed
      await updateDoc(userRef, {
        coins: increment(50),
        [`dailyChallenge_${today}.completed`]: true,
        [`dailyChallenge_${today}.rewardClaimed`]: true,
        [`dailyChallenge_${today}.completedAt`]: new Date().toISOString()
      });
      
      setHasClaimedReward(true);
      console.log('50 coins awarded for daily challenge completion!');
    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  };

  // Check if user has joined today's challenge
  const checkChallengeStatus = async () => {
    if (!auth.currentUser) return;
    
    try {
      const today = getLocalDateString();
      const userId = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const challengeKey = `dailyChallenge_${today}`;
        
        if (data[challengeKey]) {
          setHasJoinedChallenge(true);
          setChallengeStartSteps(data[challengeKey].startSteps || 0);
          setHasClaimedReward(data[challengeKey].rewardClaimed || false);
        }
      }
    } catch (error) {
      console.error('Error checking challenge status:', error);
    }
  };

  // Initialize daily steps and challenge
  useEffect(() => {
    const initializeDailyData = async () => {
      const today = getLocalDateString();
      
      // Load today's steps
      const storedData = await AsyncStorage.getItem(`dailySteps_${today}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      setTodaysSteps(initialTodaysSteps);

    // Generate daily challenge
    //   const challenge = 10;
    const challenge = generateDailyChallenge();
    setDailyChallenge(challenge);
      
      // Check if user has joined today's challenge
      await checkChallengeStatus();
    };

    initializeDailyData();
  }, []);

  // Update steps in real-time (only if challenge is joined)
  useEffect(() => {
    if (!hasJoinedChallenge) return;
    
    const updateSteps = async () => {
      if (!isLoggingOut) {
        const today = getLocalDateString();
        const storedData = await AsyncStorage.getItem(`dailySteps_${today}`);
        const currentSteps = storedData ? parseInt(storedData, 10) : 0;
        setTodaysSteps(currentSteps);
      }
    };

    const interval = setInterval(updateSteps, 1000);
    return () => clearInterval(interval);
  }, [isLoggingOut, hasJoinedChallenge]);

  // Calculate progress (only steps taken after joining)
  const challengeSteps = Math.max(todaysSteps - challengeStartSteps, 0);
  const progress = dailyChallenge > 0 ? Math.min((challengeSteps / dailyChallenge) * 100, 100) : 0;
  const isCompleted = progress >= 100;
  const remainingSteps = Math.max(dailyChallenge - challengeSteps, 0);

  // Award coins automatically when challenge is completed
  useEffect(() => {
    if (isCompleted && hasJoinedChallenge && !hasClaimedReward) {
      awardChallengeCoins();
    }
  }, [isCompleted, hasJoinedChallenge, hasClaimedReward]);
  return (
    <LinearGradient 
      colors={['#0D1B2A', '#1B263B', '#415A77']} 
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            Challenges
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.contentContainer}>
          {/* Daily Challenge Card */}
          <View style={styles.challengeCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.challengeHeader}>
                <FontAwesome name="trophy" size={20} color="#FFD700" />
                <ThemedText style={styles.challengeTitle}>Daily Challenge</ThemedText>
              </View>
              
              <View style={styles.challengeContent}>
                <ThemedText style={styles.challengeGoal}>
                  {dailyChallenge.toLocaleString()} Steps
                </ThemedText>
                
                {!hasJoinedChallenge ? (
                  // JOIN NOW Button
                  <Pressable 
                    style={styles.joinButton} 
                    onPress={joinChallenge}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.joinButtonGradient}
                    >
                      <FontAwesome name="play" size={16} color="#fff" />
                      <ThemedText style={styles.joinButtonText}>
                        {isLoading ? 'JOINING...' : 'JOIN NOW'}
                      </ThemedText>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  // Challenge Progress
                  <>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={isCompleted ? ['#4CAF50', '#81C784'] : ['#8BC34A', '#689F38']}
                          style={[styles.progressFill, { width: `${progress}%` }]}
                        />
                      </View>
                      <ThemedText style={styles.progressText}>
                        {progress.toFixed(1)}%
                      </ThemedText>
                    </View>

                    {/* Three Stat Boxes */}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <LinearGradient
                          colors={['rgba(139,195,74,0.2)', 'rgba(76,175,80,0.1)']}
                          style={styles.statBoxGradient}
                        >
                          <ThemedText style={styles.statLabel}>Current</ThemedText>
                          <ThemedText style={styles.statValue}>
                            {challengeSteps.toLocaleString()}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                      
                      <View style={styles.statBox}>
                        <LinearGradient
                          colors={['rgba(255,193,7,0.2)', 'rgba(255,152,0,0.1)']}
                          style={styles.statBoxGradient}
                        >
                          <ThemedText style={styles.statLabel}>
                            {isCompleted ? 'Done!' : 'Remaining'}
                          </ThemedText>
                          <ThemedText style={[styles.statValue, isCompleted && styles.completedText]}>
                            {isCompleted ? '🎉' : remainingSteps.toLocaleString()}
                          </ThemedText>
                        </LinearGradient>
                      </View>

                      <View style={styles.statBox}>
                        <LinearGradient
                          colors={hasClaimedReward ? ['rgba(76,175,80,0.3)', 'rgba(139,195,74,0.2)'] : ['rgba(255,215,0,0.2)', 'rgba(255,193,7,0.1)']}
                          style={styles.statBoxGradient}
                        >
                          <ThemedText style={styles.statLabel}>
                            {hasClaimedReward ? 'Earned!' : 'Reward'}
                          </ThemedText>
                          <ThemedText style={[styles.coinValue, hasClaimedReward && styles.earnedCoins]}>
                            {hasClaimedReward ? '✓ 50' : '50'}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                    </View>

                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <LinearGradient
                          colors={['#4CAF50', '#81C784']}
                          style={styles.badgeGradient}
                        >
                          <FontAwesome name="check-circle" size={16} color="#fff" />
                          <ThemedText style={styles.badgeText}>Challenge Complete!</ThemedText>
                        </LinearGradient>
                      </View>
                    )}
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Festive Challenges Section */}
          <View style={styles.challengeCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.challengeHeader}>
                <FontAwesome name="star" size={20} color="#FFD700" />
                <ThemedText style={styles.challengeTitle}>Festive Challenges</ThemedText>
              </View>
              
              <View style={styles.challengeContent}>
                <ThemedText style={styles.comingSoonText}>
                  Coming soon!
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        </ThemedView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  contentContainer: {
    backgroundColor: 'transparent',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  challengeCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    borderRadius: 15,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  challengeContent: {
    alignItems: 'center',
  },
  challengeGoal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8BC34A',
    marginBottom: 15,
    textAlign: 'center',
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 5,
  },
  joinButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statBoxGradient: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  coinIcon: {
    marginBottom: 2,
  },
  coinValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  earnedCoins: {
    color: '#4CAF50',
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  completedBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  badgeGradient: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 6,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
  },
});
