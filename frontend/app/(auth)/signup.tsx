import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
// @ts-ignore - firebaseConfig is a JS file without types
import { auth, db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSpring, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';

// Options for the selection buttons
const fitnessGoals = ['Weight Loss', 'Endurance', 'Daily Activity'];
const occupationTypes = ['Sedentary', 'Active', 'Very Active'];
const preferredTimes = ['Morning', 'Evening', 'Night'];
const genderOptions = ['Male', 'Female', 'Prefer not to say'];

// Logo Component
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

// Animated Background Component
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

// Gradient Text Component
const GradientText = memo((props: any) => {
  return (
    <MaskedView maskElement={<Text {...props} />}>
      <LinearGradient
        colors={['#5EA02A', '#8BC34A', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
});

// Animated Button Component
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

// Simple non-animated SelectionOption to avoid hook issues
const SelectionOption = ({ option, isSelected, onSelect }: {
  option: string;
  isSelected: boolean;
  onSelect: (option: string) => void;
}) => {
  return (
    <Pressable
      onPress={() => onSelect(option)}
      style={{ flex: 1, marginHorizontal: 4 }}
    >
      <LinearGradient
        colors={isSelected ? ['#6FAF2D', '#8BC34A'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={[styles.option, isSelected && styles.selectedOption]}
      >
        <Text 
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
          numberOfLines={2}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
          {option}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [referralCode, setReferralCode] = useState(''); // For entering someone else's referral code
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);

  // New state for the new fields
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Animation values for input focus
  const emailFocused = useSharedValue(false);
  const passwordFocused = useSharedValue(false);
  const usernameFocused = useSharedValue(false);
  const ageFocused = useSharedValue(false);
  const genderFocused = useSharedValue(false);
  const referralFocused = useSharedValue(false);

  // Function to generate a unique referral code
  const generateReferralCode = (username: string) => {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${username.toUpperCase().slice(0, 4)}${randomNum}`;
  };

  const router = useRouter();

  // Navigation functions
  const handleNext = () => {
    // No validation - allow user to go to next step regardless
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSignUp = async () => {
    // Validate ALL fields from both steps
    if (!username || !email || !password || !age || !gender || !fitnessGoal || !occupation || !preferredTime) {
      Alert.alert('Missing Fields', 'Please fill in all details from both steps to create your account.');
      return;
    }
    try {
      // @ts-ignore - auth is imported from a JS config file
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate unique referral code for this user
      const userReferralCode = generateReferralCode(username);

      // Check if someone referred this user and give both users 10 coins
      let referredByUser = null;
      let initialCoins = 0;
      
      if (referralCode.trim()) {
        // Find the user who owns this referral code
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', referralCode.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          referredByUser = referrerDoc.id;
          initialCoins = 10; // New user gets 10 coins
          
          // Give 10 coins to the referrer
          await updateDoc(referrerDoc.ref, {
            coins: increment(10),
            totalReferrals: increment(1)
          });
          
          console.log('Referral bonus applied!');
        } else {
          Alert.alert('Invalid Referral Code', 'The referral code you entered is not valid.');
        }
      }

      // Add the new fields to the user's document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: username,
        age: parseInt(age, 10),
        gender: gender,
        fitnessGoal: fitnessGoal,
        occupation: occupation,
        preferredTime: preferredTime,
        dailyStepGoal: 3000,
        totalSteps: 0,
        coins: initialCoins, // Start with 0 or 10 coins if referred
        referralCode: userReferralCode, // User's own referral code
        referredBy: referredByUser, // Who referred this user (if any)
        totalReferrals: 0, // How many people this user has referred
        createdAt: new Date(),
      });
      
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
      console.error(error);
    }
  };

  // Create animated input style function
  const createInputAnimatedStyle = (focusedValue: any) => {
    return useAnimatedStyle(() => {
      const borderColor = withTiming(focusedValue.value ? '#8BC34A' : '#4B5563', { duration: 200 });
      const shadowOpacity = withTiming(focusedValue.value ? 0.45 : 0, { duration: 200 });
      const shadowRadius = withTiming(focusedValue.value ? 6 : 0, { duration: 200 });
      return {
        borderColor,
        shadowOpacity,
        shadowRadius,
        elevation: focusedValue.value ? 5 : 0,
      };
    });
  };

  // Helper component for the selection buttons with animations
  const SelectionGroup = ({ title, options, selected, onSelect }: {
    title: string;
    options: string[];
    selected: string;
    onSelect: (option: string) => void;
  }) => {
    return (
      <View style={styles.selectionContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = selected === option;
            
            return (
              <SelectionOption
                key={option}
                option={option}
                isSelected={isSelected}
                onSelect={onSelect}
              />
            );
          })}
        </View>
      </View>
    );
  };
  return (
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
      emailFocused.value = false;
      passwordFocused.value = false;
      usernameFocused.value = false;
      ageFocused.value = false;
      genderFocused.value = false;
      referralFocused.value = false;
    }}>
      <LinearGradient colors={['#0D1B2A', '#1B263B', '#415A77']} style={styles.container}>
        <AnimatedBackground />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Header with Logo */}
            <View style={styles.titleContainer}>
              <Logo />
              <GradientText style={styles.title}>Join WalkWins</GradientText>
            </View>
            <Text style={styles.subtitle}>
              {currentStep === 1 ? 'Start your fitness journey today!' : 'Complete your profile'}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View style={styles.progressBarFill}>
                  <LinearGradient
                    colors={['#6FAF2D', '#8BC34A', '#4CAF50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressGradient,
                      { width: currentStep === 1 ? '50%' : '100%' }
                    ]}
                  />
                </Animated.View>
              </View>
            </View>
            
            {/* STEP 1: Basic Information */}
            <View style={currentStep === 1 ? {} : { display: 'none' }}>
              {/* Username Input */}
              <Text style={styles.label}>Username</Text>
              <Animated.View style={[styles.inputContainer, createInputAnimatedStyle(usernameFocused)]}>
                <Ionicons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter username" 
                  placeholderTextColor="#6B7280" 
                  value={username} 
                  onChangeText={setUsername}
                  onFocus={() => { usernameFocused.value = true; }}
                  onBlur={() => { usernameFocused.value = false; }}
                />
              </Animated.View>

              {/* Email Input */}
              <Text style={styles.label}>Email</Text>
              <Animated.View style={[styles.inputContainer, createInputAnimatedStyle(emailFocused)]}>
                <Ionicons name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter email" 
                  placeholderTextColor="#6B7280" 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  onFocus={() => { emailFocused.value = true; }}
                  onBlur={() => { emailFocused.value = false; }}
                />
              </Animated.View>

              {/* Password Input */}
              <Text style={styles.label}>Password</Text>
              <Animated.View style={[styles.inputContainer, createInputAnimatedStyle(passwordFocused)]}>
                <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.passwordInput} 
                  placeholder="Enter password" 
                  placeholderTextColor="#6B7280" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!isPasswordVisible}
                  onFocus={() => { passwordFocused.value = true; }}
                  onBlur={() => { passwordFocused.value = false; }}
                />
                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                  <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="#9CA3AF" style={styles.icon} />
                </Pressable>
              </Animated.View>

              {/* Referral Code Input */}
              <Text style={styles.label}>Referral Code (Optional)</Text>
              <Animated.View style={[styles.inputContainer, createInputAnimatedStyle(referralFocused)]}>
                <Ionicons name="gift" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter referral code" 
                  placeholderTextColor="#6B7280" 
                  value={referralCode} 
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  onFocus={() => { referralFocused.value = true; }}
                  onBlur={() => { referralFocused.value = false; }}
                />
              </Animated.View>

              {/* Next Button */}
              <BrandGradientButton onPress={handleNext} text="Next" />

              {/* Login Link */}
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkHighlight}>Login</Text>
                </Text>
              </Pressable>
            </View>

            {/* STEP 2: Additional Information */}
            <View style={currentStep === 2 ? {} : { display: 'none' }}>
              <ScrollView 
                style={styles.step2ScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {/* Age Input */}
                <Text style={styles.label}>Age</Text>
                <Animated.View style={[styles.inputContainer, createInputAnimatedStyle(ageFocused)]}>
                  <Ionicons name="calendar" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter age" 
                    placeholderTextColor="#6B7280" 
                    value={age} 
                    onChangeText={setAge} 
                    keyboardType="numeric"
                    onFocus={() => { ageFocused.value = true; }}
                    onBlur={() => { ageFocused.value = false; }}
                  />
                </Animated.View>

                {/* Gender Dropdown */}
                <Text style={styles.label}>Gender</Text>
                <View style={styles.dropdownContainer}>
                  <Pressable 
                    style={[styles.dropdownButton, isGenderDropdownOpen && styles.dropdownButtonActive]}
                    onPress={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                  >
                    <Ionicons name="people" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <Text style={[styles.dropdownText, !gender && styles.placeholderText]}>
                      {gender || 'Select gender'}
                    </Text>
                    <Ionicons 
                      name={isGenderDropdownOpen ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#9CA3AF" 
                      style={styles.icon} 
                    />
                  </Pressable>
                  
                  {isGenderDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {genderOptions.map((option, index) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.dropdownOption,
                            index === genderOptions.length - 1 && styles.lastDropdownOption
                          ]}
                          onPress={() => {
                            setGender(option);
                            setIsGenderDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* Selection Groups */}
                <SelectionGroup title="Fitness Goal" options={fitnessGoals} selected={fitnessGoal} onSelect={setFitnessGoal} />
                <SelectionGroup title="Occupation Type" options={occupationTypes} selected={occupation} onSelect={setOccupation} />
                <SelectionGroup title="Preferred Notification Time" options={preferredTimes} selected={preferredTime} onSelect={setPreferredTime} />
              </ScrollView>

              {/* Action Buttons - Fixed at bottom */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <View style={styles.buttonSpacer} />
                <Pressable style={styles.createAccountButton} onPress={handleSignUp}>
                  <LinearGradient
                    colors={['#6FAF2D', '#8BC34A', '#4CAF50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createAccountGradient}
                  >
                    <Text style={styles.createAccountText}>Create Account</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f192eff',
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.7)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#9CA3AF',
    marginBottom: 24,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f192eff',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 0 },
  },
  inputIcon: {
    paddingLeft: 15,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  icon: {
    padding: 10,
  },
  selectionContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  option: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.7)',
    minHeight: 45,
  },
  selectedOption: {
    borderColor: '#8BC34A',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
    fontSize: 16,
  },
  linkHighlight: {
    color: '#8BC34A',
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  activeStepDot: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  progressBarBackground: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
  },
  progressGradient: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSpacer: {
    width: 12,
  },
  createButtonContainer: {
    flex: 2,
  },
  createAccountButton: {
    flex: 2,
  },
  createAccountGradient: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  step2ScrollView: {
    maxHeight: 300,
    marginBottom: 10,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f192eff',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 8,
    height: 50,
  },
  dropdownButtonActive: {
    borderColor: '#8BC34A',
  },
  dropdownText: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#6B7280',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 8,
    marginTop: 2,
    zIndex: 1001,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  lastDropdownOption: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});