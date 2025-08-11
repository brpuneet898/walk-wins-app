import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function CoinScreen() {
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [dailyRecords, setDailyRecords] = useState([]);
  // --- THIS IS THE KEY CHANGE ---
  // The loading state now only controls the very first load.
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const isFocused = useIsFocused();
  const pricePerStep = 0.01;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsInitialLoading(false); // Stop loading if no user
          return;
        }

        // Fetch lifetime steps from the main user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setLifetimeSteps(userDoc.data().lifetimeTotalSteps || 0);
        }

        // Fetch date-wise step records from the subcollection
        const dailyStepsRef = collection(db, `users/${currentUser.uid}/dailySteps`);
        const q = query(dailyStepsRef, orderBy('__name__', 'desc'));
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setDailyRecords(records);

      } catch (error) {
        Alert.alert('Error', 'Could not fetch your data.');
      } finally {
        // Always turn off the initial loading spinner after the first fetch
        if (isInitialLoading) {
          setIsInitialLoading(false);
        }
      }
    };

    // When the screen is focused, fetch the latest data from the database
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  // useMemo prevents re-calculating the earnings unless the lifetimeSteps actually change
  const totalEarned = useMemo(() => {
    return lifetimeSteps * pricePerStep;
  }, [lifetimeSteps]);

  // If it's the initial load, show the spinner.
  if (isInitialLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  // Otherwise, show the content. It will update seamlessly when new data arrives.
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Earnings</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.totalEarnedText}>Total Coins: {totalEarned.toFixed(2)}</Text>
        <Text style={styles.lifetimeStepsText}>Based on {lifetimeSteps} lifetime steps</Text>
      </View>
      <Text style={styles.historyHeader}>Daily History</Text>
      <FlatList
        data={dailyRecords}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={styles.historyDate}>{item.id}</Text>
            <Text style={styles.historySteps}>{item.steps} steps</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No daily records yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
    loader: { flex: 1, justifyContent: 'center' },
    header: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    summaryBox: { padding: 20, backgroundColor: '#f0f0f0', borderRadius: 10, marginBottom: 30, alignItems: 'center' },
    totalEarnedText: { fontSize: 28, fontWeight: 'bold', marginVertical: 5 },
    lifetimeStepsText: { fontSize: 14, color: '#666' },
    historyHeader: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    historyDate: { fontSize: 16 },
    historySteps: { fontSize: 16, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#999' }
});
