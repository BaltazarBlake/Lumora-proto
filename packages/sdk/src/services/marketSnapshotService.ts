import fs from "node:fs/promises";
import path from "node:path";

import { AppEnv, requireOkxCredentials } from "../config/env.js";
import { calculateEma, calculateReturnsOverWindow, calculateVolatility } from "../market/indicators.js";
import { MarketSnapshot, NormalizedPricePoint } from "../market/marketTypes.js";
import { OkxMarketMcpClient } from "../market/okxMarketMcpClient.js";
import { resolveRepoPath } from "../utils/deployments.js";

export class MarketSnapshotService {
  private okxClient?: OkxMarketMcpClient;

  constructor(private readonly env: AppEnv) {
  }

  async getSnapshot(): Promise<MarketSnapshot> {
    const currentPoint = await this.getClient().getCurrentPrice({
      chainIndex: this.env.OKX_ETH_CHAIN_INDEX,
      tokenContractAddress: ""
    });
    const historical = await this.getClient().getHistoricalPrices({
      chainIndex: this.env.OKX_ETH_CHAIN_INDEX,
      tokenContractAddress: "",
      limit: 72,
      period: "5m"
    });

    const currentTimestamp = Number(currentPoint.time);
    if (Number.isNaN(currentTimestamp)) {
      throw new Error("Current OKX timestamp is not a number.");
    }
    if (Date.now() - currentTimestamp > this.env.MARKET_STALE_TIME_MS) {
      throw new Error(`X Layer Onchain OS market data is stale. latest=${currentTimestamp}`);
    }

    const history = normalizeHistoryPoints(historical.prices, currentPoint);
    const prices = history.map((point) => point.price);

    const snapshot: MarketSnapshot = {
      pair: this.env.MARKET_PAIR,
      price: Number(currentPoint.price),
      emaShort: calculateEma(prices, 12),
      emaLong: calculateEma(prices, 26),
      volatility: calculateVolatility(prices),
      returns1h: calculateReturnsOverWindow(history, 60 * 60 * 1000),
      timestamp: currentTimestamp,
      source: "okx-market-mcp",
      history
    };

    await this.writeCache(snapshot);

    return snapshot;
  }

  private async writeCache(snapshot: MarketSnapshot): Promise<void> {
    const filePath = path.join(resolveRepoPath(this.env.MARKET_CACHE_DIR), `${this.env.MARKET_PAIR.toLowerCase()}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  private getClient(): OkxMarketMcpClient {
    if (!this.okxClient) {
      const credentials = requireOkxCredentials(this.env);
      this.okxClient = new OkxMarketMcpClient({
        apiKey: credentials.OKX_API_KEY,
        endpoint: credentials.OKX_MARKET_MCP_URL
      });
    }

    return this.okxClient;
  }
}

function normalizeHistoryPoints(
  historicalPoints: Array<{ time: string; price: string }>,
  currentPoint: { time: string; price: string }
): NormalizedPricePoint[] {
  const normalized = historicalPoints
    .map((point) => ({
      timestamp: Number(point.time),
      price: Number(point.price)
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price))
    .sort((left, right) => left.timestamp - right.timestamp);

  const current = {
    timestamp: Number(currentPoint.time),
    price: Number(currentPoint.price)
  };

  if (normalized.length === 0 || normalized[normalized.length - 1].timestamp !== current.timestamp) {
    normalized.push(current);
  }

  return normalized;
}
