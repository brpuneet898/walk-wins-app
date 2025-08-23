// Shared earnings calculation used by multiple screens
export function calculateTotalEarnings(
  lifetimeSteps: number = 0,
  coins: number = 0,
  boostSteps: number = 0
): number {
  const validLifetime = Number(lifetimeSteps) || 0;
  const validCoins = Number(coins) || 0;
  const validBoost = Math.max(Number(boostSteps) || 0, 0);

  const normalSteps = Math.max(validLifetime - validBoost, 0);
  const stepEarnings = normalSteps * 0.01 + validBoost * 0.02;
  const total = stepEarnings + validCoins;
  if (isNaN(total) || total < 0) return 0;
  return total;
}
