import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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

  // New state for the new fields
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !username || !age || !gender || !fitnessGoal || !occupation || !preferredTime) {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Add the new fields to the user's document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: username,
        age: parseInt(age, 10),
        gender: gender,
        fitnessGoal: fitnessGoal,
        occupation: occupation,
        preferredTime: preferredTime,
        dailyStepGoal: 3000, // Set a default step goal
        totalSteps: 0,
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