import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useSteps } from '../../context/StepContext'; // Import the context hook

export default function ProfileScreen() {
  const { setIsLoggingOut } = useSteps();
  const user = auth.currentUser;

  const handleLogout = () => {
    // ⭐️ 1. Set the logging out flag to true
    setIsLoggingOut(true);
    // ⭐️ 2. Then, sign the user out
    signOut(auth).catch(error => {
      Alert.alert('Logout Error', error.message);
      // Reset the flag even if logout fails
      setIsLoggingOut(false);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.profileInfo}>
        <Text style={styles.emailLabel}>Logged in as:</Text>
        <Text style={styles.emailText}>{user ? user.email : 'No user'}</Text>
      </View>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    profileInfo: {
        alignItems: 'center',
        marginBottom: 50,
    },
    emailLabel: {
        fontSize: 16,
        color: '#666',
    },
    emailText: {
        fontSize: 20,
        fontWeight: '500',
        marginTop: 5,
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});