import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, StatusBar, View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSteps } from '../../context/StepContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment, deleteField, runTransaction } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
import { WebView } from 'react-native-webview';
import { calculateTotalEarnings } from '../../utils/earnings';

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
  const insets = useSafeAreaInsets();
  const [totalEarned, setTotalEarned] = useState(0);
  const { isLoggingOut, coins = 0, setCoins, dailyRecords, lifetimeSteps, boostSteps, userLevel } = useSteps();

  // Ad-related state
  const [isWatching, setIsWatching] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(true);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);

  // Join challenge function
  const joinChallenge = async () => {
    if (!auth.currentUser) return;
    // Prevent joining if already joined or completed
    if (hasJoinedChallenge) return;
    if (hasClaimedReward) return;

    setIsLoading(true);
    try {
      const today = getLocalDateString();
      const userId = auth.currentUser.uid;

      // Get current steps when joining
      const storedData = await AsyncStorage.getItem(`dailySteps_${today}`);
      const currentSteps = storedData ? parseInt(storedData, 10) : 0;

      // Prepare challenge object
      const challengeObj = {
        challengeGoal: dailyChallenge,
        startSteps: currentSteps,
        joinedAt: new Date().toISOString(),
        completed: false,
      };

      const userRef = doc(db, 'users', userId);

      // Use a transaction to ensure the user has >=2 coins before deducting and writing the challenge
      await updateDoc(userRef, {
        coins: increment(-2), // Decrements by 2, even if it goes into negative
        [`dailyChallenge_${today}`]: challengeObj,
      });

      // Update local UI coins after successful transaction
      try {
        if (typeof setCoins === 'function') {
          setCoins((prev: number) => (Number(prev) || 0) - 2);
        }
      } catch (e) {
        console.error('Error updating local coins after joining challenge:', e);
      }

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

  // Leave today's challenge (remove participation, no refund)
  const leaveChallenge = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const today = getLocalDateString();
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);

      // Remove the daily challenge object for today
      await updateDoc(userRef, {
        [`dailyChallenge_${today}`]: deleteField(),
      });

      // Update local UI state
      setHasJoinedChallenge(false);
      setChallengeStartSteps(0);
      setHasClaimedReward(false);
    } catch (err) {
      console.error('Error leaving challenge:', err);
    } finally {
      setIsLoading(false);
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
      
      // Get today's steps from dailyRecords (synced from Firebase)
      const todayRecord = dailyRecords.find(record => record.id === today);
      const currentSteps = todayRecord ? todayRecord.steps : 0;
      setTodaysSteps(currentSteps);

      // Generate daily challenge
      const challenge = generateDailyChallenge();
      setDailyChallenge(challenge);
      
      // Check if user has joined today's challenge
      await checkChallengeStatus();
    };

    initializeDailyData();
  }, [dailyRecords]);

  // Update steps in real-time (only if challenge is joined)
  useEffect(() => {
    if (!hasJoinedChallenge) return;
    
    const updateSteps = () => {
      if (!isLoggingOut) {
        const today = getLocalDateString();
        const todayRecord = dailyRecords.find(record => record.id === today);
        const currentSteps = todayRecord ? todayRecord.steps : 0;
        setTodaysSteps(currentSteps);
      }
    };

    const interval = setInterval(updateSteps, 2000); // Update every 2 seconds for challenges
    return () => clearInterval(interval);
  }, [isLoggingOut, hasJoinedChallenge, dailyRecords]);

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

  useEffect(() => {
    const fetchEarnings = async () => {
      if (auth.currentUser) {
        const earnings = await calculateTotalEarnings(lifetimeSteps, coins, boostSteps, userLevel);
        setTotalEarned(earnings);
      }
    };
    fetchEarnings();
  }, [lifetimeSteps, coins, boostSteps, userLevel]);

  // Utility function to get current date in YYYY-MM-DD format
  const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Function to check and reset daily counters if needed
  const checkAndResetDailyCounters = async (userDocRef: any, userData: any) => {
    const currentDate = getCurrentDateString();
    const lastAdWatchDate = userData?.lastAdWatchDate;

    // If it's a new day, reset the counters
    if (lastAdWatchDate !== currentDate) {
      console.log('[DAILY RESET] New day detected, resetting daily counters');
      await updateDoc(userDocRef, {
        adsWatchedToday: 0,
        dailyRewardClaimed: false,
        lastAdWatchDate: currentDate,
      });
      setAdsWatchedToday(0);
      setDailyRewardClaimed(false);
      return true; // Reset occurred
    }
    return false; // No reset needed
  };

  // Load daily ad counter data on component mount
  useEffect(() => {
    const loadDailyAdData = async () => {
      try {
        // @ts-ignore
        const currentAuth: any = auth;
        const user = currentAuth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          const userData = userSnap.data();
          
          if (userData) {
            // Check if we need to reset for new day
            await checkAndResetDailyCounters(userDocRef, userData);
            
            // Get updated data after potential reset
            const updatedSnap = await getDoc(userDocRef);
            const updatedData = updatedSnap.data();
            
            setAdsWatchedToday(updatedData?.adsWatchedToday || 0);
            setDailyRewardClaimed(updatedData?.dailyRewardClaimed || false);
          }
        }
      } catch (error) {
        console.error('Error loading daily ad data:', error);
      }
    };

    loadDailyAdData();
  }, []);

  // Put your YouTube link (shorts or regular) here. Examples:
  // 'https://www.youtube.com/shorts/VIDEOID', 'https://youtu.be/VIDEOID', or full watch URL
  const YT_LINK = 'https://www.youtube.com/shorts/ie_l0AJe13o';

  function extractYouTubeID(url: string) {
    // Matches youtu.be/ID, /watch?v=ID, /shorts/ID, /embed/ID or raw 11-char ID
    const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)?([0-9A-Za-z_-]{11})/);
    return m ? m[1] : url;
  }

  const YT_VIDEO_ID = extractYouTubeID(YT_LINK);

  // Open ad modal and start watching
  const handleWatchAd = () => {
    if (isWatching) return;
    setIsWatching(true);
    setAdLoading(true);
    setShowAdModal(true);
  };

  // Called when WebView posts message that the ad ended
  const onAdMessage = async (event: any) => {
    const data = event.nativeEvent?.data;
    if (data === 'ended') {
      try {
        // @ts-ignore
        const currentAuth: any = auth;
        const user = currentAuth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          
          // Get current user data to check daily counters
          const userSnap = await getDoc(userDocRef);
          const userData = userSnap.data();
          
          // Check and reset daily counters if it's a new day
          await checkAndResetDailyCounters(userDocRef, userData);
          
          // Get updated data after potential reset
          const updatedSnap = await getDoc(userDocRef);
          const updatedData = updatedSnap.data();
          
          const currentAdsWatchedToday = updatedData?.adsWatchedToday || 0;
          const currentDailyRewardClaimed = updatedData?.dailyRewardClaimed || false;
          
          // Prepare the update object
          const updates: any = {
            adsWatchedToday: increment(1),
            lastAdWatchDate: getCurrentDateString(),
          };
          
          // Check if user should get the daily reward (15+ ads and not claimed yet)
          const newAdsWatchedToday = currentAdsWatchedToday + 1;
          if (newAdsWatchedToday >= 15 && !currentDailyRewardClaimed) {
            updates.coins = increment(1);
            updates.dailyRewardClaimed = true;
            console.log('[DAILY REWARD] User reached 15 ads, awarding +1 coin');
          }
          
          // Update the database
          await updateDoc(userDocRef, updates);
          
          // Update local state
          setAdsWatchedToday(newAdsWatchedToday);
          if (newAdsWatchedToday >= 15 && !currentDailyRewardClaimed) {
            setDailyRewardClaimed(true);
            // Update coins in local state
            if (typeof setCoins === 'function') {
              setCoins((prev: number) => (Number(prev) || 0) + 1);
            }
          }
          
          console.log(`[AD WATCH] Ad completed. Today: ${newAdsWatchedToday}/15 ads`);
        }
      } catch (err) {
        console.error('Failed to process ad watch:', err);
      } finally {
        setIsWatching(false);
        setShowAdModal(false);
      }
    }
  };

  // Small HTML wrapper using YouTube IFrame API that posts 'ended' when video finishes
  const injectedHTML = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
        <style>html,body,#player{height:100%;margin:0;background:black}</style>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          var player;
          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${YT_VIDEO_ID}',
              playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'autoplay': 1, 'start': 0, 'end': 5 },
              events: {
                'onStateChange': onPlayerStateChange
              }
            });
            try { player.playVideo && player.playVideo(); } catch(e) { }
          }
          function onPlayerStateChange(event) {
            if (event.data == YT.PlayerState.ENDED) {
              window.ReactNativeWebView.postMessage('ended');
            }
          }
        </script>
      </body>
    </html>
  `;
  return (
    <LinearGradient 
      colors={['#0D1B2A', '#1B263B', '#415A77']} 
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView 
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 90 + insets.bottom + 30, // Tab bar height + bottom inset + buffer
        }}
      >
        <ThemedView style={{
          backgroundColor: 'transparent',
          alignItems: 'center',
          paddingTop: 60 + insets.top,
          paddingBottom: 20,
        }}>
          <ThemedText type="title" style={styles.title}>
            Challenges
          </ThemedText>
        </ThemedView>
        
        {/* Watch Ad Section */}
        <View style={styles.adBox}>
          <Text style={styles.adTitle}>Daily Ad Challenge</Text>
          <Text style={styles.adSubtitle}>
            Watch 15 ads today to earn 1 coin • {adsWatchedToday}/15 completed
          </Text>
          <Pressable onPress={handleWatchAd} disabled={isWatching}>
            <LinearGradient
              colors={isWatching ? ['#94D3A2', '#7CC47F'] : ['#8BC34A', '#4CAF50']}
              style={styles.watchButton}
            >
              <Text style={styles.watchButtonText}>
                {isWatching ? 'Watching...' : dailyRewardClaimed ? 'Keep Watching' : 'Watch Ad'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
        
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
                  // JOIN FOR 2 COINS Button
                  <Pressable 
                    style={styles.joinButton} 
                    onPress={joinChallenge}
                    disabled={isLoading || Number(totalEarned) < 2}
                  >
                    <LinearGradient
                      colors={(isLoading || totalEarned < 2) ? ['#888888', '#666666'] : ['#8BC34A', '#689F38']}
                      style={styles.joinButtonGradient}
                    >
                      <FontAwesome name="play" size={16} color="#fff" />
                      <ThemedText style={styles.joinButtonText}>
                        {isLoading ? 'JOINING...' : 'JOIN FOR 2 COINS'}
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

                    {/* Leave Challenge button (visible when joined and not completed) */}
                    {hasJoinedChallenge && !isCompleted && (
                      <Pressable
                        style={[styles.leaveButton]}
                        onPress={leaveChallenge}
                        disabled={isLoading}
                      >
                        <LinearGradient
                          colors={['#E53935', '#D32F2F']}
                          style={styles.leaveButtonGradient}
                        >
                          <ThemedText style={styles.leaveButtonText}>
                            {isLoading ? 'LEAVING...' : 'Leave Challenge'}
                          </ThemedText>
                        </LinearGradient>
                      </Pressable>
                    )}

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

          <View style={styles.challengeCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.challengeHeader}>
                <FontAwesome name="gamepad" size={20} color="#FFD700" />
                <ThemedText style={styles.challengeTitle}>Play Games</ThemedText>
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

      {/* Ad modal with WebView */}
      <Modal
        visible={showAdModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          // Prevent closing while ad is playing
          if (!isWatching) setShowAdModal(false);
        }}
      >
        <View style={styles.modalContainer}>
          {adLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: '#fff', marginTop: 8 }}>Loading ad...</Text>
            </View>
          )}
          {/* @ts-ignore */}
          <WebView
            originWhitelist={["*"]}
            source={{ html: injectedHTML }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={onAdMessage}
            onLoadEnd={() => setAdLoading(false)}
            style={styles.webview}
            // Allow autoplay controls
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState={true}
            allowsFullscreenVideo={true}
          />
        </View>
      </Modal>
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
  leaveButton: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '60%',
  },
  leaveButtonGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: '700',
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
  adBox: {
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  watchButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  watchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
