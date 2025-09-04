import { getLevelInfo } from './levelSystem';

// Enhanced earnings calculation with level system support
export function calculateTotalEarnings(
  lifetimeSteps: number = 0,
  coins: number = 0,
  boostSteps: number = 0,
  userLevel: number = 0
): number {
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
  
  if (isNaN(total) || total < 0) return 0;
  return total;
}

// Backward compatibility - legacy function without level system
export function calculateTotalEarningsLegacy(
  lifetimeSteps: number = 0,
  coins: number = 0,
  boostSteps: number = 0
): number {
  return calculateTotalEarnings(lifetimeSteps, coins, boostSteps, 0);
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
