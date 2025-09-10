import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, FlatList, Modal, ActivityIndicator } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useSteps } from '../../context/StepContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
// Level system imports
import { useLevelSystem, useLevelCalculations } from '../../context/LevelContext';
import LevelBadge from '../../components/LevelBadge';
import LevelInfoModal from '../../components/LevelInfoModal';
import LevelUpModal from '../../components/LevelUpModal';
// WebView for milestone ad
// @ts-ignore
import { WebView } from 'react-native-webview';

// User profile type
interface UserProfile {
  username?: string;
  referralCode?: string;
  totalReferrals?: number;
  dailyStepGoal?: number;
  lifetimeSteps?: number;
  lifetimeTotalSteps?: number;
  currentLevel?: number;
  lastAdMilestoneClaimed?: number;
  coins?: number;
}

export default function ProfileScreen() {
  const { setIsLoggingOut, dailyRecords = [], coins, setCoins } = useSteps();
  const router = useRouter();
  const user = auth.currentUser;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyStepGoal, setDailyStepGoal] = useState(3000);
  const [sliderValue, setSliderValue] = useState(3000);

  // Milestone Ad states
  const [showMilestoneAd, setShowMilestoneAd] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const [isWatchingMilestoneAd, setIsWatchingMilestoneAd] = useState(false);
  const [milestoneAdModalVisible, setMilestoneAdModalVisible] = useState(false);
  const [milestoneAdLoading, setMilestoneAdLoading] = useState(true);

  // Level system hooks and state
  const { 
    currentLevel, 
    lifetimeSteps, 
    showLevelUpModal, 
    pendingLevelUp, 
    dismissLevelUpModal,
    initializeUserLevel 
  } = useLevelSystem();
  const { levelInfo, nextLevel, getProgressToNextLevel } = useLevelCalculations();
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);

  const buttonScale = useSharedValue(1);

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

  // 👈 ADD: Function to get colors based on initial
  const getAvatarColors = () => {
    const initial = getUserInitial();
    if (!initial) return { background: 'rgba(139,195,74,0.2)', border: '#8BC34A', text: '#8BC34A' };
    
    // Different color schemes for each letter
    const colorMap = {
      'A': { background: 'rgba(255,107,107,0.2)', border: '#FF6B6B', text: '#FF6B6B' },
      'B': { background: 'rgba(78,205,196,0.2)', border: '#4ECDC4', text: '#4ECDC4' },
      'C': { background: 'rgba(69,183,209,0.2)', border: '#45B7D1', text: '#45B7D1' },
      'D': { background: 'rgba(150,206,180,0.2)', border: '#96CEB4', text: '#96CEB4' },
      'E': { background: 'rgba(254,202,87,0.2)', border: '#FECA57', text: '#FECA57' },
      'F': { background: 'rgba(255,159,67,0.2)', border: '#FF9F43', text: '#FF9F43' },
      'G': { background: 'rgba(162,155,254,0.2)', border: '#A29BFE', text: '#A29BFE' },
      'H': { background: 'rgba(253,121,168,0.2)', border: '#FD79A8', text: '#FD79A8' },
      'I': { background: 'rgba(116,185,255,0.2)', border: '#74B9FF', text: '#74B9FF' },
      'J': { background: 'rgba(85,239,196,0.2)', border: '#55EFC4', text: '#55EFC4' },
      'K': { background: 'rgba(255,184,184,0.2)', border: '#FFB8B8', text: '#FFB8B8' },
      'L': { background: 'rgba(206,214,224,0.2)', border: '#CED6E0', text: '#CED6E0' },
      'M': { background: 'rgba(255,121,121,0.2)', border: '#FF7979', text: '#FF7979' },
      'N': { background: 'rgba(116,125,140,0.2)', border: '#747D8C', text: '#747D8C' },
      'O': { background: 'rgba(255,168,1,0.2)', border: '#FFA801', text: '#FFA801' },
      'P': { background: 'rgba(60,99,130,0.2)', border: '#3C6382', text: '#3C6382' },
      'Q': { background: 'rgba(113,88,226,0.2)', border: '#7158E2', text: '#7158E2' },
      'R': { background: 'rgba(255,71,87,0.2)', border: '#FF4757', text: '#FF4757' },
      'S': { background: 'rgba(46,213,115,0.2)', border: '#2ED573', text: '#2ED573' },
      'T': { background: 'rgba(255,212,59,0.2)', border: '#FFD43B', text: '#FFD43B' },
      'U': { background: 'rgba(106,137,204,0.2)', border: '#6A89CC', text: '#6A89CC' },
      'V': { background: 'rgba(255,159,243,0.2)', border: '#FF9FF3', text: '#FF9FF3' },
      'W': { background: 'rgba(87,101,116,0.2)', border: '#576574', text: '#576574' },
      'X': { background: 'rgba(223,228,234,0.2)', border: '#DFE4EA', text: '#DFE4EA' },
      'Y': { background: 'rgba(255,195,18,0.2)', border: '#FFC312', text: '#FFC312' },
      'Z': { background: 'rgba(196,69,105,0.2)', border: '#C44569', text: '#C44569' },
    };
    
    return (colorMap as any)[initial] || { background: 'rgba(139,195,74,0.2)', border: '#8BC34A', text: '#8BC34A' };
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData);
          
          // Set the daily step goal from database
          const goalFromDb = userData.dailyStepGoal || 3000;
          setDailyStepGoal(goalFromDb);
          setSliderValue(goalFromDb);

          // Initialize level system if user doesn't have level data
          if (userData.currentLevel === undefined && (userData.lifetimeSteps || userData.lifetimeTotalSteps)) {
            const stepsToUse = userData.lifetimeSteps || userData.lifetimeTotalSteps || 0;
            await initializeUserLevel(stepsToUse);
          }
        }
      }
    };
    fetchUserProfile();
  }, [user, initializeUserLevel]);

  // Check milestone ad visibility when lifetime steps or user profile changes
  useEffect(() => {
    if (lifetimeSteps && userProfile) {
      checkMilestoneAdVisibility();
    }
  }, [lifetimeSteps, userProfile]);

  const updateGoalInDatabase = async (newGoal: number) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, { dailyStepGoal: newGoal });
        console.log('Goal updated to:', newGoal);
      } catch (err) {
        console.error('Error updating goal:', err);
      }
    }
  };

  const handleSliderChange = (value: number) => {
    const roundedValue = Math.round(value / 100) * 100; // Round to nearest 100
    const clampedValue = Math.max(3000, roundedValue); // Minimum 3000 steps
    setSliderValue(clampedValue);
  };

  const handleSliderComplete = async (value: number) => {
    const roundedValue = Math.round(value / 100) * 100;
    const clampedValue = Math.max(3000, roundedValue);
    setDailyStepGoal(clampedValue);
    setSliderValue(clampedValue);
    await updateGoalInDatabase(clampedValue);
  };

  const setPresetGoal = async (goal: number) => {
    // Animate button press
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    setDailyStepGoal(goal);
    setSliderValue(goal);
    await updateGoalInDatabase(goal);
  };

  const handleLogout = () => {
    // Animate button press
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    setIsLoggingOut(true);
    signOut(auth).catch(error => {
      Alert.alert('Logout Error', error.message);
      setIsLoggingOut(false);
    });
  };

  const copyReferralCode = () => {
    // Animate button press
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (userProfile?.referralCode) {
      Alert.alert('Your Referral Code', userProfile.referralCode, [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  // Milestone Ad Functions
  const calculateCurrentMilestone = (lifetimeSteps: number) => {
    return Math.floor(lifetimeSteps / 3000) * 3000;
  };

  const checkMilestoneAdVisibility = async () => {
    if (!user || !lifetimeSteps) return;

    const milestone = calculateCurrentMilestone(lifetimeSteps);
    const lastClaimed = userProfile?.lastAdMilestoneClaimed || 0;

    // Show ad if user reached a new milestone and hasn't claimed it yet
    const shouldShow = lifetimeSteps >= milestone && milestone > lastClaimed;
    
    setCurrentMilestone(milestone);
    setShowMilestoneAd(shouldShow);
  };

  // Put your YouTube link (shorts or regular) here. Examples:
  // 'https://www.youtube.com/shorts/VIDEOID', 'https://youtu.be/VIDEOID', or full watch URL
  const YT_LINK = 'https://www.youtube.com/shorts/ie_l0AJe13o';

  function extractYouTubeID(url: string) {
    // Matches youtu.be/ID, /watch?v=ID, /shorts/ID, /embed/ID or raw 11-char ID
    const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)?([0-9A-Za-z_-]{11})/);
    return m ? m[1] : url;
  }

  const YT_VIDEO_ID = extractYouTubeID(YT_LINK);

  // Milestone Ad HTML (same as coin.tsx)
  const milestoneAdHTML = `
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

  const handleWatchMilestoneAd = () => {
    if (isWatchingMilestoneAd) return;
    setIsWatchingMilestoneAd(true);
    setMilestoneAdLoading(true);
    setMilestoneAdModalVisible(true);
  };

  const onMilestoneAdMessage = async (event: any) => {
    const data = event.nativeEvent?.data;
    if (data === 'ended') {
      if (!user) {
        console.error('User not authenticated');
        return;
      }
      
      try {
        // Generate random reward (0-5 coins)
        const rewardCoins = Math.floor(Math.random() * 6);
        
        // Get fresh data from database first (like coin.tsx does)
        const userDocRef = doc(db, 'users', user.uid);
        const freshSnap = await getDoc(userDocRef);
        const freshData = freshSnap.data();
        const currentCoins = freshData?.coins || 0;
        
        // Update database with both coins and milestone tracking
        await updateDoc(userDocRef, {
          coins: increment(rewardCoins),
          lastAdMilestoneClaimed: currentMilestone,
        });

        // Update local state with the correct calculated value
        if (typeof setCoins === 'function') {
          setCoins(currentCoins + rewardCoins);
        }

        // Hide ad section and show reward
        setShowMilestoneAd(false);
        setMilestoneAdModalVisible(false);

        // Show reward alert
        Alert.alert(
          'Milestone Reward!',
          `Congratulations! You earned ${rewardCoins} coin${rewardCoins !== 1 ? 's' : ''} for reaching ${currentMilestone.toLocaleString()} lifetime steps!`,
          [{ text: 'Awesome!', style: 'default' }]
        );

        console.log(`[MILESTONE REWARD] User claimed ${rewardCoins} coins for milestone ${currentMilestone}`);
      } catch (err) {
        console.error('Failed to process milestone ad reward:', err);
        Alert.alert('Error', 'Failed to claim your reward. Please try again.');
      } finally {
        setIsWatchingMilestoneAd(false);
      }
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // 👈 ADD: Get dynamic avatar colors
  const avatarColors = getAvatarColors();

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B263B', '#415A77']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
            style={styles.profileCardGradient}
          >
            <View style={styles.avatarContainer}>
              <View style={[
                styles.avatar, 
                { 
                  backgroundColor: avatarColors.background, 
                  borderColor: avatarColors.border 
                }
              ]}>
                {/* 👈 CHANGED: Show initial or fallback icon */}
                {getUserInitial() ? (
                  <Text style={[styles.avatarInitial, { color: avatarColors.text }]}>
                    {getUserInitial()}
                  </Text>
                ) : (
                  <FontAwesome name="user" size={32} color="#8BC34A" />
                )}
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.emailLabel}>Logged in as</Text>
              <Text style={styles.emailText}>{user ? user.email : 'No user'}</Text>
              {userProfile?.username && (
                <View style={styles.usernameContainer}>
                  <Text style={styles.usernameText}>@{userProfile.username}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Level System Section */}
        <LevelBadge 
          userLevel={currentLevel}
          lifetimeSteps={lifetimeSteps}
          onInfoPress={() => setShowLevelInfoModal(true)}
          size="large"
        />

        {/* Daily Goals Section */}
        <View style={styles.goalsSection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={styles.goalsSectionGradient}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="flag" size={24} color="#8BC34A" />
              </View>
              <Text style={styles.sectionTitle}>Daily Step Goal</Text>
            </View>

            <View style={styles.goalDisplayContainer}>
              <Text style={styles.currentGoalLabel}>Current Goal</Text>
              <Text style={styles.currentGoalValue}>
                {dailyStepGoal.toLocaleString()} steps
              </Text>
            </View>

            {/* Custom Goal Slider */}
            <View style={styles.sliderContainer}>
              <LinearGradient
                colors={['rgba(139,195,74,0.1)', 'rgba(76,175,80,0.05)']}
                style={styles.sliderBox}
              >
                <Text style={styles.sliderLabel}>Set Custom Goal</Text>
                <View style={styles.sliderRangeContainer}>
                  <Text style={styles.sliderRangeText}>3,000</Text>
                  <Text style={styles.sliderRangeText}>20,000</Text>
                </View>
                
                <Slider
                  style={styles.slider}
                  minimumValue={3000}
                  maximumValue={20000}
                  step={100}
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#8BC34A"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                />
                
                <Text style={styles.sliderCurrentValue}>
                  {sliderValue.toLocaleString()} steps
                </Text>
              </LinearGradient>
            </View>

            {/* Quick Goals - Only 4 Options */}
            <View style={styles.presetGoalsContainer}>
              <Text style={styles.presetGoalsLabel}>Quick Goals</Text>
              <View style={styles.presetGoalsRow}>
                {[3000, 5000, 10000, 15000].map((goal) => (
                  <Pressable key={goal} onPress={() => setPresetGoal(goal)}>
                    <Animated.View style={[buttonAnimatedStyle]}>
                      <LinearGradient
                        colors={
                          dailyStepGoal === goal 
                            ? ['#8BC34A', '#689F38'] 
                            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                        }
                        style={styles.presetGoalButton}
                      >
                        <Text style={[
                          styles.presetGoalText,
                          { color: dailyStepGoal === goal ? '#FFFFFF' : '#BBBBBB' }
                        ]}>
                          {(goal / 1000).toFixed(0)}K
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Milestone Ad Section */}
        {showMilestoneAd && (
          <View style={styles.milestoneAdSection}>
            <LinearGradient
              colors={['rgba(255,215,0,0.1)', 'rgba(255,193,7,0.05)']}
              style={styles.milestoneAdGradient}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="trophy" size={24} color="#FFD700" />
                </View>
                <Text style={styles.sectionTitle}>Milestone Reward</Text>
              </View>

              <View style={styles.milestoneAdContent}>
                <Text style={styles.milestoneAdTitle}>
                  🎉 {currentMilestone.toLocaleString()} Steps Milestone!
                </Text>
                <Text style={styles.milestoneAdSubtitle}>
                  You've reached {currentMilestone.toLocaleString()} lifetime steps! Watch an ad to claim your reward (0-5 coins).
                </Text>
                
                <Pressable onPress={handleWatchMilestoneAd} disabled={isWatchingMilestoneAd}>
                  <LinearGradient
                    colors={isWatchingMilestoneAd ? ['#FFD700', '#FFC107'] : ['#FFD700', '#FFC107']}
                    style={styles.milestoneAdButton}
                  >
                    <Ionicons name="play-circle" size={20} color="#000" />
                    <Text style={styles.milestoneAdButtonText}>
                      {isWatchingMilestoneAd ? 'Watching...' : 'Claim Reward'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Daily History Section */}
        <View style={styles.historySection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={styles.historySectionGradient}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="calendar" size={24} color="#64FFDA" />
              </View>
              <Text style={styles.sectionTitle}>Daily History</Text>
            </View>

            <View style={styles.historyContainer}>
              {dailyRecords && dailyRecords.length > 0 ? (
                <>
                  <ScrollView
                    style={styles.historyList}
                    contentContainerStyle={styles.historyListContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    bounces={false}
                  >
                    {dailyRecords.slice().map((item, index) => (
                      <View key={item.id}>
                        <View style={styles.historyCard}>
                          <View style={styles.historyCardLeft}>
                            <Text style={styles.historyCardDate}>{item.id}</Text>
                            {item.time ? (
                              <Text style={styles.historyCardTime}>{String(item.time)}</Text>
                            ) : null}
                          </View>
                          <View style={styles.historyCardRight}>
                            <Text style={styles.historyCardSteps}>{item.steps}</Text>
                            <Text style={styles.historyCardStepsLabel}>steps</Text>
                          </View>
                        </View>
                        {index < dailyRecords.length - 1 && <View style={styles.historySeparator} />}
                      </View>
                    ))}
                  </ScrollView>
                  
                  {dailyRecords.length > 3 && (
                    <View style={styles.scrollIndicator}>
                      <Text style={styles.scrollIndicatorText}>
                        Scroll to see more • {dailyRecords.length} records total
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyHistoryContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#888888" />
                  <Text style={styles.emptyHistoryText}>No daily records yet</Text>
                  <Text style={styles.emptyHistorySubtext}>Start walking to see your progress!</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Referral Section */}
        <View style={styles.referralSection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={styles.referralSectionGradient}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="gift" size={24} color="#8BC34A" />
              </View>
              <Text style={styles.sectionTitle}>Referral Program</Text>
            </View>

            <View style={styles.referralCodeContainer}>
              <LinearGradient
                colors={['rgba(139,195,74,0.1)', 'rgba(76,175,80,0.05)']}
                style={styles.referralCodeBox}
              >
                <Text style={styles.referralLabel}>Your Referral Code</Text>
                <Text style={styles.referralCode}>
                  {userProfile?.referralCode || 'Loading...'}
                </Text>
                
                <Pressable onPress={copyReferralCode}>
                  <Animated.View style={[buttonAnimatedStyle]}>
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.copyButton}
                    >
                      <Ionicons name="eye" size={16} color="#FFFFFF" />
                      <Text style={styles.copyButtonText}>View Code</Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </LinearGradient>
            </View>

            <View style={styles.referralStats}>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  style={styles.statBox}
                >
                  <View style={styles.statIconContainer}>
                    <FontAwesome name="users" size={20} color="#64FFDA" />
                  </View>
                  <Text style={styles.statNumber}>{userProfile?.totalReferrals || 0}</Text>
                  <Text style={styles.statLabel}>People Referred</Text>
                </LinearGradient>
              </View>

              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  style={styles.statBox}
                >
                  <View style={styles.statIconContainer}>
                    <FontAwesome name="star" size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.statNumber}>
                    {((userProfile?.totalReferrals || 0) * 10).toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Bonus Coins</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable onPress={handleLogout}>
            <Animated.View style={[buttonAnimatedStyle]}>
              <LinearGradient
                colors={['#FF5722', '#D32F2F']}
                style={styles.logoutButton}
              >
                <Ionicons name="log-out" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Level Info Modal */}
      <LevelInfoModal 
        visible={showLevelInfoModal}
        onClose={() => setShowLevelInfoModal(false)}
        currentUserLevel={currentLevel}
      />

      {/* Level Up Modal */}
      {pendingLevelUp && (
        <LevelUpModal
          visible={showLevelUpModal}
          onClose={dismissLevelUpModal}
          oldLevel={pendingLevelUp.oldLevel}
          newLevel={pendingLevelUp.newLevel}
          lifetimeSteps={lifetimeSteps}
        />
      )}

      {/* Milestone Ad Modal */}
      <Modal
        visible={milestoneAdModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (!isWatchingMilestoneAd) setMilestoneAdModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          {milestoneAdLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: '#fff', marginTop: 8 }}>Loading milestone ad...</Text>
            </View>
          )}
          {/* @ts-ignore */}
          <WebView
            originWhitelist={["*"]}
            source={{ html: milestoneAdHTML }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={onMilestoneAdMessage}
            onLoadEnd={() => setMilestoneAdLoading(false)}
            style={styles.webview}
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
  },
  profileCardGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  // 👈 ADD: New style for the initial text
  avatarInitial: {
    fontSize: 32, // Same size as the original icon
    fontWeight: '900',
    textAlign: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  emailLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  usernameContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(139,195,74,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  usernameText: {
    fontSize: 16,
    color: '#8BC34A',
    fontWeight: '600',
  },
  // Daily Goals Section Styles
  goalsSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
  },
  goalsSectionGradient: {
    padding: 25,
    borderRadius: 20,
  },
  goalDisplayContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  currentGoalLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  currentGoalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8BC34A',
  },
  sliderContainer: {
    marginBottom: 25,
  },
  sliderBox: {
    padding: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,195,74,0.3)',
  },
  sliderLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  sliderRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderRangeText: {
    fontSize: 12,
    color: '#888888',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 15,
  },
  sliderThumb: {
    backgroundColor: '#8BC34A',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sliderCurrentValue: {
    fontSize: 18,
    color: '#8BC34A',
    fontWeight: '700',
    textAlign: 'center',
  },
  presetGoalsContainer: {
    alignItems: 'center',
  },
  presetGoalsLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 20,
  },
  presetGoalsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  presetGoalButton: {
    width: 70,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetGoalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Daily History Section Styles
  historySection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
  },
  historySectionGradient: {
    padding: 25,
    borderRadius: 20,
  },
  historyContainer: {
    height: 280, // Fixed height to show ~3 records and allow scrolling
    backgroundColor: 'rgba(255,255,255,0.02)', // Subtle background to show scroll area
    borderRadius: 12,
    padding: 8,
  },
  historyList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  historyListContent: {
    paddingBottom: 10,
    paddingTop: 5,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 70,
  },
  historyCardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  historyCardDate: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyCardTime: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  historyCardRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  historyCardSteps: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64FFDA',
    marginBottom: 2,
  },
  historyCardStepsLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  historySeparator: {
    height: 8,
  },
  scrollIndicator: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  scrollIndicatorText: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#888888',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  // Referral Section Styles
  referralSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
  },
  referralSectionGradient: {
    padding: 25,
    borderRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    justifyContent: 'center',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,195,74,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  referralCodeContainer: {
    marginBottom: 25,
  },
  referralCodeBox: {
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,195,74,0.3)',
  },
  referralLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 10,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8BC34A',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  referralStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  statBox: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  // Milestone Ad Section Styles
  milestoneAdSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
  },
  milestoneAdGradient: {
    padding: 25,
    borderRadius: 20,
  },
  milestoneAdContent: {
    alignItems: 'center',
  },
  milestoneAdTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  milestoneAdSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  milestoneAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  milestoneAdButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Modal Styles
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  webview: {
    flex: 1,
  },
});