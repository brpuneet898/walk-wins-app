import React from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSteps } from '../../context/StepContext';
import { useLeaderboard } from '../../context/LeaderboardContext';
// ⭐️ 1. Import Ionicons instead of FontAwesome
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedBackground = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);

  React.useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity2.value = withRepeat(
      withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
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

  return (
    <View style={styles.backgroundContainer} pointerEvents="none">
      <Animated.View style={[styles.circle1, animatedStyle1]} />
      <Animated.View style={[styles.circle2, animatedStyle2]} />
    </View>
  );
};

// Pulsating Live Indicator Component
const PulsatingLiveIndicator = () => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.liveIndicator}>
      <Animated.View style={[styles.liveDot, animatedStyle]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
};

// Gradient Text Component
const GradientText = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <MaskedView maskElement={<Text style={style}>{children}</Text>}>
    <LinearGradient
      colors={['#8BC34A', '#4CAF50']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={[style, { opacity: 0 }]}>{children}</Text>
    </LinearGradient>
  </MaskedView>
);

// Animated Item Component
const AnimatedLeaderboardItem = ({ item, index }: { item: any; index: number }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = index * 100; // Stagger animation
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 100 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.98, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 400 });
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { name: 'trophy', color: '#FFD700', size: 24 }; // Golden
    if (rank === 2) return { name: 'trophy', color: '#C0C0C0', size: 22 }; // Silver
    if (rank === 3) return { name: 'trophy', color: '#CD7F32', size: 20 }; // Bronze
    return null;
  };

  const getRankTextColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#ffffff'; // Default white
  };

  const getUsernameTextColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#ffffff'; // Default white
  };

  const iconData = getRankIcon(item.rank);

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable onPress={handlePress} style={styles.itemContainer}>
        <View style={styles.itemBox}>
          <View style={styles.itemContent}>
            <View style={styles.rankSection}>
              <Text style={[styles.rank, { color: getRankTextColor(item.rank) }]}>
                {item.rank}
              </Text>
              {iconData && (
                <Ionicons 
                  name={iconData.name as any} 
                  size={iconData.size} 
                  color={iconData.color} 
                />
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: getUsernameTextColor(item.rank) }]}>
                {item.username}
              </Text>
            </View>

            <View style={styles.scoreSection}>
              <View style={styles.stepContainer}>
                <Ionicons name="footsteps" size={14} color="#8BC34A" />
                <Text style={styles.steps}>
                  {item.steps.toLocaleString()}
                </Text>
                <Text style={styles.stepsLabel}>steps</Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#8BC34A', '#4CAF50']}
                  style={[styles.progressFill, { width: `${Math.min((item.steps / 10000) * 100, 100)}%` }]}
                />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function LeaderboardScreen() {
  const { leaderboardData } = useLeaderboard();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item, index }: { item: typeof leaderboardData[0]; index: number }) => (
    <AnimatedLeaderboardItem item={item} index={index} />
  );

  return (
    <LinearGradient 
      colors={['#0D1B2A', '#1B263B', '#415A77']} 
      style={styles.container}
    >
      <AnimatedBackground />
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      
      <View style={{
        alignItems: 'center',
        paddingTop: 120 + insets.top,
        paddingBottom: 40,
        paddingHorizontal: 20,
        zIndex: 1,
      }}>
        <View style={styles.headerContent}>
          <GradientText style={styles.header}>Daily Leaderboard</GradientText>
          <PulsatingLiveIndicator />
        </View>
        <View style={styles.headerUnderline} />
        <Text style={styles.headerSubtext}>Top performers today</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <FlatList
          data={leaderboardData}
          renderItem={renderItem}
          keyExtractor={(item) => item.rank.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color="rgba(255,255,255,0.3)" />
              <GradientText style={styles.emptyText}>No one has walked today... yet!</GradientText>
              <Text style={styles.emptySubtext}>Be the first to start walking and claim the crown! 👑</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 90 + insets.bottom + 30, // Tab bar height + bottom inset + buffer
            paddingTop: 20,
          }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
    },
    circle1: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#8BC34A',
    },
    circle2: {
        position: 'absolute',
        bottom: -100,
        right: -100,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#4CAF50',
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 120,
        paddingBottom: 40,
        paddingHorizontal: 20,
        zIndex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginHorizontal: 12,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        marginRight: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    headerUnderline: {
        width: 60,
        height: 3,
        backgroundColor: '#8BC34A',
        borderRadius: 2,
        marginBottom: 8,
    },
    headerSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        zIndex: 1,
    },
    listContent: {
        paddingBottom: 120,
        paddingTop: 20,
    },
    itemContainer: {
        marginBottom: 16,
        borderRadius: 15,
        overflow: 'hidden',
    },
    itemBox: {
        padding: 28,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        minHeight: 90,
        justifyContent: 'center',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rankSection: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 60,
    },
    rankContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rank: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
    medalContainer: {
        marginLeft: 4,
    },
    userInfo: {
        flex: 1,
        marginHorizontal: 16,
        justifyContent: 'center',
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'left',
    },
    scoreSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 100,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    steps: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
        marginRight: 4,
        color: '#8BC34A',
    },
    stepsLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    progressBar: {
        width: 50,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: 12,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        lineHeight: 20,
    },
});