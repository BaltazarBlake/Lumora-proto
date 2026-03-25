import { config as loadEnv } from "dotenv";

import { repoRoot } from "./deployments";

loadEnv({ path: repoRoot(".env") });
loadEnv({ path: repoRoot(".env.local"), override: true });

export interface RuntimeConfig {
  chainId: number;
  rpcUrl: string;
  deploymentsFile: string;
  poolFee: number;
  minimumRebalanceInterval: number;
  initialStkSupply: string;
  initPriceStkPerWeth: string;
  seedVaultWeth: string;
  seedVaultStk: string;
  seedRangeMultiplier: number;
  smokeSwapStkAmount: string;
}

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    chainId: Number(process.env.XLAYER_MAINNET_CHAIN_ID ?? "196"),
    rpcUrl: process.env.XLAYER_MAINNET_RPC_URL ?? "https://rpc.xlayer.tech",
    deploymentsFile: repoRoot(process.env.DEPLOYMENTS_FILE ?? "deployments/xlayer-mainnet.json"),
    poolFee: Number(process.env.DEFAULT_POOL_FEE ?? "3000"),
    minimumRebalanceInterval: Number(process.env.MIN_REBALANCE_INTERVAL_SECONDS ?? "1800"),
    initialStkSupply: process.env.INITIAL_STK_SUPPLY ?? "1000000",
    initPriceStkPerWeth: process.env.POOL_INIT_PRICE_STK_PER_WETH ?? "2000",
    seedVaultWeth: process.env.SEED_VAULT_WETH ?? "0.5",
    seedVaultStk: process.env.SEED_VAULT_STK ?? "1000",
    seedRangeMultiplier: Number(process.env.SEED_RANGE_MULTIPLIER ?? "10"),
    smokeSwapStkAmount: process.env.SMOKE_SWAP_STK_AMOUNT ?? "10"
  };
}

export function sortTokenAddresses(addressA: string, addressB: string): { token0: string; token1: string } {
  return addressA.toLowerCase() < addressB.toLowerCase()
    ? { token0: addressA, token1: addressB }
    : { token0: addressB, token1: addressA };
}

export function getTickSpacing(fee: number): number {
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
