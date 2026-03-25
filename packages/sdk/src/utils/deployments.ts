import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppEnv } from "../config/env.js";

export interface DeploymentManifest {
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
  };
  deployer: string;
  addresses: {
    weth9: string;
    stk: string;
    factory: string;
    swapRouter: string;
    positionManager: string;
    quoterV2: string;
    vault: string;
    manager: string;
    token0: string;
    token1: string;
  };
  metadata: {
    poolFee: number;
    minimumRebalanceInterval: number;
    initialStkSupply: string;
    updatedAt: string;
  };
  pool?: {
    address: string;
    initPriceStkPerWeth: string;
    seedRangeMultiplier?: number;
    lastKnownTickLower?: number;
    lastKnownTickUpper?: number;
    lastPositionTokenId?: string;
  };
  smoke?: {
    swap?: {
      firstTxHash: string;
      secondTxHash: string;
    };
    rebalance?: {
      txHash: string;
      tokenId: string;
    };
  };
}

export interface DeploymentTargetInput {
  profileId?: string;
  deploymentsFile?: string;
  manifest?: DeploymentManifest;
  addresses?: {
    vault: string;
    manager: string;
    token0: string;
    token1: string;
    weth9: string;
    stk?: string;
    factory?: string;
    swapRouter?: string;
    positionManager?: string;
    quoterV2?: string;
  };
  metadata?: {
    networkName?: string;
    chainId?: number;
    rpcUrl?: string;
    poolFee?: number;
    minimumRebalanceInterval?: number;
  };
}

interface DeploymentResolutionEnv extends Pick<
  AppEnv,
  | "DEPLOYMENTS_FILE"
  | "VAULT_PROFILE_DIR"
  | "XLAYER_MAINNET_CHAIN_ID"
  | "XLAYER_MAINNET_RPC_URL"
  | "DEFAULT_POOL_FEE"
  | "MIN_REBALANCE_INTERVAL_SECONDS"
> {}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function repoRoot(...parts: string[]): string {
  return path.resolve(currentDir, "../../../..", ...parts);
}

export function resolveRepoPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : repoRoot(filePath);
}

export async function readDeploymentManifest(filePath: string): Promise<DeploymentManifest> {
  const raw = await fs.readFile(resolveRepoPath(filePath), "utf8");
  return JSON.parse(raw) as DeploymentManifest;
}

export async function resolveDeploymentManifest(
  env: DeploymentResolutionEnv,
  target?: DeploymentTargetInput
): Promise<DeploymentManifest> {
  if (target?.manifest) {
    return target.manifest;
  }

  if (target?.profileId) {
    const profilePath = path.join(resolveRepoPath(env.VAULT_PROFILE_DIR), `${target.profileId}.json`);
    const raw = await fs.readFile(profilePath, "utf8");
    const profile = JSON.parse(raw) as DeploymentManifest | DeploymentTargetInput;

    if (isDeploymentManifest(profile)) {
      return profile;
    }

    return resolveDeploymentManifest(env, profile);
  }

  if (target?.deploymentsFile) {
    return readDeploymentManifest(target.deploymentsFile);
  }

  if (target?.addresses) {
    return buildManifestFromAddresses(env, target);
  }

  return readDeploymentManifest(env.DEPLOYMENTS_FILE);
}

export function deriveDeploymentNamespace(target?: DeploymentTargetInput): string {
  if (!target) {
    return "default";
  }

  if (target.profileId) {
    return `profile-${sanitizeNamespace(target.profileId)}`;
  }

  if (target.deploymentsFile) {
    return `file-${sanitizeNamespace(target.deploymentsFile)}`;
  }

  const managerAddress = target.manifest?.addresses.manager ?? target.addresses?.manager;
  if (managerAddress) {
    return `manager-${sanitizeNamespace(managerAddress.toLowerCase())}`;
  }

  return "default";
}

function buildManifestFromAddresses(
  env: DeploymentResolutionEnv,
  target: DeploymentTargetInput & { addresses: NonNullable<DeploymentTargetInput["addresses"]> }
): DeploymentManifest {
  const metadata = target.metadata ?? {};

  return {
    network: {
      name: metadata.networkName ?? "custom",
      chainId: metadata.chainId ?? env.XLAYER_MAINNET_CHAIN_ID,
      rpcUrl: metadata.rpcUrl ?? env.XLAYER_MAINNET_RPC_URL
    },
    deployer: ZERO_ADDRESS,
    addresses: {
      weth9: target.addresses.weth9,
      stk: target.addresses.stk ?? ZERO_ADDRESS,
      factory: target.addresses.factory ?? ZERO_ADDRESS,
      swapRouter: target.addresses.swapRouter ?? ZERO_ADDRESS,
      positionManager: target.addresses.positionManager ?? ZERO_ADDRESS,
      quoterV2: target.addresses.quoterV2 ?? ZERO_ADDRESS,
      vault: target.addresses.vault,
      manager: target.addresses.manager,
      token0: target.addresses.token0,
      token1: target.addresses.token1
    },
    metadata: {
      poolFee: metadata.poolFee ?? env.DEFAULT_POOL_FEE,
      minimumRebalanceInterval: metadata.minimumRebalanceInterval ?? env.MIN_REBALANCE_INTERVAL_SECONDS,
      initialStkSupply: "0",
      updatedAt: new Date().toISOString()
    }
  };
}

function isDeploymentManifest(value: unknown): value is DeploymentManifest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DeploymentManifest>;
  return Boolean(candidate.network && candidate.addresses && candidate.metadata);
}

function sanitizeNamespace(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}
