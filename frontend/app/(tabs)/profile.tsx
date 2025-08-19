import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, FlatList } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useSteps } from '../../context/StepContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

export default function ProfileScreen() {
  const { setIsLoggingOut, dailyRecords = [] } = useSteps();
  const user = auth.currentUser;
  const [userProfile, setUserProfile] = useState(null);
  const [dailyStepGoal, setDailyStepGoal] = useState(3000);
  const [sliderValue, setSliderValue] = useState(3000);

  const buttonScale = useSharedValue(1);

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
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const updateGoalInDatabase = async (newGoal) => {
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

  const handleSliderChange = (value) => {
    const roundedValue = Math.round(value / 100) * 100; // Round to nearest 100
    const clampedValue = Math.max(3000, roundedValue); // Minimum 3000 steps
    setSliderValue(clampedValue);
  };

  const handleSliderComplete = async (value) => {
    const roundedValue = Math.round(value / 100) * 100;
    const clampedValue = Math.max(3000, roundedValue);
    setDailyStepGoal(clampedValue);
    setSliderValue(clampedValue);
    await updateGoalInDatabase(clampedValue);
  };

  const setPresetGoal = async (goal) => {
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

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

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
              <View style={styles.avatar}>
                <FontAwesome name="user" size={32} color="#8BC34A" />
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
                  thumbStyle={styles.sliderThumb}
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
                  <FlatList
                    data={dailyRecords}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={true}
                    style={styles.historyList}
                    contentContainerStyle={styles.historyListContent}
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                    bounces={false}
                    renderItem={({ item }) => (
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
                    )}
                    ItemSeparatorComponent={() => <View style={styles.historySeparator} />}
                  />
                  
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
    backgroundColor: 'rgba(139,195,74,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#8BC34A',
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
    justifyContent: 'space-between',
    width: '100%',
  },
  presetGoalButton: {
    width: 70,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
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
});