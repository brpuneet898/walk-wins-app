import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pedometer } from 'expo-sensors';

export default function HomeScreen() {
  // State to hold the current step count
  const [stepCount, setStepCount] = useState(0);

  useEffect(() => {
    let subscription;

    const subscribe = async () => {
      // Check if the pedometer is available on the device
      const isAvailable = await Pedometer.isAvailableAsync();

      if (isAvailable) {
        // Request permission to access motion activity
        const { status } = await Pedometer.requestPermissionsAsync();

        if (status === 'granted') {
          // Start listening for step count updates
          subscription = Pedometer.watchStepCount(result => {
            setStepCount(result.steps);
          });
        }
      }
    };

    // Start the subscription
    subscribe();

    // Cleanup function to remove the subscription when the component is unmounted
    return () => subscription && subscription.remove();
  }, []);

  // Constants for pricing
  const pricePerStep = 1;
  const totalEarned = stepCount * pricePerStep;

  // Format the step count to always have at least 4 digits (e.g., 0005)
  const formattedStepCount = String(stepCount).padStart(4, '0');

  return (
    <View style={styles.container}>
      {/* App title at the top */}
      <Text style={styles.header}>WalkWins</Text>

      {/* Main content area */}
      <View style={styles.content}>
        {/* The square box for the step counter */}
        <View style={styles.stepBox}>
          <Text style={styles.stepCount}>{formattedStepCount}</Text>
        </View>

        {/* Pricing information */}
        <Text style={styles.infoText}>1 step = {pricePerStep} rupee</Text>

        {/* Total earned calculation */}
        <Text style={styles.totalText}>
          Total Earned: {totalEarned} rupees
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60, // Pushes the header down from the status bar
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center', // Centers the header text
    marginBottom: 40, // Adds space below the header
  },
  content: {
    flex: 1,
    alignItems: 'center', // Centers the content horizontally
    justifyContent: 'center', // Centers the content vertically
  },
  stepBox: {
    width: 200,
    height: 200,
    borderWidth: 5,
    borderColor: '#000',
    borderRadius: 20,
    justifyContent: 'center', // Centers the counter vertically inside the box
    alignItems: 'center',    // Centers the counter horizontally inside the box
    marginBottom: 30, // Adds space below the box
  },
  stepCount: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#000',
  },
  infoText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  totalText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
});