import { Contract, Wallet, ethers } from "ethers";

import { AppEnv, requireWalletPrivateKey } from "../config/env.js";
import { MarketSnapshot } from "../market/marketTypes.js";
import { ExecutionAuthInput, resolveExecutionPolicy } from "../runtime/agentContext.js";
import {
  DeploymentTargetInput,
  deriveDeploymentNamespace,
  resolveDeploymentManifest
} from "../utils/deployments.js";
import { AgentHistoryService } from "./agentHistoryService.js";
import { VaultStateService } from "./vaultStateService.js";

export interface ExecutionPreview {
  gasEstimate: string;
  gasUsd: number;
  slippageBps: number;
}

export interface ExecuteRebalanceParams {
  tickLower: number;
  tickUpper: number;
  dryRun?: boolean;
  reason?: string[];
  marketSnapshot?: MarketSnapshot;
  writeHistory?: boolean;
  target?: DeploymentTargetInput;
  executionAuth?: ExecutionAuthInput;
}

export interface RebalanceExecutionResult {
  success: boolean;
  dryRun: boolean;
  txHash?: string;
  oldRange: {
    tickLower: number;
    tickUpper: number;
  };
  newRange: {
    tickLower: number;
    tickUpper: number;
  };
  reason: string[];
  executionPreview: ExecutionPreview;
  executionMode?: "onchain" | "delegated";
  submitted?: boolean;
  delegatedTransaction?: {
    chainId: number;
    from: string;
    to: string;
    data: string;
    value: string;
  };
}

export class ExecutionService {
  private readonly vaultStateService: VaultStateService;
  private readonly agentHistoryService: AgentHistoryService;

  constructor(private readonly env: AppEnv) {
    this.vaultStateService = new VaultStateService(env);
    this.agentHistoryService = new AgentHistoryService(env);
  }

  async previewRebalance(
    tickLower: number,
    tickUpper: number,
    marketSnapshot?: MarketSnapshot,
    options?: {
      target?: DeploymentTargetInput;
      executionAuth?: ExecutionAuthInput;
    }
  ): Promise<ExecutionPreview> {
    const manifest = await resolveDeploymentManifest(this.env, options?.target);
    const provider = new ethers.JsonRpcProvider(manifest.network.rpcUrl);
    const actor = this.resolveExecutionActor(provider, options?.executionAuth);
    const manager = new Contract(
      manifest.addresses.manager,
      [
        "function rebalance((int24 tickLower,int24 tickUpper,uint256 exitAmount0Min,uint256 exitAmount1Min,uint256 amount0Min,uint256 amount1Min,uint256 deadline))"
      ],
      actor.signer
    );

    const gasEstimate = await manager.rebalance.estimateGas({
      tickLower,
      tickUpper,
      exitAmount0Min: 0,
      exitAmount1Min: 0,
      amount0Min: 0,
      amount1Min: 0,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20
    });
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;
    const gasNative = gasEstimate * gasPrice;
    const gasUsd = Number(ethers.formatEther(gasNative)) * (marketSnapshot?.price ?? 0);
    const slippageBps = Math.max(10, Math.round((marketSnapshot?.volatility ?? 0.002) * 10_000));

    return {
      gasEstimate: gasEstimate.toString(),
      gasUsd,
      slippageBps
    };
  }

  async executeRebalance(params: ExecuteRebalanceParams): Promise<RebalanceExecutionResult> {
    const manifest = await resolveDeploymentManifest(this.env, params.target);
    const provider = new ethers.JsonRpcProvider(manifest.network.rpcUrl);
    const marketSnapshot = params.marketSnapshot;
    const currentState = await this.vaultStateService.getState(marketSnapshot?.price, { target: params.target });
    const preview = await this.previewRebalance(params.tickLower, params.tickUpper, marketSnapshot, {
      target: params.target,
      executionAuth: params.executionAuth
    });

    if (params.dryRun ?? false) {
      return {
        success: true,
        dryRun: true,
        oldRange: {
          tickLower: currentState.position.tickLower,
          tickUpper: currentState.position.tickUpper
        },
        newRange: {
          tickLower: params.tickLower,
          tickUpper: params.tickUpper
        },
        reason: params.reason ?? ["dry-run preview"],
        executionPreview: preview
      };
    }

    const actor = this.resolveExecutionActor(provider, params.executionAuth);
    const manager = new Contract(
      manifest.addresses.manager,
      [
        "function rebalance((int24 tickLower,int24 tickUpper,uint256 exitAmount0Min,uint256 exitAmount1Min,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)"
      ],
      actor.signer
    );

    const txPayload = {
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      exitAmount0Min: 0,
      exitAmount1Min: 0,
      amount0Min: 0,
      amount1Min: 0,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20
    };

    if (actor.mode === "delegated") {
      const txRequest = await manager.rebalance.populateTransaction(txPayload);

      return {
        success: true,
        dryRun: false,
        oldRange: {
          tickLower: currentState.position.tickLower,
          tickUpper: currentState.position.tickUpper
        },
        newRange: {
          tickLower: params.tickLower,
          tickUpper: params.tickUpper
        },
        reason: params.reason ?? ["delegated execute"],
        executionPreview: preview,
        executionMode: "delegated",
        submitted: false,
        delegatedTransaction: {
          chainId: manifest.network.chainId,
          from: actor.address,
          to: txRequest.to ?? manifest.addresses.manager,
          data: txRequest.data?.toString() ?? "0x",
          value: (txRequest.value ?? 0n).toString()
        }
      };
    }

    const tx = await manager.rebalance(txPayload);
    await tx.wait();

    const result: RebalanceExecutionResult = {
      success: true,
      dryRun: false,
      txHash: tx.hash,
      executionMode: "onchain",
      submitted: true,
      oldRange: {
        tickLower: currentState.position.tickLower,
        tickUpper: currentState.position.tickUpper
      },
      newRange: {
        tickLower: params.tickLower,
        tickUpper: params.tickUpper
      },
      reason: params.reason ?? ["manual execute"],
      executionPreview: preview
    };

    if (params.writeHistory ?? true) {
      await this.agentHistoryService.appendEntry({
        timestamp: Date.now(),
        marketSnapshot,
        vaultState: currentState,
        result
      }, {
        namespace: deriveDeploymentNamespace(params.target)
      });
    }

    return result;
  }

  private resolveExecutionActor(provider: ethers.JsonRpcProvider, auth?: ExecutionAuthInput):
    | { mode: "signer"; signer: Wallet; address: string }
    | { mode: "delegated"; signer: ethers.VoidSigner; address: string } {
    const policy = resolveExecutionPolicy(auth);

    if (policy === "request-signer") {
      if (!auth || auth.policy !== "request-signer") {
        throw new Error("request-signer policy requires signerPrivateKey.");
      }

      const signer = new Wallet(auth.signerPrivateKey, provider);
      return {
        mode: "signer",
        signer,
        address: signer.address
      };
    }

    if (policy === "delegated") {
      if (!auth || auth.policy !== "delegated") {
        throw new Error("delegated policy requires executorAddress.");
      }

      return {
        mode: "delegated",
        signer: new ethers.VoidSigner(auth.executorAddress, provider),
        address: auth.executorAddress
      };
    }

    const signer = new Wallet(requireWalletPrivateKey(this.env), provider);
    return {
      mode: "signer",
      signer,
      address: signer.address
    };
  }
}
