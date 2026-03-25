import { Contract, ethers } from "ethers";

import { AppEnv } from "../config/env.js";
import { DeploymentManifest, DeploymentTargetInput, resolveDeploymentManifest } from "../utils/deployments.js";

export interface VaultState {
  vaultAddress: string;
  managerAddress: string;
  poolAddress: string | null;
  tvlUsd: number;
  accountedBalances: {
    asset0: string;
    asset1: string;
    weth: string;
    stk: string;
  };
  idleBalances: {
    asset0: string;
    asset1: string;
    weth: string;
    stk: string;
  };
  position: {
    tokenId: string;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    inRange: boolean;
    liquidity: string;
    deployedAmount0: string;
    deployedAmount1: string;
  };
  lastRebalanceAt: number;
}

export class VaultStateService {
  constructor(private readonly env: AppEnv) {
  }

  async getState(marketPriceUsd?: number, options?: { target?: DeploymentTargetInput }): Promise<VaultState> {
    const manifest = await resolveDeploymentManifest(this.env, options?.target);
    const provider = new ethers.JsonRpcProvider(manifest.network.rpcUrl);
    const vault = new Contract(
      manifest.addresses.vault,
      [
        "function accountedAsset0() view returns (uint256)",
        "function accountedAsset1() view returns (uint256)",
        "function idleBalances() view returns (uint256 idleAsset0, uint256 idleAsset1)"
      ],
      provider
    );
    const manager = new Contract(
      manifest.addresses.manager,
      [
        "function positionState() view returns ((uint256 tokenId,int24 tickLower,int24 tickUpper,uint128 liquidity,int24 currentTick,bool inRange,uint256 lastRebalanceAt,address pool))",
        "function deployedAmount0() view returns (uint256)",
        "function deployedAmount1() view returns (uint256)"
      ],
      provider
    );

    const [accountedAsset0, accountedAsset1, idleBalances, positionState, deployedAmount0, deployedAmount1] =
      await Promise.all([
        vault.accountedAsset0(),
        vault.accountedAsset1(),
        vault.idleBalances(),
        manager.positionState(),
        manager.deployedAmount0(),
        manager.deployedAmount1()
      ]);

    return mapVaultState(manifest, {
      accountedAsset0,
      accountedAsset1,
      idleAsset0: idleBalances.idleAsset0,
      idleAsset1: idleBalances.idleAsset1,
      positionState,
      deployedAmount0,
      deployedAmount1,
      marketPriceUsd
    });
  }
}

function mapVaultState(
  manifest: DeploymentManifest,
  input: {
    accountedAsset0: bigint;
    accountedAsset1: bigint;
    idleAsset0: bigint;
    idleAsset1: bigint;
    positionState: {
      tokenId: bigint;
      tickLower: number;
      tickUpper: number;
      liquidity: bigint;
      currentTick: number;
      inRange: boolean;
      lastRebalanceAt: bigint;
      pool: string;
    };
    deployedAmount0: bigint;
    deployedAmount1: bigint;
    marketPriceUsd?: number;
  }
): VaultState {
  const wethIsToken0 = manifest.addresses.token0.toLowerCase() === manifest.addresses.weth9.toLowerCase();

  const accountedWeth = wethIsToken0 ? input.accountedAsset0 : input.accountedAsset1;
  const accountedStk = wethIsToken0 ? input.accountedAsset1 : input.accountedAsset0;
  const idleWeth = wethIsToken0 ? input.idleAsset0 : input.idleAsset1;
  const idleStk = wethIsToken0 ? input.idleAsset1 : input.idleAsset0;

  const wethUsd = Number(ethers.formatEther(accountedWeth)) * (input.marketPriceUsd ?? 0);
  const stkUsd = Number(ethers.formatUnits(accountedStk, 6));

  return {
    vaultAddress: manifest.addresses.vault,
    managerAddress: manifest.addresses.manager,
    poolAddress: input.positionState.pool === ethers.ZeroAddress ? null : input.positionState.pool,
    tvlUsd: wethUsd + stkUsd,
    accountedBalances: {
      asset0: input.accountedAsset0.toString(),
      asset1: input.accountedAsset1.toString(),
      weth: accountedWeth.toString(),
      stk: accountedStk.toString()
    },
    idleBalances: {
      asset0: input.idleAsset0.toString(),
      asset1: input.idleAsset1.toString(),
      weth: idleWeth.toString(),
      stk: idleStk.toString()
    },
    position: {
      tokenId: input.positionState.tokenId.toString(),
      tickLower: Number(input.positionState.tickLower),
      tickUpper: Number(input.positionState.tickUpper),
      currentTick: Number(input.positionState.currentTick),
      inRange: Boolean(input.positionState.inRange),
      liquidity: input.positionState.liquidity.toString(),
      deployedAmount0: input.deployedAmount0.toString(),
      deployedAmount1: input.deployedAmount1.toString()
    },
    lastRebalanceAt: Number(input.positionState.lastRebalanceAt)
  };
}
