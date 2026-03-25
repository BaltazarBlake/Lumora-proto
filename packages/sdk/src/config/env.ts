import { z } from "zod";

const envSchema = z.object({
  XLAYER_MAINNET_RPC_URL: z.string().url().optional().default("https://rpc.xlayer.tech"),
  XLAYER_MAINNET_CHAIN_ID: z.coerce.number().default(196),
  WALLET_PRIVATE_KEY: z.string().optional().default(""),
  OKX_API_KEY: z.string().optional().default(""),
  OKX_MARKET_MCP_URL: z.string().url().default("https://web3.okx.com/api/v1/onchainos-mcp"),
  OKX_ETH_CHAIN_INDEX: z.string().default("1"),
  MARKET_PAIR: z.string().default("WETH-STK"),
  MARKET_BASE_SYMBOL: z.string().default("ETH"),
  MARKET_QUOTE_SYMBOL: z.string().default("USD"),
  MARKET_STALE_TIME_MS: z.coerce.number().default(300000),
  MIN_REBALANCE_INTERVAL_SECONDS: z.coerce.number().default(1800),
  DEFAULT_POOL_FEE: z.coerce.number().default(3000),
  DEFAULT_PRICE_WIDTH_BPS: z.coerce.number().default(1500),
  DEFAULT_PRICE_BOUNDARY_BPS: z.coerce.number().default(1500),
  DEFAULT_VOLATILITY_THRESHOLD_BPS: z.coerce.number().default(200),
  DEPLOYMENTS_FILE: z.string().default("deployments/xlayer-mainnet.json"),
  AGENT_HISTORY_DIR: z.string().default("data/agent-runs"),
  VAULT_PROFILE_DIR: z.string().default("data/vault-profiles"),
  MARKET_CACHE_DIR: z.string().default("data/market-cache"),
  API_PORT: z.coerce.number().default(3000)
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function hasWalletPrivateKey(env: AppEnv): boolean {
  return env.WALLET_PRIVATE_KEY.trim().length > 0;
}

export function requireWalletPrivateKey(env: AppEnv): string {
  if (!hasWalletPrivateKey(env)) {
    throw new Error("WALLET_PRIVATE_KEY is required for transaction preview and execution.");
  }

  return env.WALLET_PRIVATE_KEY;
}

export function hasOkxCredentials(env: AppEnv): boolean {
  return env.OKX_API_KEY.trim().length > 0;
}

export function requireOkxCredentials(env: AppEnv): Pick<AppEnv, "OKX_API_KEY" | "OKX_MARKET_MCP_URL"> {
  if (!hasOkxCredentials(env)) {
    throw new Error("OKX_API_KEY is required for OKX Market MCP routes.");
  }

  return {
    OKX_API_KEY: env.OKX_API_KEY,
    OKX_MARKET_MCP_URL: env.OKX_MARKET_MCP_URL
  };
}
