import { ExecutionPreview } from "../services/executionService.js";
import { MarketSnapshot } from "../market/marketTypes.js";
import { VaultState } from "../services/vaultStateService.js";

export type AgentAction = "HOLD" | "REBALANCE_SHIFT_UP" | "REBALANCE_SHIFT_DOWN" | "REBALANCE_WIDER" | "REBALANCE_NARROWER";

export interface RebalanceDecisionInput {
  market: MarketSnapshot;
  vaultState: VaultState;
  minimumRebalanceIntervalSeconds: number;
  poolFee: number;
  defaultWidthBps: number;
  volatilityThresholdBps: number;
  boundaryThresholdBps: number;
}

export interface AgentDecision {
  action: AgentAction;
  targetRange: {
    tickLower: number;
    tickUpper: number;
  } | null;
  confidence: number;
  reason: string[];
  shouldExecute: boolean;
  executionPreview?: ExecutionPreview;
}
