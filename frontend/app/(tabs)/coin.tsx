import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSteps } from '../../context/StepContext';

export default function CoinScreen() {
  // Get both lifetimeSteps and dailyRecords from our shared context
  const { lifetimeSteps, dailyRecords } = useSteps();
  const pricePerStep = 0.01;

  const totalEarned = lifetimeSteps * pricePerStep;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Earnings</Text>
      
      <View style={styles.summaryBox}>
        <Text style={styles.totalEarnedText}>Total Earned: ₹{totalEarned}</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        paddingTop: 60,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    summaryBox: {
        padding: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        marginBottom: 30,
        alignItems: 'center',
    },
    rateText: {
        fontSize: 16,
        color: '#666',
    },
    totalEarnedText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    lifetimeStepsText: {
        fontSize: 14,
        color: '#666',
    },
    historyHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    historyDate: {
        fontSize: 16,
    },
    historySteps: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999',
    }
});