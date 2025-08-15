import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Options for the selection buttons
const fitnessGoals = ['Weight Loss', 'Endurance', 'Daily Activity'];
const occupationTypes = ['Sedentary', 'Active', 'Very Active'];
const preferredTimes = ['Morning', 'Evening', 'Night'];

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [referralCode, setReferralCode] = useState(''); // For entering someone else's referral code

  // New state for the new fields
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Function to generate a unique referral code
  const generateReferralCode = (username) => {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${username.toUpperCase().slice(0, 4)}${randomNum}`;
  };

  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !username || !age || !gender || !fitnessGoal || !occupation || !preferredTime) {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }
    try {
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
      
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message);
      console.error(error);
    }
  };

  // Helper component for the selection buttons
  const SelectionGroup = ({ title, options, selected, onSelect }) => (
    <View style={styles.selectionContainer}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[styles.option, selected === option && styles.selectedOption]}
            onPress={() => onSelect(option)}>
            <Text style={[styles.optionText, selected === option && styles.selectedOptionText]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      
      <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#999" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <View style={styles.passwordContainer}>
        <TextInput style={styles.passwordInput} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} />
        <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
          <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="#999" style={styles.icon} />
        </Pressable>
      </View>
      <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#999" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Gender" placeholderTextColor="#999" value={gender} onChangeText={setGender} />
      <TextInput 
        style={styles.input} 
        placeholder="Referral Code (Optional)" 
        placeholderTextColor="#999" 
        value={referralCode} 
        onChangeText={setReferralCode}
        autoCapitalize="characters"
      />

      {/* New Selection Groups */}
      <SelectionGroup title="Fitness Goal" options={fitnessGoals} selected={fitnessGoal} onSelect={setFitnessGoal} />
      <SelectionGroup title="Occupation Type" options={occupationTypes} selected={occupation} onSelect={setOccupation} />
      <SelectionGroup title="Preferred Notification Time" options={preferredTimes} selected={preferredTime} onSelect={setPreferredTime} />

      <Pressable style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
    },
    passwordInput: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    icon: {
        padding: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    selectionContainer: {
        marginBottom: 15,
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    option: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    selectedOption: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 14,
    },
    selectedOptionText: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#007AFF',
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
        color: '#007AFF',
        textAlign: 'center',
        marginTop: 20,
        paddingBottom: 20,
    },
});