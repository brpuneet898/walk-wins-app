import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Make sure Animated is imported from reanimated
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
// --- START: Import react-native-svg ---
// Make sure you have installed this package by running: npx expo install react-native-svg
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
// --- END: Import react-native-svg ---

// --- START: New Logo Component ---
const Logo = ({ width = 40, height = 40 }) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Defs>
            <SvgLinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#00C6FF" />
                <Stop offset="100%" stopColor="#0072FF" />
            </SvgLinearGradient>
        </Defs>
        <Path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="url(#logoGradient)" strokeWidth="1.5"/>
        <Path d="M15.5 10.5C15.5 11.3284 14.8284 12 14 12C13.1716 12 12.5 11.3284 12.5 10.5C12.5 9.67157 13.1716 9 14 9C14.8284 9 15.5 9.67157 15.5 10.5Z" fill="url(#logoGradient)"/>
        <Path d="M8.65186 15.5H12.0519L10.5519 12L12.5519 10L9.55186 8.5L8.05186 11.5L6.55186 10L4.55186 12L5.55186 14H8.65186Z" stroke="url(#logoGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);
// --- END: New Logo Component ---

const AnimatedBackground = memo(() => {
  const translateX1 = useSharedValue(0);
  const translateY1 = useSharedValue(0);
  const translateX2 = useSharedValue(0);
  const translateY2 = useSharedValue(0);

  useEffect(() => {
    const duration1 = 2500;
    const duration2 = 3000;
    translateX1.value = withRepeat(withSequence(withTiming(20, { duration: duration1 }), withTiming(-20, { duration: duration1 })), -1, true);
    translateY1.value = withRepeat(withSequence(withTiming(20, { duration: duration1 + 500 }), withTiming(-20, { duration: duration1 + 500 })), -1, true);
    translateX2.value = withRepeat(withSequence(withTiming(-20, { duration: duration2 }), withTiming(20, { duration: duration2 })), -1, true);
    translateY2.value = withRepeat(withSequence(withTiming(-20, { duration: duration2 + 500 }), withTiming(20, { duration: duration2 + 500 })), -1, true);
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX1.value }, { translateY: translateY1.value }],
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX2.value }, { translateY: translateY2.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.bgCircle, styles.circle1Layer1, animatedStyle1]}>
        {[...Array(15)].map((_, i) => (
          <View key={i} style={[styles.bgCircle, styles[`circle1Layer${i + 2}`]]} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.bgCircle, styles.circle2Layer1, animatedStyle2]}>
        {[...Array(15)].map((_, i) => (
          <View key={i} style={[styles.bgCircle, styles[`circle2Layer${i + 2}`]]} />
        ))}
      </Animated.View>
    </View>
  );
});

