import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getLevelInfo } from '../utils/levelSystem';

const { width, height } = Dimensions.get('window');

interface EnhancedLevelUpModalProps {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

// Sparkle component with random positioning and animation
const Sparkle = ({ delay = 0, size = 20 }: { delay?: number; size?: number }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue((Math.random() - 0.5) * 100);
  const translateY = useSharedValue((Math.random() - 0.5) * 100);

  useEffect(() => {
    const animate = () => {
      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 400 })
        )
      );
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 400 })
        )
      );
      rotation.value = withDelay(
        delay,
        withTiming(360, { duration: 1000 })
      );
    };

    animate();
    const interval = setInterval(animate, 3000);
    return () => clearInterval(interval);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.sparkle, animatedStyle]}>
      <Ionicons name="sparkles" size={size} color="#FFD700" />
    </Animated.View>
  );
};

// Firework explosion effect
const Firework = ({ delay = 0 }: { delay?: number }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(2, { duration: 800 }),
        withTiming(0, { duration: 300 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 700 })
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.firework, animatedStyle]}>
      <Text style={styles.fireworkText}>🎆</Text>
    </Animated.View>
  );
};

export default function EnhancedLevelUpModal({ 
  visible, 
  oldLevel, 
  newLevel, 
  onClose 
}: EnhancedLevelUpModalProps) {
  const backdropOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.3);
  const containerOpacity = useSharedValue(0);
  const levelTextScale = useSharedValue(0);
  const crownScale = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const levelInfo = getLevelInfo(newLevel);
  const oldLevelInfo = getLevelInfo(oldLevel);

  const triggerHaptics = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 300);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 600);
  };

  useEffect(() => {
    if (visible) {
      runOnJS(triggerHaptics)();
      
      // Backdrop animation
      backdropOpacity.value = withTiming(1, { duration: 300 });
      
      // Container entrance with bounce
      containerScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.1, { damping: 10, stiffness: 100 }),
          withSpring(1, { damping: 8, stiffness: 150 })
        )
      );
      containerOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      
      // Shake effect for excitement
      shakeX.value = withDelay(
        400,
        withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        )
      );
      
      // Level text dramatic entrance
      levelTextScale.value = withDelay(
        600,
        withSequence(
          withSpring(1.3, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 })
        )
      );
      
      // Crown with spinning entrance
      crownScale.value = withDelay(
        800,
        withSequence(
          withSpring(1.4, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 8, stiffness: 150 })
        )
      );
      
      // Button fade in
      buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
      
      // Continuous pulsing glow
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1,
        true
      );

      // Pulse scale effect
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      // Reset all animations
      backdropOpacity.value = 0;
      containerScale.value = 0.3;
      containerOpacity.value = 0;
      levelTextScale.value = 0;
      crownScale.value = 0;
      buttonOpacity.value = 0;
      glowOpacity.value = 0;
      shakeX.value = 0;
      pulseScale.value = 1;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: containerScale.value * pulseScale.value },
      { translateX: shakeX.value }
    ],
    opacity: containerOpacity.value,
  }));

  const levelTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelTextScale.value }],
  }));

  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!visible) return null;

  // Generate random sparkles
  const sparkles = Array.from({ length: 15 }, (_, i) => (
    <Sparkle key={i} delay={i * 100} size={15 + Math.random() * 10} />
  ));

  // Generate fireworks
  const fireworks = Array.from({ length: 6 }, (_, i) => (
    <Firework key={i} delay={300 + i * 200} />
  ));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {/* Animated background elements */}
        <View style={styles.effectsContainer}>
          {sparkles}
          {fireworks}
        </View>
        
        {/* Main container */}
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Multiple glow layers */}
          <Animated.View style={[styles.glow, styles.glowOuter, glowStyle]} />
          <Animated.View style={[styles.glow, styles.glowMiddle, glowStyle]} />
          <Animated.View style={[styles.glow, styles.glowInner, glowStyle]} />
          
          <LinearGradient
            colors={['#FF6B35', '#F7931E', '#FFD700', '#FFEB3B']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Celebration header */}
            <View style={styles.headerContainer}>
              <Text style={styles.celebrationText}>🎉 LEGENDARY! 🎉</Text>
              <Text style={styles.levelUpText}>LEVEL UP!</Text>
            </View>
            
            {/* Animated crown */}
            <Animated.View style={[styles.crownContainer, crownStyle]}>
              <View style={styles.crownBadge}>
                <Ionicons name="trophy" size={50} color="#FFFFFF" />
                <Text style={styles.crownLevel}>{newLevel}</Text>
              </View>
            </Animated.View>
            
            {/* Level progression */}
            <Animated.View style={[styles.progressContainer, levelTextStyle]}>
              <View style={styles.levelProgression}>
                <View style={styles.oldLevelBadge}>
                  <Text style={styles.oldLevelText}>{oldLevel}</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" style={styles.arrow} />
                <View style={styles.newLevelBadge}>
                  <Text style={styles.newLevelText}>{newLevel}</Text>
                </View>
              </View>
              
              <Text style={styles.levelName}>{levelInfo.name}</Text>
              
              {/* Rewards showcase */}
              <View style={styles.rewardsContainer}>
                <View style={styles.rewardItem}>
                  <Ionicons name="cash" size={20} color="#FFD700" />
                  <Text style={styles.rewardText}>
                    +{((levelInfo.coinMultiplier - oldLevelInfo.coinMultiplier) * 1000).toFixed(1)}% Coin Boost
                  </Text>
                </View>
                
                <View style={styles.rewardItem}>
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <Text style={styles.rewardText}>
                    New Achievement Unlocked
                  </Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Continue button with animation */}
            <Animated.View style={[styles.buttonContainer, buttonStyle]}>
              <Pressable
                style={styles.continueButton}
                onPress={onClose}
                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.continueButtonText}>Continue Your Journey</Text>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  effectsContainer: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  firework: {
    position: 'absolute',
  },
  fireworkText: {
    fontSize: 40,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 25,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
  },
  glow: {
    position: 'absolute',
    borderRadius: 38,
    backgroundColor: '#FFD700',
  },
  glowOuter: {
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
  },
  glowMiddle: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
  },
  glowInner: {
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  levelUpText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 3,
  },
  crownContainer: {
    marginBottom: 24,
  },
  crownBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  crownLevel: {
    position: 'absolute',
    bottom: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelProgression: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  oldLevelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oldLevelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrow: {
    marginHorizontal: 16,
  },
  newLevelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  newLevelText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  levelName: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  rewardsContainer: {
    alignItems: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
