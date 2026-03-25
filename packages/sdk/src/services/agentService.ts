import { AppEnv, hasWalletPrivateKey } from "../config/env.js";
import { MarketSnapshot } from "../market/marketTypes.js";
import { ExecutionAuthInput } from "../runtime/agentContext.js";
import { AgentDecision } from "../strategy/strategyTypes.js";
import { DeploymentTargetInput } from "../utils/deployments.js";
import { decideRebalance } from "../strategy/decideRebalance.js";
import { ExecutionService } from "./executionService.js";
import { MarketSnapshotService } from "./marketSnapshotService.js";
import { VaultStateService } from "./vaultStateService.js";

export class AgentService {
  private readonly marketSnapshotService: MarketSnapshotService;
  private readonly vaultStateService: VaultStateService;
  private readonly executionService: ExecutionService;

  constructor(private readonly env: AppEnv) {
    this.marketSnapshotService = new MarketSnapshotService(env);
    this.vaultStateService = new VaultStateService(env);
    this.executionService = new ExecutionService(env);
  }

  async getDecision(options?: {
    marketSnapshot?: MarketSnapshot;
    includeExecutionPreview?: boolean;
    target?: DeploymentTargetInput;
    executionAuth?: ExecutionAuthInput;
  }): Promise<AgentDecision> {
    const market = options?.marketSnapshot ?? await this.marketSnapshotService.getSnapshot();
    const vaultState = await this.vaultStateService.getState(market.price, { target: options?.target });

    const decision = decideRebalance({
      market,
      vaultState,
      minimumRebalanceIntervalSeconds: this.env.MIN_REBALANCE_INTERVAL_SECONDS,
      poolFee: this.env.DEFAULT_POOL_FEE,
      defaultWidthBps: this.env.DEFAULT_PRICE_WIDTH_BPS,
      volatilityThresholdBps: this.env.DEFAULT_VOLATILITY_THRESHOLD_BPS,
      boundaryThresholdBps: this.env.DEFAULT_PRICE_BOUNDARY_BPS
    });

    const includeExecutionPreview = options?.includeExecutionPreview ?? hasWalletPrivateKey(this.env);

    if (includeExecutionPreview && decision.shouldExecute && decision.targetRange) {
      decision.executionPreview = await this.executionService.previewRebalance(
        decision.targetRange.tickLower,
        decision.targetRange.tickUpper,
        market,
        {
          target: options?.target,
          executionAuth: options?.executionAuth
        }
      );
    }

    return decision;
  }
}
