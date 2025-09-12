import React, { useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacityImage = useSharedValue(1);
  const opacityMask = useSharedValue(1);

  useEffect(() => {
    // Start the animation sequence
    startAnimationSequence();
  }, []);

  const startAnimationSequence = () => {
    // Step 1: Logo grows from point to full size (800ms)
    scale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.back(1.2)),
    }, () => {
      // Step 2: Shake/wobble animation (600ms)
      rotation.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(2, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withTiming(0, { duration: 400 }, () => {
          // Step 3: Fade out image first (200ms)
          opacityImage.value = withTiming(0, {
            duration: 200,
            easing: Easing.in(Easing.ease),
          }, () => {
            // Step 4: Fade out mask with slight delay (200ms)
            opacityMask.value = withDelay(100, withTiming(0, {
              duration: 200,
              easing: Easing.in(Easing.ease),
            }, () => {
              // Animation complete, transition to main app
              runOnJS(onAnimationComplete)();
            }));
          });
        })
      );
    });
  };

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityImage.value,
    };
  });

  const maskAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityMask.value,
    };
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
            <Animated.View style={[styles.circularMask, maskAnimatedStyle]}>
              <Animated.Image
                source={require('../assets/images/icon.png')}
                style={[styles.logo, imageAnimatedStyle]}
                resizeMode="cover"
              />
            </Animated.View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularMask: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    // Add subtle border for premium look
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  logo: {
    width: 110,
    height: 110,
  },
});

export default SplashScreen;
