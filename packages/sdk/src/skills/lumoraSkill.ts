import { z } from "zod";

import { AppEnv, hasOkxCredentials } from "../config/env.js";
import { MarketSnapshot } from "../market/marketTypes.js";
import {
  deploymentTargetSchema,
  executionAuthSchema,
  ExecutionAuthInput,
  resolveExecutionPolicy
} from "../runtime/agentContext.js";
import { AgentHistoryEntry, AgentHistoryService } from "../services/agentHistoryService.js";
import { AgentService } from "../services/agentService.js";
import { ExecutionPreview, ExecutionService, RebalanceExecutionResult } from "../services/executionService.js";
import { MarketSnapshotService } from "../services/marketSnapshotService.js";
import { VaultState, VaultStateService } from "../services/vaultStateService.js";
import { AgentDecision } from "../strategy/strategyTypes.js";
import { deriveDeploymentNamespace } from "../utils/deployments.js";

export const LUMORA_SKILL_NAME = "lumora";

const pairSchema = z.literal("WETH-STK");

const manualRangeSchema = z.object({
  tickLower: z.number().int(),
  tickUpper: z.number().int()
});

const resultOptionsSchema = z.object({
  includeMarketHistory: z.boolean().optional().default(true),
  includeExecutionPreview: z.boolean().optional(),
  writeHistory: z.boolean().optional().default(true)
}).optional().default({});

const marketSnapshotOperationSchema = z.object({
  operation: z.literal("market_snapshot"),
  pair: pairSchema.optional().default("WETH-STK"),
  target: deploymentTargetSchema,
  options: resultOptionsSchema
});

const vaultStateOperationSchema = z.object({
  operation: z.literal("vault_state"),
  marketPriceUsd: z.number().optional(),
  target: deploymentTargetSchema
});

const decisionOperationSchema = z.object({
  operation: z.literal("decision"),
  pair: pairSchema.optional().default("WETH-STK"),
  target: deploymentTargetSchema,
  auth: executionAuthSchema,
  options: resultOptionsSchema
});

const previewAgentOperationSchema = z.object({
  operation: z.literal("preview_rebalance"),
  pair: pairSchema.optional().default("WETH-STK"),
  mode: z.literal("agent"),
  target: deploymentTargetSchema,
  auth: executionAuthSchema,
  options: resultOptionsSchema
});

const previewManualOperationSchema = z.object({
  operation: z.literal("preview_rebalance"),
  pair: pairSchema.optional().default("WETH-STK"),
  mode: z.literal("manual"),
  manualRange: manualRangeSchema,
  target: deploymentTargetSchema,
  auth: executionAuthSchema,
  reason: z.string().optional(),
  options: resultOptionsSchema
});

const executeAgentOperationSchema = z.object({
  operation: z.literal("execute_rebalance"),
  pair: pairSchema.optional().default("WETH-STK"),
  mode: z.literal("agent"),
  target: deploymentTargetSchema,
  auth: executionAuthSchema,
  options: resultOptionsSchema
});

const executeManualOperationSchema = z.object({
  operation: z.literal("execute_rebalance"),
  pair: pairSchema.optional().default("WETH-STK"),
  mode: z.literal("manual"),
  manualRange: manualRangeSchema,
  target: deploymentTargetSchema,
  auth: executionAuthSchema,
  reason: z.string().optional(),
  options: resultOptionsSchema
});

const historyOperationSchema = z.object({
  operation: z.literal("history"),
  target: deploymentTargetSchema,
  limit: z.number().int().positive().max(100).optional().default(20)
});

export const lumoraSkillInputSchema = z.union([
  marketSnapshotOperationSchema,
  vaultStateOperationSchema,
  decisionOperationSchema,
  previewAgentOperationSchema,
  previewManualOperationSchema,
  executeAgentOperationSchema,
  executeManualOperationSchema,
  historyOperationSchema
]);

export type LumoraSkillInput = z.infer<typeof lumoraSkillInputSchema>;

export interface LumoraSkillOutput {
  ok: true;
  skill: typeof LUMORA_SKILL_NAME;
  operation: LumoraSkillInput["operation"];
  pair?: "WETH-STK";
  mode?: "agent" | "manual";
  market?: MarketSnapshot;
  vaultState?: VaultState;
  decision?: AgentDecision;
  executionPreview?: ExecutionPreview | null;
  execution?: RebalanceExecutionResult | null;
  history?: {
    items: AgentHistoryEntry[];
  };
}

interface SkillDependencies {
  marketSnapshotService: MarketSnapshotService;
  vaultStateService: VaultStateService;
  agentService: AgentService;
  executionService: ExecutionService;
  agentHistoryService: AgentHistoryService;
}

export class LumoraSkill {
  private readonly marketSnapshotService: MarketSnapshotService;
  private readonly vaultStateService: VaultStateService;
  private readonly agentService: AgentService;
  private readonly executionService: ExecutionService;
  private readonly agentHistoryService: AgentHistoryService;

  constructor(private readonly env: AppEnv, dependencies: Partial<SkillDependencies> = {}) {
    this.marketSnapshotService = dependencies.marketSnapshotService ?? new MarketSnapshotService(env);
    this.vaultStateService = dependencies.vaultStateService ?? new VaultStateService(env);
    this.agentService = dependencies.agentService ?? new AgentService(env);
    this.executionService = dependencies.executionService ?? new ExecutionService(env);
    this.agentHistoryService = dependencies.agentHistoryService ?? new AgentHistoryService(env);
  }

