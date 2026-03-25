import { nearestUsableTick } from "@uniswap/v3-sdk";

export function getTickSpacingForFee(fee: number): number {
  if (fee === 100) {
    return 1;
  }
  if (fee === 500) {
    return 10;
  }
  if (fee === 3000) {
    return 60;
  }
  if (fee === 10000) {
    return 200;
  }

  throw new Error(`Unsupported pool fee: ${fee}`);
}

export function buildCenteredRange(currentTick: number, fee: number, multiplier: number): { tickLower: number; tickUpper: number } {
  const tickSpacing = getTickSpacingForFee(fee);
  const usableTick = nearestUsableTick(currentTick, tickSpacing);
  const normalizedMultiplier = Math.max(5, multiplier);
  return {
    tickLower: usableTick - tickSpacing * normalizedMultiplier,
    tickUpper: usableTick + tickSpacing * normalizedMultiplier
  };
}
