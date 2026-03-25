import { nearestUsableTick } from "@uniswap/v3-sdk";
import hre from "hardhat";

import { readDeploymentManifest, writeDeploymentManifest } from "./utils/deployments";
import { getTickSpacing, loadRuntimeConfig } from "./utils/runtime";

async function main(): Promise<void> {
  const { ethers } = hre;
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const config = loadRuntimeConfig();
  const manifest = await readDeploymentManifest(config.deploymentsFile);

  if (!manifest.pool?.address) {
    throw new Error("Pool has not been initialized. Run seed:pool first.");
  }

  const weth = await ethers.getContractAt("WETH9", manifest.addresses.weth9, signer);
  const stk = await ethers.getContractAt("SimpleToken", manifest.addresses.stk, signer);
  const vault = await ethers.getContractAt("Vault", manifest.addresses.vault, signer);
  const manager = await ethers.getContractAt("Manager", manifest.addresses.manager, signer);
  const pool = new ethers.Contract(
    manifest.pool.address,
    ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16,uint16,uint16,uint8,bool)"],
    signer
  );

  const targetWethAmount = ethers.parseEther(config.seedVaultWeth);
  const targetStkAmount = ethers.parseUnits(config.seedVaultStk, 6);
  const wethBalance = await weth.balanceOf(signerAddress);
  if (wethBalance < targetWethAmount) {
    const missingWeth = targetWethAmount - wethBalance;
    const depositTx = await weth.deposit({ value: missingWeth });
    await depositTx.wait();
  }

  const stkBalance = await stk.balanceOf(signerAddress);
  if (stkBalance < targetStkAmount) {
    const mintTx = await stk.mint(signerAddress, targetStkAmount - stkBalance);
    await mintTx.wait();
  }

  const approveWethTx = await weth.approve(manifest.addresses.vault, targetWethAmount);
  await approveWethTx.wait();
  const approveStkTx = await stk.approve(manifest.addresses.vault, targetStkAmount);
  await approveStkTx.wait();

  const amount0 = manifest.addresses.token0.toLowerCase() === manifest.addresses.weth9.toLowerCase()
    ? targetWethAmount
    : targetStkAmount;
  const amount1 = manifest.addresses.token0.toLowerCase() === manifest.addresses.weth9.toLowerCase()
    ? targetStkAmount
    : targetWethAmount;

  const depositTx = await vault.deposit(amount0, amount1, signerAddress);
  await depositTx.wait();

  const [, currentTick] = await pool.slot0();
  const tickSpacing = getTickSpacing(manifest.metadata.poolFee);
  const centeredTick = nearestUsableTick(Number(currentTick), tickSpacing);
  const tickLower = centeredTick - tickSpacing * config.seedRangeMultiplier;
  const tickUpper = centeredTick + tickSpacing * config.seedRangeMultiplier;

  const seedTx = await manager.seedPosition({
    tickLower,
    tickUpper,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20
  });
  await seedTx.wait();

  const positionState = await manager.positionState();
  manifest.pool = {
    ...(manifest.pool ?? {}),
    address: manifest.pool.address,
    initPriceStkPerWeth: manifest.pool.initPriceStkPerWeth,
    seedRangeMultiplier: config.seedRangeMultiplier,
    lastKnownTickLower: Number(positionState.tickLower),
    lastKnownTickUpper: Number(positionState.tickUpper),
    lastPositionTokenId: positionState.tokenId.toString()
  };
  manifest.metadata.updatedAt = new Date().toISOString();

  await writeDeploymentManifest(config.deploymentsFile, manifest);

  console.log(`Vault seeded and position ${positionState.tokenId.toString()} opened.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
