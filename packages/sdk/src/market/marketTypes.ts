export interface OkxCurrentPriceRequest {
  chainIndex: string;
  tokenContractAddress: string;
}

export interface OkxCurrentPricePoint {
  chainIndex: string;
  tokenContractAddress: string;
  price: string;
  time: string;
}

export interface OkxHistoricalPriceRequest {
  chainIndex: string;
  tokenContractAddress?: string;
  limit?: number;
  cursor?: string;
  begin?: string;
  end?: string;
  period?: "1m" | "5m" | "30m" | "1h" | "1d";
}

export interface OkxHistoricalPricePoint {
  time: string;
  price: string;
}

export interface OkxHistoricalPriceResponseItem {
  cursor: string;
  prices: OkxHistoricalPricePoint[];
}

export interface NormalizedPricePoint {
  timestamp: number;
  price: number;
}

export interface MarketSnapshot {
  pair: string;
  price: number;
  emaShort: number;
  emaLong: number;
  volatility: number;
  returns1h: number;
  timestamp: number;
  source: "okx-market-mcp";
  history: NormalizedPricePoint[];
}
