import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSteps } from '../../context/StepContext';
import { useLevelSystem } from '../../context/LevelContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { calculateTotalEarnings } from '../../utils/earnings';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';

// --- START: GradientText Component ---
const GradientText = (props: any) => (
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
  const scale3 = useSharedValue(1);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    scale3.value = withRepeat(
      withTiming(1.1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity2.value = withRepeat(
      withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity3.value = withRepeat(
      withTiming(0.6, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
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

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  return (
    <View style={styles.backgroundContainer} pointerEvents="none">
      <Animated.View style={[styles.circle1, animatedStyle1]} />
      <Animated.View style={[styles.circle2, animatedStyle2]} />
      <Animated.View style={[styles.circle3, animatedStyle3]} />
    </View>
  );
};

export default function RewardsScreen() {
  const { coins = 0, lifetimeSteps = 0, boostSteps = 0 } = useSteps() as any;
  const { currentLevel } = useLevelSystem();
  const [totalEarned, setTotalEarned] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      try {
        setEarningsLoading(true);
        const earned = await calculateTotalEarnings(lifetimeSteps, coins, boostSteps, currentLevel);
        setTotalEarned(earned);
      } catch (error) {
        console.error('Error calculating earnings:', error);
        setTotalEarned(0);
      } finally {
        setEarningsLoading(false);
      }
    };

    loadEarnings();
  }, [lifetimeSteps, coins, boostSteps, currentLevel]);

  const handleRedeem = async () => {
    if (!selectedAmount) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { voucher_amount: selectedAmount });
        Alert.alert(
          'Request Sent',
          'Your request for the gift voucher has been sent. It will be processed within 48 hours.'
        );
        setSelectedAmount(null); // Reset selection after successful submission
      } else {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
      }
    } catch (error) {
      console.error('Error updating voucher amount:', error);
      Alert.alert('Error', 'Failed to submit voucher request. Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B263B', '#415A77']}
      style={styles.container}
    >
      <AnimatedBackground />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <Text style={styles.header}>Rewards Hub</Text>

        {/* Current Points Display */}
        <View style={styles.pointsBox}>
          <IconSymbol name="gift.fill" size={40} color="#FFD700" />
          <Text style={styles.pointsLabel}>Your Total Earnings</Text>
          <View style={styles.earningsContainer}>
            <MaskedView 
              maskElement={
                <Image 
                  source={require('../../assets/images/icon.png')}
                  style={styles.earningsIcon}
                />
              }
            >
              <LinearGradient
                colors={['#00c6ff', '#0072ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.earningsIcon}
              />
            </MaskedView>
            <GradientText style={styles.pointsText}>
              {earningsLoading ? '...' : totalEarned.toFixed(2)}
            </GradientText>
          </View>
          <Text style={styles.pointsSubtext}>From walking & challenges</Text>
        </View>

        {/* Available Rewards Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          
          {/* Reward Items */}
          <TouchableOpacity style={styles.rewardItem}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={styles.rewardGradient}
            >
              <View style={styles.rewardIcon}>
                <IconSymbol name="gift" size={24} color="#8BC34A" />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>Gift Vouchers</Text>
                <Text style={styles.rewardDescription}>Redeem your earnings for gift vouchers</Text>
                <View style={styles.amountButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.amountButton, selectedAmount === 500 && styles.selectedAmountButton, totalEarned < 500 && styles.disabledAmountButton]}
                    onPress={() => totalEarned >= 500 && setSelectedAmount(500)}
                    disabled={totalEarned < 500}
                  >
                    <Text style={styles.amountButtonText}>500</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.amountButton, selectedAmount === 1000 && styles.selectedAmountButton, totalEarned < 1000 && styles.disabledAmountButton]}
                    onPress={() => totalEarned >= 1000 && setSelectedAmount(1000)}
                    disabled={totalEarned < 1000}
                  >
                    <Text style={styles.amountButtonText}>1000</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.amountButton, selectedAmount === 2500 && styles.selectedAmountButton, totalEarned < 2500 && styles.disabledAmountButton]}
                    onPress={() => totalEarned >= 2500 && setSelectedAmount(2500)}
                    disabled={totalEarned < 2500}
                  >
                    <Text style={styles.amountButtonText}>2500</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.redeemButton, !selectedAmount && styles.disabledRedeemButton]}
                onPress={handleRedeem}
                disabled={!selectedAmount}
              >
                <Text style={styles.redeemButtonText}>Redeem</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFD700',
  },
  circle2: {
    position: 'absolute',
    top: 200,
    right: -80,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#8BC34A',
  },
  circle3: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#9C27B0',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#FFFFFF',
  },
  pointsBox: {
    padding: 24,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 20,
    marginBottom: 32,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pointsLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  earningsIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  pointsText: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  pointsSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    marginLeft: 4,
  },
  rewardItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rewardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
    marginRight: 12,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  rewardPrice: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  redeemButton: {
    backgroundColor: '#8BC34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoBox: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 100,
  },
  coinsBreakdownContainer: {
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    marginLeft: 4,
  },
  breakdownCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  breakdownGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  breakdownDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8BC34A',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amountButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedAmountButton: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  disabledAmountButton: {
    opacity: 0.5,
  },
  amountButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledRedeemButton: {
    opacity: 0.5,
  },
});
