// Level System Configuration and Utilities
export interface LevelInfo {
  level: number;
  requiredSteps: number;
  coinMultiplier: number;
  name: string;
  description: string;
}

// Level configuration - 10 levels total
export const LEVEL_CONFIG: LevelInfo[] = [
  { level: 0, requiredSteps: 0, coinMultiplier: 0.01, name: "Beginner Walker", description: "Just getting started on your walking journey!" },
  { level: 1, requiredSteps: 10000, coinMultiplier: 0.01, name: "Step Explorer", description: "You've taken your first 10,000 steps!" },
  { level: 2, requiredSteps: 50000, coinMultiplier: 0.012, name: "Walking Enthusiast", description: "You're getting serious about walking!" }, // TESTING: Reduced for testing
  { level: 3, requiredSteps: 150000, coinMultiplier: 0.014, name: "Fitness Walker", description: "150,000 steps - your dedication is showing!" },
  { level: 4, requiredSteps: 300000, coinMultiplier: 0.016, name: "Step Master", description: "300,000 steps - you're a walking machine!" },
  { level: 5, requiredSteps: 500000, coinMultiplier: 0.018, name: "Marathon Walker", description: "Half a million steps - incredible commitment!" },
  { level: 6, requiredSteps: 750000, coinMultiplier: 0.020, name: "Walking Champion", description: "750,000 steps - you're a true champion!" },
  { level: 7, requiredSteps: 1000000, coinMultiplier: 0.022, name: "Step Legend", description: "One million steps - legendary achievement!" },
  { level: 8, requiredSteps: 1500000, coinMultiplier: 0.024, name: "Walking Hero", description: "1.5 million steps - you're a walking hero!" },
  { level: 9, requiredSteps: 2000000, coinMultiplier: 0.026, name: "Ultimate Walker", description: "2 million steps - ultimate walking mastery!" },
  { level: 10, requiredSteps: 3000000, coinMultiplier: 0.028, name: "Walking God", description: "3 million steps - you've achieved walking godhood!" }
];

// Calculate user's current level based on lifetime steps
export function calculateUserLevel(lifetimeSteps: number): LevelInfo {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    const level = LEVEL_CONFIG[i];
    if (lifetimeSteps >= level.requiredSteps) {
      return level;
    }
  }
  return LEVEL_CONFIG[0]; // Default to level 0
}

// Get next level info
export function getNextLevel(currentLevel: number): LevelInfo | null {
  if (currentLevel >= 10) return null; // Max level reached
  return LEVEL_CONFIG[currentLevel + 1];
}

// Calculate progress to next level
export function getLevelProgress(lifetimeSteps: number, currentLevel: number): {
  progressSteps: number;
  totalStepsNeeded: number;
  progressPercentage: number;
} {
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) {
    return { progressSteps: 0, totalStepsNeeded: 0, progressPercentage: 100 };
  }

  const currentLevelSteps = LEVEL_CONFIG[currentLevel].requiredSteps;
  const nextLevelSteps = nextLevel.requiredSteps;
  const progressSteps = lifetimeSteps - currentLevelSteps;
  const totalStepsNeeded = nextLevelSteps - currentLevelSteps;
  const progressPercentage = Math.min((progressSteps / totalStepsNeeded) * 100, 100);

  return {
    progressSteps,
    totalStepsNeeded,
    progressPercentage
  };
}

// Calculate coins with level multiplier
export function calculateStepCoins(steps: number, userLevel: number): number {
  const levelInfo = LEVEL_CONFIG[userLevel] || LEVEL_CONFIG[0];
  return steps * levelInfo.coinMultiplier;
}

// Check if user should level up
export function shouldLevelUp(lifetimeSteps: number, currentLevel: number): boolean {
  const calculatedLevel = calculateUserLevel(lifetimeSteps);
  return calculatedLevel.level > currentLevel;
}

// Get level by number
export function getLevelInfo(level: number): LevelInfo {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[0];
}

// Format steps with commas
export function formatSteps(steps: number): string {
  return steps.toLocaleString();
}

// Format coins without currency symbol for level display
export function formatCoins(coins: number): string {
  return coins.toFixed(3);
}
