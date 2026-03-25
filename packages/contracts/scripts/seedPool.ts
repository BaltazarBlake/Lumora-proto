import { encodeSqrtRatioX96 } from "@uniswap/v3-sdk";
import { ethers } from "ethers";
import hre from "hardhat";

import { readDeploymentManifest, writeDeploymentManifest } from "./utils/deployments";
import { loadRuntimeConfig } from "./utils/runtime";

async function main(): Promise<void> {
  const { ethers: hardhatEthers } = hre;
  const [signer] = await hardhatEthers.getSigners();
  const config = loadRuntimeConfig();
  const manifest = await readDeploymentManifest(config.deploymentsFile);

  const positionManager = new hardhatEthers.Contract(
    manifest.addresses.positionManager,
    [
      "function createAndInitializePoolIfNecessary(address token0,address token1,uint24 fee,uint160 sqrtPriceX96) returns (address pool)"
    ],
    signer
  );

  const factory = new hardhatEthers.Contract(
    manifest.addresses.factory,
    ["function getPool(address token0,address token1,uint24 fee) view returns (address pool)"],
    signer
  );

  const wethIsToken0 = manifest.addresses.token0.toLowerCase() === manifest.addresses.weth9.toLowerCase();
  const oneWeth = ethers.parseUnits("1", 18);
  const stkAmount = ethers.parseUnits(config.initPriceStkPerWeth, 6);
  const amount0 = wethIsToken0 ? oneWeth : stkAmount;
  const amount1 = wethIsToken0 ? stkAmount : oneWeth;
  const sqrtPriceX96 = encodeSqrtRatioX96(amount1.toString(), amount0.toString());

  const tx = await positionManager.createAndInitializePoolIfNecessary(
    manifest.addresses.token0,
    manifest.addresses.token1,
    manifest.metadata.poolFee,
    BigInt(sqrtPriceX96.toString())
  );
  await tx.wait();

  const poolAddress = await factory.getPool(
    manifest.addresses.token0,
    manifest.addresses.token1,
    manifest.metadata.poolFee
  );

  manifest.pool = {
    ...(manifest.pool ?? {}),
    address: poolAddress,
    initPriceStkPerWeth: config.initPriceStkPerWeth
  };
  manifest.metadata.updatedAt = new Date().toISOString();

  await writeDeploymentManifest(config.deploymentsFile, manifest);

  console.log(`Initialized pool at ${poolAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
