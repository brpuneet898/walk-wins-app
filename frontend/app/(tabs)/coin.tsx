import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSteps, checkBoostTime } from '../../context/StepContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
// Make sure you have these packages installed
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

// --- START: GradientText Component ---
// This component applies a gradient to any text passed to it.
const GradientText = (props) => (
  <MaskedView maskElement={<Text {...props} />}>
    <LinearGradient
      colors={['#00c6ff', '#0072ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text {...props} style={[props.style, { opacity: 0 }]} />
    </LinearGradient>
  </MaskedView>
);
// --- END: GradientText Component ---

const AnimatedBackground = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const opacity2 = useSharedValue(0.6);

  useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.2, { duration: 2500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1.2, { duration: 3000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      -1,
      true
    );
    opacity2.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const layers = Array.from({ length: 64 });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View style={[styles.circleContainer, { top: -190, left: -190, width: 400, height: 400 }, animatedStyle1]}>
        {layers.map((_, i) => (
          <View
            key={`c1-${i}`}
            style={{
              position: 'absolute',
              top: i * 1.5,
              left: i * 1.5,
              width: 380 - i * 3,
              height: 380 - i * 3,
              borderRadius: (380 - i * 3) / 2,
              backgroundColor: '#3B82F6',
              opacity: 0.005 + (i * 0.0006),
            }}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.circleContainer, { bottom: -200, right: -200, width: 420, height: 420 }, animatedStyle2]}>
        {layers.map((_, i) => (
          <View
            key={`c2-${i}`}
            style={{
              position: 'absolute',
              top: i * 1.5,
              left: i * 1.5,
              width: 400 - i * 3,
              height: 400 - i * 3,
              borderRadius: (400 - i * 3) / 2,
              backgroundColor: '#22D3EE',
              opacity: 0.005 + (i * 0.0006),
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
};

export default function CoinScreen() {
  const { coins = 0, lifetimeSteps = 0, dailyRecords = [] } = useSteps() as any;
  const pricePerStep = 0.01;
  const stepEarnings = lifetimeSteps * pricePerStep;
  const totalEarned = stepEarnings + (coins || 0);

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <Text style={styles.header}>Your Earning</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total Earned</Text>
        <GradientText style={styles.totalEarnedText}>
          ₹{totalEarned.toFixed(2)}
        </GradientText>
        <Text style={styles.lifetimeStepsText}>Based on {lifetimeSteps} lifetime steps</Text>
      </View>

      <Text style={styles.historyHeader}>Daily History</Text>

      <FlatList
        data={dailyRecords || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{item.id}</Text>
              {item.time ? <Text style={styles.cardTime}>{String(item.time)}</Text> : null}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardSteps}>{item.steps} steps</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No daily records yet.</Text>}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingTop: 60,
    overflow: 'hidden',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  circleContainer: {
    position: 'absolute',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#FFFFFF',
  },
  summaryBox: {
    padding: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
    borderRadius: 20,
    marginBottom: 24,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  totalEarnedText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  lifetimeStepsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFFFFF',
    marginHorizontal: 8,
  },

  /* NEW: Card styles for each daily entry */
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: 'rgba(31, 41, 55, 0.45)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: { flex: 1, paddingRight: 8 },
  cardDate: { fontSize: 16, color: '#E5E7EB', fontWeight: '600' },
  cardTime: { color: '#9CA3AF', fontSize: 12, marginTop: 4},

  cardRight: { alignItems: 'flex-end', minWidth: 110 },
  cardSteps: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },

  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  historyDate: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  historySteps: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#9CA3AF',
  }
});