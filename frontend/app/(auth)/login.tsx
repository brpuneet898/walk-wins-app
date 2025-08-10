import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On successful login, Firebase automatically handles the session,
      // and the root layout will redirect to the app.
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your email and password.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to WalkWins</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999" // Add this line for placeholders
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

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/signup')}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </Pressable>
    </View>
  );
}

// Add StyleSheet at the bottom
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
        marginBottom: 40,
    },
    input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#000', // Explicitly set the text color
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