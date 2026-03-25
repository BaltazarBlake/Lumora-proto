import fs from "node:fs/promises";
import path from "node:path";

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

export function repoRoot(...parts: string[]): string {
  return path.resolve(__dirname, "../../../..", ...parts);
}

export async function readDeploymentManifest(filePath: string): Promise<DeploymentManifest> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as DeploymentManifest;
}

export async function writeDeploymentManifest(filePath: string, manifest: DeploymentManifest): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
