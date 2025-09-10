import { getLevelInfo } from './levelSystem';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

// Enhanced earnings calculation with level system support
export async function calculateTotalEarnings(
  lifetimeSteps: number = 0,
  coins: number = 0,
  boostSteps: number = 0,
  userLevel: number = 0
): Promise<number> {
  const validLifetime = Number(lifetimeSteps) || 0;
  const validCoins = Number(coins) || 0;
  const validBoost = Math.max(Number(boostSteps) || 0, 0);
  const validLevel = Math.max(Number(userLevel) || 0, 0);

  // Get level-based coin multiplier
  const levelInfo = getLevelInfo(validLevel);
  const coinMultiplier = levelInfo.coinMultiplier;

  const normalSteps = Math.max(validLifetime - validBoost, 0);
  
  // Calculate step earnings with level multiplier
  const stepEarnings = normalSteps * coinMultiplier + validBoost * (coinMultiplier * 2);
  
  // Add bonus coins (referrals, ads, etc.) - these are NOT affected by level
  const total = stepEarnings + validCoins;

  // Subtract transactions (withdrawals/deductions)
  let totalTransactions = 0;
  try {
    const user = auth.currentUser;
    if (user) {
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const querySnapshot = await getDocs(transactionsRef);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalTransactions += Number(data.amount) || 0;
      });
    }
  } catch (error) {
    console.error('Error fetching transactions for earnings calculation:', error);
    // Fall back to original total if query fails
  }

  const finalTotal = total - totalTransactions;
  return Math.max(finalTotal, 0);
}

// Backward compatibility - legacy function without level system
export async function calculateTotalEarningsLegacy(
  lifetimeSteps: number = 0,
  coins: number = 0,
  boostSteps: number = 0
): Promise<number> {
  return await calculateTotalEarnings(lifetimeSteps, coins, boostSteps, 0);
}

// Calculate only step-based earnings with level multiplier
export function calculateStepEarnings(
  lifetimeSteps: number = 0,
  boostSteps: number = 0,
  userLevel: number = 0
): number {
  const validLifetime = Number(lifetimeSteps) || 0;
  const validBoost = Math.max(Number(boostSteps) || 0, 0);
  const validLevel = Math.max(Number(userLevel) || 0, 0);

  const levelInfo = getLevelInfo(validLevel);
  const coinMultiplier = levelInfo.coinMultiplier;

  const normalSteps = Math.max(validLifetime - validBoost, 0);
  const stepEarnings = normalSteps * coinMultiplier + validBoost * (coinMultiplier * 2);
  
  return Math.max(stepEarnings, 0);
}

// Calculate only bonus earnings (referrals, ads, etc.)
export function calculateBonusEarnings(coins: number = 0): number {
  const validCoins = Number(coins) || 0;
  return Math.max(validCoins, 0);
}