const GradientText = memo((props) => {
  return (
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
});

const BrandGradientButton = memo(({ onPress, text }) => (
    <Pressable onPress={onPress}>
        <LinearGradient
            colors={['#00c6ff', '#0072ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}>
            <Text style={styles.buttonText}>{text}</Text>
        </LinearGradient>
    </Pressable>
));


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
        return Alert.alert('Error', 'Please enter both email and password.');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your email and password.');
      console.error(error);
    }
  };

  const isEmailFocused = useSharedValue(false);
  const isPasswordFocused = useSharedValue(false);

  const emailContainerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = withTiming(isEmailFocused.value ? '#00c6ff' : '#4B5563', { duration: 200 });
    const shadowOpacity = withTiming(isEmailFocused.value ? 0.5 : 0, { duration: 200 });
    const shadowRadius = withTiming(isEmailFocused.value ? 5 : 0, { duration: 200 });
    return {
      borderColor,
      shadowOpacity,
      shadowRadius,
      elevation: isEmailFocused.value ? 5 : 0,
    };
  });

  const passwordContainerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = withTiming(isPasswordFocused.value ? '#00c6ff' : '#4B5563', { duration: 200 });
    const shadowOpacity = withTiming(isPasswordFocused.value ? 0.5 : 0, { duration: 200 });
    const shadowRadius = withTiming(isPasswordFocused.value ? 5 : 0, { duration: 200 });
    return {
      borderColor,
      shadowOpacity,
      shadowRadius,
      elevation: isPasswordFocused.value ? 5 : 0,
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      <View style={styles.card}>
        {/* --- START: Updated Title with Logo --- */}
        <View style={styles.titleContainer}>
          <Logo />
          <GradientText style={styles.title}>WalkWins</GradientText>
        </View>
        {/* --- END: Updated Title with Logo --- */}
        <Text style={styles.subtitle}>Welcome back! Let's get moving.</Text>
        
        <Text style={styles.label}>Email</Text>
        <Animated.View style={[styles.inputContainer, emailContainerAnimatedStyle]}>
          <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder=""
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => { isEmailFocused.value = true; }}
            onBlur={() => { isEmailFocused.value = false; }}
          />
        </Animated.View>

        <Text style={styles.label}>Password</Text>
        <Animated.View style={[styles.inputContainer, passwordContainerAnimatedStyle]}>
          <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder=""
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            onFocus={() => { isPasswordFocused.value = true; }}
            onBlur={() => { isPasswordFocused.value = false; }}
          />
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="#6B7280" style={styles.iconToggle} />
          </Pressable>
        </Animated.View>

        <BrandGradientButton onPress={handleLogin} text="Login" />

        <Pressable onPress={() => router.push('/signup')}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkHighlight}>Sign up now</Text></Text>
        </Pressable>
      </View>
    </View>
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
        shadowColor: '#00c6ff',
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
    bgCircle: {
      position: 'absolute',
      borderRadius: 9999,
    },
    circle1Layer1: { top: -170, left: -170, width: 340, height: 340, backgroundColor: 'rgba(0, 198, 255, 0.01)' },
    circle1Layer2: { top: 5, left: 5, width: 330, height: 330, backgroundColor: 'rgba(0, 198, 255, 0.01)' },
    circle1Layer3: { top: 10, left: 10, width: 320, height: 320, backgroundColor: 'rgba(0, 198, 255, 0.01)' },
    circle1Layer4: { top: 15, left: 15, width: 310, height: 310, backgroundColor: 'rgba(0, 198, 255, 0.02)' },
    circle1Layer5: { top: 20, left: 20, width: 300, height: 300, backgroundColor: 'rgba(0, 198, 255, 0.02)' },
    circle1Layer6: { top: 25, left: 25, width: 290, height: 290, backgroundColor: 'rgba(0, 198, 255, 0.02)' },
    circle1Layer7: { top: 30, left: 30, width: 280, height: 280, backgroundColor: 'rgba(0, 198, 255, 0.03)' },
    circle1Layer8: { top: 35, left: 35, width: 270, height: 270, backgroundColor: 'rgba(0, 198, 255, 0.03)' },
    circle1Layer9: { top: 40, left: 40, width: 260, height: 260, backgroundColor: 'rgba(0, 198, 255, 0.03)' },
    circle1Layer10: { top: 45, left: 45, width: 250, height: 250, backgroundColor: 'rgba(0, 198, 255, 0.04)' },
    circle1Layer11: { top: 50, left: 50, width: 240, height: 240, backgroundColor: 'rgba(0, 198, 255, 0.04)' },
    circle1Layer12: { top: 55, left: 55, width: 230, height: 230, backgroundColor: 'rgba(0, 198, 255, 0.04)' },
    circle1Layer13: { top: 60, left: 60, width: 220, height: 220, backgroundColor: 'rgba(0, 198, 255, 0.05)' },
    circle1Layer14: { top: 65, left: 65, width: 210, height: 210, backgroundColor: 'rgba(0, 198, 255, 0.05)' },
    circle1Layer15: { top: 70, left: 70, width: 200, height: 200, backgroundColor: 'rgba(0, 198, 255, 0.06)' },
    circle1Layer16: { top: 75, left: 75, width: 190, height: 190, backgroundColor: 'rgba(0, 198, 255, 0.07)' },
    circle2Layer1: { bottom: -190, right: -190, width: 380, height: 380, backgroundColor: 'rgba(0, 114, 255, 0.01)' },
    circle2Layer2: { top: 5, left: 5, width: 370, height: 370, backgroundColor: 'rgba(0, 114, 255, 0.01)' },
    circle2Layer3: { top: 10, left: 10, width: 360, height: 360, backgroundColor: 'rgba(0, 114, 255, 0.01)' },
    circle2Layer4: { top: 15, left: 15, width: 350, height: 350, backgroundColor: 'rgba(0, 114, 255, 0.02)' },
    circle2Layer5: { top: 20, left: 20, width: 340, height: 340, backgroundColor: 'rgba(0, 114, 255, 0.02)' },
    circle2Layer6: { top: 25, left: 25, width: 330, height: 330, backgroundColor: 'rgba(0, 114, 255, 0.02)' },
    circle2Layer7: { top: 30, left: 30, width: 320, height: 320, backgroundColor: 'rgba(0, 114, 255, 0.03)' },
    circle2Layer8: { top: 35, left: 35, width: 310, height: 310, backgroundColor: 'rgba(0, 114, 255, 0.03)' },
    circle2Layer9: { top: 40, left: 40, width: 300, height: 300, backgroundColor: 'rgba(0, 114, 255, 0.03)' },
    circle2Layer10: { top: 45, left: 45, width: 290, height: 290, backgroundColor: 'rgba(0, 114, 255, 0.04)' },
    circle2Layer11: { top: 50, left: 50, width: 280, height: 280, backgroundColor: 'rgba(0, 114, 255, 0.04)' },
    circle2Layer12: { top: 55, left: 55, width: 270, height: 270, backgroundColor: 'rgba(0, 114, 255, 0.04)' },
    circle2Layer13: { top: 60, left: 60, width: 260, height: 260, backgroundColor: 'rgba(0, 114, 255, 0.05)' },
    circle2Layer14: { top: 65, left: 65, width: 250, height: 250, backgroundColor: 'rgba(0, 114, 255, 0.05)' },
    circle2Layer15: { top: 70, left: 70, width: 240, height: 240, backgroundColor: 'rgba(0, 114, 255, 0.06)' },
    circle2Layer16: { top: 75, left: 75, width: 230, height: 230, backgroundColor: 'rgba(0, 114, 255, 0.07)' },
});
