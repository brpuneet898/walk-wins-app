import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; // Corrected path
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const router = useRouter();

  const handleSignUp = async () => {
    // Basic validation
    if (!email || !password || !username || !age || !gender) {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a document for the new user in Firestore with all the new details
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: username,
        age: parseInt(age, 10), // Store age as a number
        gender: gender,
        totalSteps: 0,
        createdAt: new Date(),
      });
      
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message);
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#999" // Add this line for placeholders
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          // Toggle secureTextEntry based on the state
          secureTextEntry={!isPasswordVisible}
        />
        <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
          <Ionicons 
            name={isPasswordVisible ? "eye-off" : "eye"} 
            size={24} 
            color="#999" 
            style={styles.icon}
          />
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Age"
        placeholderTextColor="#999"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Gender"
        placeholderTextColor="#999"
        value={gender}
        onChangeText={setGender}
        autoCapitalize="words"
      />

      <Pressable style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </Pressable>
    </View>
  );
}

// Updated styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        color: '#000',
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
    color: '#000',
    },
    icon: {
      padding: 10,
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
    },
});