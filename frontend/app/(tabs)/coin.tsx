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
import { doc, updateDoc, increment } from 'firebase/firestore';
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
  
  // Available withdrawal amounts
  const withdrawalAmounts = [2, 10, 20, 100, 500, 1000, 2000, 4000, 5000, 10000];
  
  // Calculate earnings with level system
  const totalEarned = calculateTotalEarnings(lifetimeSteps, coins, boostSteps, currentLevel);
  const stepEarnings = calculateStepEarnings(lifetimeSteps, boostSteps, currentLevel);
  const bonusEarnings = calculateBonusEarnings(coins);
  
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
      // Persist reward to Firestore first
      try {
        // @ts-ignore
        const currentAuth: any = auth;
        const user = currentAuth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            coins: increment(2),
            adsWatched: increment(1),
          });

          // Update local UI after successful persistence
          try {
            if (typeof setCoins === 'function') {
              setCoins((prev: number) => (Number(prev) || 0) + 2);
            }
          } catch (e) {
            console.error('Error updating local coins after ad persistence:', e);
          }
        }
      } catch (err) {
        console.error('Failed to persist ad reward to Firestore:', err);
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
    <LinearGradient
      colors={['#0D1B2A', '#1B263B', '#415A77']}
      style={styles.container}
    >
      <AnimatedBackground />

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
            {totalEarned.toFixed(2)}
          </GradientText>
        </View>
        <Text style={styles.lifetimeStepsText}>Based on {lifetimeSteps} lifetime steps</Text>
      </View>

      {/* Watch Ad Section */}
      <View style={styles.adBox}>
        <Text style={styles.adTitle}>Watch ad to earn coins</Text>
        <Text style={styles.adSubtitle}>Watch a short ad to earn coins</Text>
        <Pressable onPress={handleWatchAd} disabled={isWatching}>
          <LinearGradient
            colors={isWatching ? ['#94D3A2', '#7CC47F'] : ['#8BC34A', '#4CAF50']}
            style={styles.watchButton}
          >
            <Text style={styles.watchButtonText}>{isWatching ? 'Watching...' : 'Watch Ad'}</Text>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    overflow: 'hidden',
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
    padding: 20,
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
    padding: 16,
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
    padding: 16,
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
    padding: 16,
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
});