  async invoke(input: LumoraSkillInput): Promise<LumoraSkillOutput> {
    switch (input.operation) {
      case "market_snapshot":
        return this.runMarketSnapshot(input);
      case "vault_state":
        return this.runVaultState(input);
      case "decision":
        return this.runDecision(input);
      case "preview_rebalance":
        return input.mode === "agent"
          ? this.runAgentRebalance(input, true)
          : this.runManualRebalance(input, true);
      case "execute_rebalance":
        return input.mode === "agent"
          ? this.runAgentRebalance(input, false)
          : this.runManualRebalance(input, false);
      case "history":
        return this.runHistory(input);
    }
  }

  private async runMarketSnapshot(
    input: Extract<LumoraSkillInput, { operation: "market_snapshot" }>
  ): Promise<LumoraSkillOutput> {
    const market = await this.marketSnapshotService.getSnapshot();

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      pair: input.pair,
      market: this.includeMarketHistory(market, input.options.includeMarketHistory)
    };
  }

  private async runVaultState(
    input: Extract<LumoraSkillInput, { operation: "vault_state" }>
  ): Promise<LumoraSkillOutput> {
    const vaultState = await this.vaultStateService.getState(input.marketPriceUsd, { target: input.target });

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      vaultState
    };
  }

  private async runDecision(
    input: Extract<LumoraSkillInput, { operation: "decision" }>
  ): Promise<LumoraSkillOutput> {
    const market = await this.marketSnapshotService.getSnapshot();
    const vaultState = await this.vaultStateService.getState(market.price, { target: input.target });
    const decision = await this.agentService.getDecision({
      marketSnapshot: market,
      includeExecutionPreview: input.options.includeExecutionPreview,
      target: input.target,
      executionAuth: input.auth
    });

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      pair: input.pair,
      market: this.includeMarketHistory(market, input.options.includeMarketHistory),
      vaultState,
      decision,
      executionPreview: decision.executionPreview ?? null
    };
  }

  private async runAgentRebalance(
    input: Extract<LumoraSkillInput, { operation: "preview_rebalance" | "execute_rebalance"; mode: "agent" }>,
    dryRun: boolean
  ): Promise<LumoraSkillOutput> {
    const market = await this.marketSnapshotService.getSnapshot();
    const vaultState = await this.vaultStateService.getState(market.price, { target: input.target });
    const decision = await this.agentService.getDecision({
      marketSnapshot: market,
      includeExecutionPreview: false,
      target: input.target,
      executionAuth: input.auth
    });

    if (!decision.targetRange) {
      return {
        ok: true,
        skill: LUMORA_SKILL_NAME,
        operation: input.operation,
        pair: input.pair,
        mode: input.mode,
        market: this.includeMarketHistory(market, input.options.includeMarketHistory),
        vaultState,
        decision,
        executionPreview: decision.executionPreview ?? null,
        execution: null
      };
    }

    const execution = await this.executionService.executeRebalance({
      tickLower: decision.targetRange.tickLower,
      tickUpper: decision.targetRange.tickUpper,
      dryRun,
      reason: decision.reason,
      marketSnapshot: market,
      writeHistory: input.options.writeHistory,
      target: input.target,
      executionAuth: input.auth
    });

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      pair: input.pair,
      mode: input.mode,
      market: this.includeMarketHistory(market, input.options.includeMarketHistory),
      vaultState,
      decision,
      executionPreview: execution.executionPreview,
      execution
    };
  }

  private async runManualRebalance(
    input: Extract<LumoraSkillInput, { operation: "preview_rebalance" | "execute_rebalance"; mode: "manual" }>,
    dryRun: boolean
  ): Promise<LumoraSkillOutput> {
    const market = hasOkxCredentials(this.env)
      ? await this.marketSnapshotService.getSnapshot()
      : undefined;
    const vaultState = await this.vaultStateService.getState(market?.price, { target: input.target });
    const execution = await this.executionService.executeRebalance({
      tickLower: input.manualRange.tickLower,
      tickUpper: input.manualRange.tickUpper,
      dryRun,
      reason: input.reason ? [input.reason] : ["manual demo rebalance"],
      marketSnapshot: market,
      writeHistory: input.options.writeHistory,
      target: input.target,
      executionAuth: input.auth
    });

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      pair: input.pair,
      mode: input.mode,
      market: market ? this.includeMarketHistory(market, input.options.includeMarketHistory) : undefined,
      vaultState,
      executionPreview: execution.executionPreview,
      execution
    };
  }

  private async runHistory(
    input: Extract<LumoraSkillInput, { operation: "history" }>
  ): Promise<LumoraSkillOutput> {
    const items = await this.agentHistoryService.readHistory(input.limit, {
      namespace: deriveDeploymentNamespace(input.target)
    });

    return {
      ok: true,
      skill: LUMORA_SKILL_NAME,
      operation: input.operation,
      history: { items }
    };
  }

  private includeMarketHistory(
    market: Awaited<ReturnType<MarketSnapshotService["getSnapshot"]>>,
    includeHistory = true
  ) {
    if (includeHistory) {
      return market;
    }

    return {
      ...market,
      history: []
    };
  }
}

export function skillOperationRequiresOkx(input: LumoraSkillInput): boolean {
  switch (input.operation) {
    case "market_snapshot":
    case "decision":
      return true;
    case "preview_rebalance":
    case "execute_rebalance":
      return input.mode === "agent";
    case "vault_state":
    case "history":
      return false;
  }
}

export function skillOperationRequiresWallet(input: LumoraSkillInput): boolean {
  switch (input.operation) {
    case "decision":
      return Boolean(input.options.includeExecutionPreview)
        && resolveExecutionPolicy(input.auth as ExecutionAuthInput | undefined) === "env-signer";
    case "preview_rebalance":
    case "execute_rebalance":
      return resolveExecutionPolicy(input.auth as ExecutionAuthInput | undefined) === "env-signer";
    case "market_snapshot":
    case "vault_state":
    case "history":
      return false;
  }
}
