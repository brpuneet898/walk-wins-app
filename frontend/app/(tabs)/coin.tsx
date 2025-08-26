import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
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
import { calculateTotalEarnings } from '../../utils/earnings';
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
  const [isWatching, setIsWatching] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(true);
  const totalEarned = calculateTotalEarnings(lifetimeSteps, coins, boostSteps);
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
        <GradientText style={styles.totalEarnedText}>
          ₹{totalEarned.toFixed(2)}
        </GradientText>
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

      <View style={styles.infoContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
          style={styles.infoBox}
        >
          <Text style={styles.infoTitle}>How Earnings Work</Text>
          <Text style={styles.infoText}>
            • You earn ₹0.01 per step walked{'\n'}
            • Daily step tracking adds to lifetime total{'\n'}
            • Referral bonuses boost your earnings{'\n'}
            • Check your daily history in Profile tab
          </Text>
        </LinearGradient>
      </View>
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
  totalEarnedText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  lifetimeStepsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoContainer: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  infoBox: {
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  adBox: {
    marginHorizontal: 15,
    marginBottom: 20,
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
});