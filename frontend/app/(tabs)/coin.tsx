import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

// --- START: GradientText Component ---
const GradientText = (props) => (
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
  const { coins = 0, lifetimeSteps = 0 } = useSteps() as any;
  const pricePerStep = 0.01;
  const stepEarnings = lifetimeSteps * pricePerStep;
  const totalEarned = stepEarnings + (coins || 0);

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
});