import "@nomicfoundation/hardhat-toolbox";

import { config as loadEnv } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

loadEnv({ path: "../../.env" });
loadEnv({ path: "../../.env.local", override: true });

const xLayerMainnetRpcUrl = process.env.XLAYER_MAINNET_RPC_URL ?? "https://rpc.xlayer.tech";
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

const accounts = walletPrivateKey ? [walletPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {},
    xLayerMainnet: {
      url: xLayerMainnetRpcUrl,
      chainId: 196,
      accounts
    }
  }
};

export default config;
