import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Image, TextInput, Alert, ScrollView } from 'react-native';
import { useSteps } from '../../context/StepContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { calculateTotalEarnings, calculateStepEarnings, calculateBonusEarnings } from '../../utils/earnings';
// Level system imports
import { useLevelSystem } from '../../context/LevelContext';
// @ts-ignore - firebaseConfig is a JS module without types
import { auth, db } from '../../firebaseConfig';
import { doc, updateDoc, increment, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
// WebView for in-app ad playback
// Note: install with `expo install react-native-webview` if missing
// @ts-ignore
import { WebView } from 'react-native-webview';

// --- START: GradientText Component ---
const GradientText = (props: any) => (
  <MaskedView maskElement={<Text {...props} />}>
    <LinearGradient
      colors={['#00c6ff', '#0072ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text {...props} style={[props.style, { opacity: 0 }]} />
    </LinearGradient>
  </MaskedView>
);
// --- END: GradientText Component ---

const AnimatedBackground = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);

  useEffect(() => {
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

export default function CoinScreen() {
  const { coins = 0, lifetimeSteps = 0, boostSteps = 0, setCoins } = useSteps() as any;
  const { currentLevel } = useLevelSystem();
  const [isWatching, setIsWatching] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for daily ad reward system
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  
  // Transaction history state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  
  // Available withdrawal amounts
  const withdrawalAmounts = [100, 2, 500, 1000, 2000, 4000, 5000, 10000];
  
  // Function to format timestamp
  const formatTransactionDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        // Show time if within 24 hours
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 168) { // 7 days
        // Show day and time
        return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        // Show full date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      return 'Unknown';
    }
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

  // Load transaction history
  useEffect(() => {
    const loadTransactionHistory = async () => {
      try {
        setTransactionsLoading(true);
        // @ts-ignore
        const currentAuth: any = auth;
        const user = currentAuth.currentUser;
        if (user) {
          const transactionsRef = collection(db, 'users', user.uid, 'transactions');
          const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(10)); // Get last 10 transactions
          const querySnapshot = await getDocs(q);
          
          const transactionData: any[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactionData.push({
              id: doc.id,
              amount: data.amount,
              timestamp: data.timestamp,
            });
          });
          
          setTransactions(transactionData);
        }
      } catch (error) {
        console.error('Error loading transaction history:', error);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    loadTransactionHistory();
  }, []);

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
  
  // Calculate earnings with level system
  const [totalEarned, setTotalEarned] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(true);

  useEffect(() => {
    const loadEarnings = async () => {
      try {
        setEarningsLoading(true);
        const earned = await calculateTotalEarnings(lifetimeSteps, coins, boostSteps, currentLevel);
        setTotalEarned(earned);
      } catch (error) {
        console.error('Error calculating earnings:', error);
        setTotalEarned(0);
      } finally {
        setEarningsLoading(false);
      }
    };

    loadEarnings();
  }, [lifetimeSteps, coins, boostSteps, currentLevel]);
  
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

  // Handle withdrawal form submission
  const handleWithdrawSubmit = async () => {
    if (!paymentDetails.trim()) {
      Alert.alert('Error', 'Please enter your UPI ID or phone number');
      return;
    }

    if (selectedAmount > totalEarned) {
      Alert.alert('Error', `You can only withdraw up to ₹${totalEarned.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // @ts-ignore
      const currentAuth: any = auth;
      const user = currentAuth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          payment_details: paymentDetails.trim(),
          withdraw_amount: selectedAmount,
        });
        Alert.alert('Success', 'Your request has been proceeded. You\'ll receive the withdrawal amount within 48 hours');
        setShowWithdrawForm(false);
        setPaymentDetails('');
        setSelectedAmount(100);
      }
    } catch (err) {
      console.error('Failed to save withdrawal details:', err);
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.gradientContainer}
      >
        <AnimatedBackground />
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.header}>Your Earning</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total Earned</Text>
        <View style={styles.earningsContainer}>
          <MaskedView 
            maskElement={
              <Image 
                source={require('../../assets/images/icon.png')}
                style={styles.earningsIcon}
              />
            }
          >
            <LinearGradient
              colors={['#00c6ff', '#0072ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.earningsIcon}
            />
          </MaskedView>
          <GradientText style={styles.totalEarnedText}>
            {earningsLoading ? '...' : totalEarned.toFixed(2)}
          </GradientText>
        </View>
        <Text style={styles.lifetimeStepsText}>Based on {lifetimeSteps} lifetime steps</Text>
      </View>

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

      {/* Withdrawal Section */}
      {!showWithdrawForm ? (
        <View style={styles.withdrawBox}>
          <Text style={styles.withdrawTitle}>Withdraw Earnings</Text>
          <Text style={styles.withdrawSubtitle}>Convert your earnings to cash</Text>
          <Pressable onPress={() => setShowWithdrawForm(true)} style={styles.withdrawButton}>
            <LinearGradient
              colors={['#8BC34A', '#4CAF50']}
              style={styles.withdrawButtonGradient}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.withdrawFormBox}>
          <Text style={styles.withdrawFormTitle}>Enter Payment Details</Text>
          <TextInput
            style={styles.paymentInput}
            placeholder="Enter UPI ID or Phone Number"
            placeholderTextColor="#9CA3AF"
            value={paymentDetails}
            onChangeText={setPaymentDetails}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <Text style={styles.amountSelectorTitle}>Select Withdrawal Amount</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.amountScrollView}
            contentContainerStyle={styles.amountScrollContent}
          >
            {withdrawalAmounts.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                  amount > totalEarned && styles.amountButtonDisabled
                ]}
                onPress={() => amount <= totalEarned && setSelectedAmount(amount)}
                disabled={amount > totalEarned}
              >
                <Text style={[
                  styles.amountButtonText,
                  selectedAmount === amount && styles.amountButtonTextSelected,
                  amount > totalEarned && styles.amountButtonTextDisabled
                ]}>
                  ₹{amount}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          
          <Text style={styles.availableBalanceText}>
            Available Balance: ₹{totalEarned.toFixed(2)}
          </Text>
          
          <View style={styles.formButtonsContainer}>
            <Pressable 
              onPress={() => {
                setShowWithdrawForm(false);
                setPaymentDetails('');
                setSelectedAmount(100);
              }} 
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              onPress={handleWithdrawSubmit} 
              disabled={isSubmitting || selectedAmount > totalEarned}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={
                  isSubmitting || selectedAmount > totalEarned 
                    ? ['#94D3A2', '#7CC47F'] 
                    : ['#8BC34A', '#4CAF50']
                }
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {/* Transaction History Section */}
      <View style={styles.transactionHistoryBox}>
        <Text style={styles.transactionHistoryTitle}>Transaction History</Text>
        <Text style={styles.transactionHistorySubtitle}>Your recent earnings and withdrawals</Text>
        
        {transactionsLoading ? (
          <View style={styles.transactionLoadingContainer}>
            <ActivityIndicator size="small" color="#8BC34A" />
            <Text style={styles.transactionLoadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.noTransactionsContainer}>
            <Text style={styles.noTransactionsText}>No transactions yet</Text>
            <Text style={styles.noTransactionsSubtext}>Start earning to see your history here</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.transactionScrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.transactionScrollContent}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            {transactions.map((transaction, index) => (
              <View key={transaction.id || index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionIconText}>₹</Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionAmount}>₹{transaction.amount?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.transactionDate}>
                      {formatTransactionDate(transaction.timestamp)}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionType}>Earned</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 100, // Increased bottom padding for navigation bar clearance
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
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
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#FFFFFF',
  },
  summaryBox: {
    padding: 24, // Increased padding for better visual balance
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
    borderRadius: 20,
    marginBottom: 24,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  earningsIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  totalEarnedText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  lifetimeStepsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  adBox: {
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 20, // Increased padding for better visual balance
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
  adRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  adCount: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  adReward: {
    fontSize: 13,
    color: '#8BC34A',
    fontWeight: '700',
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
  withdrawBox: {
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 20, // Increased padding for consistency
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  withdrawTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  withdrawButton: {
    marginTop: 12,
  },
  withdrawButtonGradient: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  withdrawFormBox: {
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 20, // Increased padding for consistency
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  withdrawFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  paymentInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
  submitButtonGradient: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountSelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },
  amountScrollView: {
    marginBottom: 12,
  },
  amountScrollContent: {
    paddingHorizontal: 4,
  },
  amountButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 80,
    alignItems: 'center',
  },
  amountButtonSelected: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  amountButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  amountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  amountButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountButtonTextDisabled: {
    color: '#9CA3AF',
  },
  availableBalanceText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  transactionHistoryBox: {
    marginHorizontal: 15,
    marginBottom: 30, // Increased bottom margin for navigation bar clearance
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 41, 55, 0.4)', // Slightly more opaque background for better visibility
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', // Subtle border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Add subtle shadow for depth
  },
  transactionHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionHistorySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  transactionLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  transactionLoadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  noTransactionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  noTransactionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noTransactionsSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  transactionScrollView: {
    maxHeight: 250, // Set a reasonable max height for the transaction list
    borderRadius: 8, // Add subtle border radius for better visual appeal
    flex: 1,
  },
  transactionScrollContent: {
    paddingBottom: 20, // Add bottom padding for better spacing
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16, // Increased padding for better touch targets
    paddingHorizontal: 16, // Increased horizontal padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)', // Slightly more subtle border
    minHeight: 60, // Ensure minimum height for better touch targets
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionType: {
    color: '#8BC34A',
    fontSize: 12,
    fontWeight: '600',
  },
});