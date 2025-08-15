import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSteps } from '../../context/StepContext';
// ⭐️ 1. Import Ionicons instead of FontAwesome
import { Ionicons } from '@expo/vector-icons';

export default function LeaderboardScreen() {
  const { leaderboardData } = useSteps();

  const renderItem = ({ item }: { item: typeof leaderboardData[0] }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.rank}>{item.rank}</Text>
      <Text style={styles.username}>{item.username}</Text>
      
      {/* ⭐️ 2. Use the Ionicons 'flame' icon, which has a nicer design */}
      {item.rank <= 3 && <Ionicons name="flame" size={22} color="#FF5733" />}

      <Text style={styles.steps}>{item.steps} steps</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daily Leaderboard</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.rank.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No one has walked today... yet!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
    header: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    rank: {
        fontSize: 18,
        fontWeight: 'bold',
        width: 40,
    },
    username: {
        fontSize: 18,
        flex: 1,
    },
    steps: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 'auto',
    },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },
});