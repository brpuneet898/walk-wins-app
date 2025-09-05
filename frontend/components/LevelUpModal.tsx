import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getLevelInfo } from '../utils/levelSystem';
import * as Haptics from 'expo-haptics';

interface LevelUpModalProps {
  visible: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  lifetimeSteps: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LevelUpModal({
  visible,
  onClose,
  oldLevel,
  newLevel,
  lifetimeSteps,
}: LevelUpModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const newLevelInfo = getLevelInfo(newLevel);
  const oldLevelInfo = getLevelInfo(oldLevel);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Start animations
      startLevelUpAnimation();
    } else {
      // Reset animations
      resetAnimations();
    }
  }, [visible]);

  const startLevelUpAnimation = () => {
    // Sequence of animations
    Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Scale up old level badge
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 400,
        useNativeDriver: true,
      }),
      // Sparkle effect
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Rotate and transform to new level
      Animated.parallel([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Bounce to final size
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetAnimations = () => {
    scaleAnim.setValue(0);
    rotateAnim.setValue(0);
    fadeAnim.setValue(0);
    sparkleAnim.setValue(0);
    bounceAnim.setValue(0);
  };

  const getLevelColors = (level: number) => {
    const colorSets = [
      ['#757575', '#424242'], // Level 0 - Gray
      ['#8BC34A', '#689F38'], // Level 1 - Light Green
      ['#4CAF50', '#388E3C'], // Level 2 - Green
      ['#2196F3', '#1976D2'], // Level 3 - Blue
      ['#9C27B0', '#7B1FA2'], // Level 4 - Purple
      ['#FF9800', '#F57C00'], // Level 5 - Orange
      ['#F44336', '#D32F2F'], // Level 6 - Red
      ['#E91E63', '#C2185B'], // Level 7 - Pink
      ['#673AB7', '#512DA8'], // Level 8 - Deep Purple
      ['#FF5722', '#E64A19'], // Level 9 - Deep Orange
      ['#FFD700', '#FFA000']  // Level 10 - Gold
    ];
    return colorSets[Math.min(level, 10)] || colorSets[0];
  };

  const [newPrimaryColor, newSecondaryColor] = getLevelColors(newLevel);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.5, 0],
  });

  // Generate sparkle positions
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    distance: 80 + Math.random() * 40,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles.container}>
          {/* Sparkle Effects */}
          {sparkles.map((sparkle) => (
            <Animated.View
              key={sparkle.id}
              style={[
                styles.sparkle,
                {
                  left: screenWidth / 2 + Math.cos(sparkle.angle) * sparkle.distance,
                  top: screenHeight / 2 + Math.sin(sparkle.angle) * sparkle.distance,
                  transform: [{ scale: sparkleScale }],
                }
              ]}
            >
              <Ionicons name="star" size={16} color="#FFD700" />
            </Animated.View>
          ))}

          {/* Main Level Up Content */}
          <View style={styles.content}>
            <Text style={styles.congratsText}>🎉 LEVEL UP! 🎉</Text>
            
            {/* Animated Level Badge */}
            <Animated.View
              style={[
                styles.levelBadgeContainer,
                {
                  transform: [
                    { scale: Animated.multiply(scaleAnim, bounceAnim) },
                    { rotate: rotateInterpolate },
                  ],
                }
              ]}
            >
              <LinearGradient
                colors={[newPrimaryColor, newSecondaryColor]}
                style={styles.levelBadge}
              >
                <Text style={styles.levelNumber}>{newLevel}</Text>
              </LinearGradient>
            </Animated.View>

            <Text style={styles.newLevelText}>
              You've reached <Text style={styles.levelName}>{newLevelInfo.name}</Text>!
            </Text>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>New Benefits Unlocked:</Text>
              
              <View style={styles.benefitItem}>
                <Ionicons name="cash" size={20} color="#FFD700" />
                <Text style={styles.benefitText}>
                  Earn ₹{newLevelInfo.coinMultiplier} per step (was ₹{oldLevelInfo.coinMultiplier})
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="footsteps" size={20} color="#8BC34A" />
                <Text style={styles.benefitText}>
                  {lifetimeSteps.toLocaleString()} lifetime steps completed!
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="trophy" size={20} color="#FF9800" />
                <Text style={styles.benefitText}>
                  {newLevelInfo.description}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.continueButton}>
              <LinearGradient
                colors={[newPrimaryColor, newSecondaryColor]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueText}>Continue Walking!</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    position: 'relative',
    width: screenWidth - 40,
    maxHeight: screenHeight - 100,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 1,
  },
  content: {
    backgroundColor: '#2d2d2d',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  levelBadgeContainer: {
    marginVertical: 20,
  },
  levelBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  newLevelText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  levelName: {
    color: '#8BC34A',
    fontWeight: 'bold',
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  benefitText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  continueButton: {
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
