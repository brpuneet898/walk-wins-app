import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// Helper function to get the date string (e.g., "2025-08-12") in the phone's local timezone
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);

  const lastStepValueFromListener = useRef(0);
  const isInitialized = useRef(false);

  // This useEffect runs only once on app startup to initialize everything
  useEffect(() => {
    let subscription: Pedometer.PedometerListener | null = null;

    const init = async () => {
      // 1. Check for sensor and permissions
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      if (!isAvailable) return;
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') return;

      // 2. Handle the end-of-day data sync for the PREVIOUS day
      await finalizePreviousDaySteps();

      // 3. Load today's steps from local storage
      const todayString = getLocalDateString();
      const storedData = await AsyncStorage.getItem(`dailySteps_${todayString}`);
      const initialTodaysSteps = storedData ? parseInt(storedData, 10) : 0;
      setTodaysSteps(initialTodaysSteps);

      // 4. Start listening for live step updates
      subscription = Pedometer.watchStepCount(result => {
        const currentListenerSteps = result.steps;
        if (!isInitialized.current) {
          lastStepValueFromListener.current = currentListenerSteps;
          isInitialized.current = true;
          return;
        }
        let incrementStep = currentListenerSteps - lastStepValueFromListener.current;
        lastStepValueFromListener.current = currentListenerSteps;
        if (incrementStep < 0) incrementStep = 0; // Handle device reboot
        if (incrementStep > 0) {
          setTodaysSteps(prevSteps => prevSteps + incrementStep);
        }
      });
    };

    init();

    return () => subscription?.remove();
  }, []);

  // This separate useEffect saves to the device's local storage whenever steps change
  useEffect(() => {
    const saveToDevice = async () => {
      const todayString = getLocalDateString();
      await AsyncStorage.setItem(`dailySteps_${todayString}`, String(todaysSteps));
    };
    // Only save after initialization to avoid writing 0 on first render
    if (isInitialized.current) {
      saveToDevice();
    }
  }, [todaysSteps]);

  // This function reads the last synced date and finalizes the previous day if needed
  const finalizePreviousDaySteps = async () => {
    const todayString = getLocalDateString();
    const lastSyncDate = await AsyncStorage.getItem('lastSyncDate');

    // If we've already synced for today, do nothing.
    if (lastSyncDate === todayString) {
      console.log("Already synced for today.");
      return;
    }
    
    // Find the date for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getLocalDateString(yesterday);

    // If the last sync was not for yesterday, there might be a day to finalize
    if (lastSyncDate && lastSyncDate === yesterdayString) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get the step count for the day that needs to be finalized
      const stepsToFinalize = await AsyncStorage.getItem(`dailySteps_${lastSyncDate}`);
      const finalStepCount = stepsToFinalize ? parseInt(stepsToFinalize, 10) : 0;

      if (finalStepCount > 0) {
        try {
          console.log(`Finalizing day ${lastSyncDate} with ${finalStepCount} steps.`);
          const dailyDocRef = doc(db, `users/${currentUser.uid}/dailySteps`, lastSyncDate);
          const userDocRef = doc(db, 'users', currentUser.uid);

          // Get the steps that were already in the DB for that day (if any)
          const dailyDocSnap = await getDoc(dailyDocRef);
          const stepsAlreadyInDb = dailyDocSnap.exists() ? dailyDocSnap.data().steps : 0;
          
          const incrementAmount = finalStepCount - stepsAlreadyInDb;

          if(incrementAmount > 0) {
            // Set the final, definitive step count for that day
            await setDoc(dailyDocRef, { steps: finalStepCount });
            // Increment the lifetime total by only the new steps
            await updateDoc(userDocRef, { lifetimeTotalSteps: increment(incrementAmount) });
            console.log("Successfully finalized previous day to database.");
          }
        } catch (error) {
          console.error("Error finalizing previous day:", error);
        }
      }
    }

    // After attempting to finalize, update the sync date to today
    await AsyncStorage.setItem('lastSyncDate', todayString);
  };

  const handleLogout = () => signOut(auth);
  const formattedStepCount = String(todaysSteps).padStart(4, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Steps</Text>
      <View style={styles.content}>
        {!isPedometerAvailable ? (
          <Text style={styles.infoText}>Pedometer not available.</Text>
        ) : (
          <View style={styles.stepBox}>
            <Text style={styles.stepCount}>{formattedStepCount}</Text>
          </View>
        )}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, alignItems: 'center' },
    header: { fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stepBox: { width: 200, height: 200, borderWidth: 5, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    stepCount: { fontSize: 60, fontWeight: 'bold' },
    infoText: { fontSize: 18, color: '#333', marginTop: 20 },
    logoutButton: { position: 'absolute', bottom: 40, backgroundColor: '#dc3545', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
    logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
