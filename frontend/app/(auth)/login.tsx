import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
// @ts-ignore - firebaseConfig is a JS file without types, import may be implicitly any
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Make sure Animated is imported from reanimated
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
// --- START: Import react-native-svg ---
// Make sure you have installed this package by running: npx expo install react-native-svg
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
// --- END: Import react-native-svg ---

// --- START: New Logo Component ---
const Logo = ({ width = 40, height = 40 }) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Defs>
      <SvgLinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#8BC34A" />
        <Stop offset="100%" stopColor="#6FAF2D" />
      </SvgLinearGradient>
        </Defs>
        <Path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="url(#logoGradient)" strokeWidth="1.5"/>
        <Path d="M15.5 10.5C15.5 11.3284 14.8284 12 14 12C13.1716 12 12.5 11.3284 12.5 10.5C12.5 9.67157 13.1716 9 14 9C14.8284 9 15.5 9.67157 15.5 10.5Z" fill="url(#logoGradient)"/>
        <Path d="M8.65186 15.5H12.0519L10.5519 12L12.5519 10L9.55186 8.5L8.05186 11.5L6.55186 10L4.55186 12L5.55186 14H8.65186Z" stroke="url(#logoGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);
// --- END: New Logo Component ---

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

const GradientText = memo((props: any) => {
  return (
    <MaskedView maskElement={<Text {...props} />}>
      <LinearGradient
  // tuned gradient: slightly darker -> brighter -> deeper green for stronger contrast
  colors={['#5EA02A', '#8BC34A', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
  <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
});

// Animated Brand button with subtle press scale
const BrandGradientButton = memo(({ onPress, text }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 120 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 160 }); }}
      onPress={onPress}
      style={{ alignSelf: 'stretch' }}
    >
      <Animated.View style={[animatedStyle]}>
        <LinearGradient
          colors={['#6FAF2D', '#8BC34A', '#4CAF50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{text}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  const handleLogin = async () => {
    if (!email || !password) {
        return Alert.alert('Error', 'Please enter both email and password.');
    }
    try {
  // @ts-ignore - auth is imported from a JS config file
  await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your email and password.');
      console.error(error);
    }
  };

  const isEmailFocused = useSharedValue(false);
  const isPasswordFocused = useSharedValue(false);

  const emailContainerAnimatedStyle = useAnimatedStyle(() => {
  const borderColor = withTiming(isEmailFocused.value ? '#8BC34A' : '#4B5563', { duration: 200 });
  const shadowOpacity = withTiming(isEmailFocused.value ? 0.45 : 0, { duration: 200 });
  const shadowRadius = withTiming(isEmailFocused.value ? 6 : 0, { duration: 200 });
    return {
      borderColor,
      shadowOpacity,
      shadowRadius,
      elevation: isEmailFocused.value ? 5 : 0,
    };
  });

  const passwordContainerAnimatedStyle = useAnimatedStyle(() => {
  const borderColor = withTiming(isPasswordFocused.value ? '#8BC34A' : '#4B5563', { duration: 200 });
  const shadowOpacity = withTiming(isPasswordFocused.value ? 0.45 : 0, { duration: 200 });
  const shadowRadius = withTiming(isPasswordFocused.value ? 6 : 0, { duration: 200 });
    return {
      borderColor,
      shadowOpacity,
      shadowRadius,
      elevation: isPasswordFocused.value ? 5 : 0,
    };
  });

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); isEmailFocused.value = false; isPasswordFocused.value = false; }}>
      <LinearGradient colors={['#0D1B2A', '#1B263B', '#415A77']} style={styles.container}>
        <AnimatedBackground />
        
        <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(55, 65, 81, 0.7)' }]}>
        {/* --- START: Updated Title with Logo --- */}
        <View style={styles.titleContainer}>
          <Logo />
          <GradientText style={styles.title}>WalkWins</GradientText>
        </View>
        {/* --- END: Updated Title with Logo --- */}
  <Text style={[styles.subtitle, { color: theme.text }]}>Welcome back! Let's get moving.</Text>
        
        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <Animated.View style={[styles.inputContainer, emailContainerAnimatedStyle]}>
          <Ionicons name="mail" size={20} color={theme.icon} style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { color: theme.text }]}
            placeholder=""
            placeholderTextColor={theme.icon}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => { isEmailFocused.value = true; }}
            onBlur={() => { isEmailFocused.value = false; }}
          />
        </Animated.View>

        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
        <Animated.View style={[styles.inputContainer, passwordContainerAnimatedStyle]}>
          <Ionicons name="lock-closed" size={20} color={theme.icon} style={styles.inputIcon} />
          <TextInput
            style={[styles.inputField, { color: theme.text }]}
            placeholder=""
            placeholderTextColor={theme.icon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            onFocus={() => { isPasswordFocused.value = true; }}
            onBlur={() => { isPasswordFocused.value = false; }}
          />
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color={theme.icon} style={styles.iconToggle} />
          </Pressable>
        </Animated.View>

        <BrandGradientButton onPress={handleLogin} text="Login" />

        <Pressable onPress={() => router.push('/signup')}>
      <Text style={[styles.linkText, { color: theme.text }]}>Don't have an account? <Text style={[styles.linkHighlight, { color: '#8BC34A' }]}>Sign up now</Text></Text>
        </Pressable>
      </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0f192eff',
        overflow: 'hidden',
    },
    card: {
      backgroundColor: 'rgba(31, 41, 55, 0.8)',
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(55, 65, 81, 0.7)',
    },
    // --- START: New and Updated Title Styles ---
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    // --- END: New and Updated Title Styles ---
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#9CA3AF',
        marginBottom: 32,
    },
    label: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f192eff',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 20,
  shadowColor: '#8BC34A',
        shadowOffset: { width: 0, height: 0 },
    },
    inputIcon: {
        paddingLeft: 15,
    },
    inputField: {
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        fontSize: 16,
        color: '#FFFFFF',
    },
    iconToggle: {
        padding: 10,
    },
    button: {
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkText: {
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 20,
    },
    linkHighlight: {
        color: '#00c6ff',
        fontWeight: '600',
    },
    backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});
