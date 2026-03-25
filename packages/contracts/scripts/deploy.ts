import factoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import quoterArtifact from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import positionManagerArtifact from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import swapRouterArtifact from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import hre from "hardhat";

import { DeploymentManifest, writeDeploymentManifest } from "./utils/deployments";
import { loadRuntimeConfig, sortTokenAddresses } from "./utils/runtime";

async function main(): Promise<void> {
  const { ethers, network } = hre;
  const [signer] = await ethers.getSigners();
  const config = loadRuntimeConfig();
  const deployerAddress = await signer.getAddress();

  console.log(`Deploying contracts to ${network.name} with ${deployerAddress}`);

  const WETH9 = await ethers.getContractFactory("WETH9");
  const weth9 = await WETH9.deploy();
  await weth9.waitForDeployment();

  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  const stk = await SimpleToken.deploy(
    deployerAddress,
    deployerAddress,
    ethers.parseUnits(config.initialStkSupply, 6)
  );
  await stk.waitForDeployment();

  const factoryFactory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, signer);
  const factory = await factoryFactory.deploy();
  await factory.waitForDeployment();

  const swapRouterFactory = new ethers.ContractFactory(swapRouterArtifact.abi, swapRouterArtifact.bytecode, signer);
  const swapRouter = await swapRouterFactory.deploy(await factory.getAddress(), await weth9.getAddress());
  await swapRouter.waitForDeployment();

  const positionManagerFactory = new ethers.ContractFactory(
    positionManagerArtifact.abi,
    positionManagerArtifact.bytecode,
    signer
  );
  const positionManager = await positionManagerFactory.deploy(
    await factory.getAddress(),
    await weth9.getAddress(),
    ethers.ZeroAddress
  );
  await positionManager.waitForDeployment();

  const quoterFactory = new ethers.ContractFactory(quoterArtifact.abi, quoterArtifact.bytecode, signer);
  const quoter = await quoterFactory.deploy(await factory.getAddress(), await weth9.getAddress());
  await quoter.waitForDeployment();

  const { token0, token1 } = sortTokenAddresses(await weth9.getAddress(), await stk.getAddress());

  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(token0, token1, deployerAddress, ethers.ZeroAddress);
  await vault.waitForDeployment();

  const Manager = await ethers.getContractFactory("Manager");
  const manager = await Manager.deploy(
    deployerAddress,
    deployerAddress,
    await vault.getAddress(),
    await positionManager.getAddress(),
    await factory.getAddress(),
    token0,
    token1,
    config.poolFee,
    config.minimumRebalanceInterval
  );
  await manager.waitForDeployment();

  const setManagerTx = await vault.setManager(await manager.getAddress());
  await setManagerTx.wait();

  const manifest: DeploymentManifest = {
    network: {
      name: network.name,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl
    },
    deployer: deployerAddress,
    addresses: {
      weth9: await weth9.getAddress(),
      stk: await stk.getAddress(),
      factory: await factory.getAddress(),
      swapRouter: await swapRouter.getAddress(),
      positionManager: await positionManager.getAddress(),
      quoterV2: await quoter.getAddress(),
      vault: await vault.getAddress(),
      manager: await manager.getAddress(),
      token0,
      token1
    },
    metadata: {
      poolFee: config.poolFee,
      minimumRebalanceInterval: config.minimumRebalanceInterval,
      initialStkSupply: config.initialStkSupply,
      updatedAt: new Date().toISOString()
    }
  };

  await writeDeploymentManifest(config.deploymentsFile, manifest);

  console.log(`Deployment manifest written to ${config.deploymentsFile}`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
