import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useSteps } from '../../context/StepContext';
// import { setStringAsync } from 'expo-clipboard';

export default function ProfileScreen() {
  const { setIsLoggingOut } = useSteps();
  const user = auth.currentUser;
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    signOut(auth).catch(error => {
      Alert.alert('Logout Error', error.message);
      setIsLoggingOut(false);
    });
  };

  const copyReferralCode = async () => {
    if (userProfile?.referralCode) {
      // For now, just show the code in an alert - we'll add clipboard later
      Alert.alert('Your Referral Code', userProfile.referralCode, [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.profileInfo}>
        <Text style={styles.emailLabel}>Logged in as:</Text>
        <Text style={styles.emailText}>{user ? user.email : 'No user'}</Text>
        {userProfile?.username && (
          <Text style={styles.usernameText}>@{userProfile.username}</Text>
        )}
      </View>

      {/* Referral Section */}
      <View style={styles.referralSection}>
        <Text style={styles.sectionTitle}>🎁 Referral Program</Text>

        <View style={styles.referralCodeBox}>
          <Text style={styles.referralLabel}>Your Referral Code:</Text>
          <Text style={styles.referralCode}>{userProfile?.referralCode || 'Loading...'}</Text>
          <Pressable style={styles.copyButton} onPress={copyReferralCode}>
            <Text style={styles.copyButtonText}>👁️ View Code</Text>
          </Pressable>
        </View>

        <View style={styles.referralStats}>
          <Text style={styles.statText}>
            👥 People Referred: {userProfile?.totalReferrals || 0}
          </Text>
          <Text style={styles.statText}>
            💰 Referral Bonus: {((userProfile?.totalReferrals || 0) * 10).toFixed(2)} coins
          </Text>
        </View>
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
  usernameText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 5,
  },
  referralSection: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  referralCodeBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  referralLabel: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 5,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: '#28A745',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  referralStats: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 5,
  },
});