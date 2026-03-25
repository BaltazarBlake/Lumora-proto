import { buildCenteredRange, getTickSpacingForFee } from "../utils/uniswap.js";
import { AgentDecision, RebalanceDecisionInput } from "./strategyTypes.js";

export function decideRebalance(input: RebalanceDecisionInput): AgentDecision {
  const { market, vaultState } = input;
  const rangeWidth = Math.max(1, vaultState.position.tickUpper - vaultState.position.tickLower);
  const distanceToUpper = (vaultState.position.tickUpper - vaultState.position.currentTick) / rangeWidth;
  const distanceToLower = (vaultState.position.currentTick - vaultState.position.tickLower) / rangeWidth;
  const nearBoundaryThreshold = input.boundaryThresholdBps / 10_000;
  const highVolatility = market.volatility >= input.volatilityThresholdBps / 10_000;
  const enoughTime = Date.now() / 1000 - vaultState.lastRebalanceAt >= input.minimumRebalanceIntervalSeconds;
  const widthMultiplier = Math.max(5, Math.round(input.defaultWidthBps / 150));
  const tickSpacing = getTickSpacingForFee(input.poolFee);
  const currentCentered = buildCenteredRange(vaultState.position.currentTick, input.poolFee, widthMultiplier);

  if (!vaultState.position.tokenId || vaultState.position.tokenId === "0") {
    return {
      action: "HOLD",
      targetRange: null,
      confidence: 0.2,
      reason: ["no active position found"],
      shouldExecute: false
    };
  }

  if (!enoughTime) {
    return {
      action: "HOLD",
      targetRange: null,
      confidence: 0.3,
      reason: ["minimum rebalance interval not reached"],
      shouldExecute: false
    };
  }

  if (!vaultState.position.inRange) {
    return {
      action: "REBALANCE_SHIFT_UP",
      targetRange: currentCentered,
      confidence: 0.92,
      reason: ["position is out of range", "re-center around current market tick"],
      shouldExecute: true
    };
  }

  if (distanceToUpper <= nearBoundaryThreshold) {
    const shift = {
      tickLower: currentCentered.tickLower + tickSpacing * 2,
      tickUpper: currentCentered.tickUpper + tickSpacing * 2
    };
    const widened = highVolatility
      ? buildCenteredRange(vaultState.position.currentTick, input.poolFee, widthMultiplier + 3)
      : shift;

    return {
      action: highVolatility ? "REBALANCE_WIDER" : "REBALANCE_SHIFT_UP",
      targetRange: widened,
      confidence: highVolatility ? 0.88 : 0.76,
      reason: [
        "price is close to upper boundary",
        highVolatility ? "volatility is elevated, widening range" : "shift range upward to stay in range"
      ],
      shouldExecute: true
    };
  }

  if (distanceToLower <= nearBoundaryThreshold) {
    const shift = {
      tickLower: currentCentered.tickLower - tickSpacing * 2,
      tickUpper: currentCentered.tickUpper - tickSpacing * 2
    };
    const widened = highVolatility
      ? buildCenteredRange(vaultState.position.currentTick, input.poolFee, widthMultiplier + 3)
      : shift;

    return {
      action: highVolatility ? "REBALANCE_WIDER" : "REBALANCE_SHIFT_DOWN",
      targetRange: widened,
      confidence: highVolatility ? 0.88 : 0.76,
      reason: [
        "price is close to lower boundary",
        highVolatility ? "volatility is elevated, widening range" : "shift range downward to stay in range"
      ],
      shouldExecute: true
    };
  }

  if (highVolatility && market.emaShort > market.emaLong) {
    return {
      action: "REBALANCE_WIDER",
      targetRange: buildCenteredRange(vaultState.position.currentTick, input.poolFee, widthMultiplier + 2),
      confidence: 0.65,
      reason: ["volatility has risen", "market trend remains upward"],
      shouldExecute: true
    };
  }

  return {
    action: "HOLD",
    targetRange: null,
    confidence: 0.54,
    reason: ["position remains healthy inside the active range"],
    shouldExecute: false
  };
}
