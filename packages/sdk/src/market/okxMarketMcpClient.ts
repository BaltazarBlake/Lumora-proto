import {
  OkxCurrentPricePoint,
  OkxCurrentPriceRequest,
  OkxHistoricalPricePoint,
  OkxHistoricalPriceRequest,
  OkxHistoricalPriceResponseItem
} from "./marketTypes.js";

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number | string | null;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpInitializeResult {
  protocolVersion?: string;
}

interface McpToolCallResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  structuredContent?: unknown;
  isError?: boolean;
}

interface McpListToolsResult {
  tools?: Array<{
    name: string;
    [key: string]: unknown;
  }>;
}

export interface OkxMarketMcpClientConfig {
  apiKey: string;
  endpoint?: string;
}

type JsonRpcEnvelope<T> = JsonRpcSuccess<T> | JsonRpcFailure;

const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const TOOL_INDEX_CURRENT_PRICE = "dex-okx-index-current-price";
const TOOL_INDEX_HISTORICAL_PRICE = "dex-okx-index-historical-price";

export class OkxMarketMcpClient {
  private readonly endpoint: string;
  private sessionId?: string;
  private protocolVersion = DEFAULT_PROTOCOL_VERSION;
  private nextRequestId = 1;
  private initializationPromise?: Promise<void>;

  constructor(private readonly config: OkxMarketMcpClientConfig) {
    this.endpoint = config.endpoint ?? "https://web3.okx.com/api/v1/onchainos-mcp";
  }

  async listTools(): Promise<string[]> {
    await this.ensureInitialized();
    const result = await this.request<McpListToolsResult>("tools/list");
    return (result.tools ?? [])
      .map((tool) => tool.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0);
  }

  async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    await this.ensureInitialized();
    const result = await this.request<McpToolCallResult>("tools/call", {
      name,
      arguments: args
    });

    if (result.isError) {
      throw new Error(`OKX Market MCP tool ${name} returned an error result.`);
    }

    return extractToolPayload<T>(result);
  }

  async getCurrentPrice(request: OkxCurrentPriceRequest): Promise<OkxCurrentPricePoint> {
    const payload = await this.callTool<unknown>(TOOL_INDEX_CURRENT_PRICE, request);
    return normalizeCurrentPricePayload(payload);
  }

  async getHistoricalPrices(request: OkxHistoricalPriceRequest): Promise<OkxHistoricalPriceResponseItem> {
    const payload = await this.callTool<unknown>(TOOL_INDEX_HISTORICAL_PRICE, request);
    return normalizeHistoricalPricePayload(payload);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }

    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest<McpInitializeResult>({
      jsonrpc: "2.0",
      id: this.allocateId(),
      method: "initialize",
      params: {
        protocolVersion: this.protocolVersion,
        capabilities: {},
        clientInfo: {
          name: "ai-alm-sdk",
          version: "1.0.0"
        }
      }
    });

    this.protocolVersion = response.result.protocolVersion ?? this.protocolVersion;

    await this.sendNotification("notifications/initialized");
  }

  private async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.sendRequest<T>({
      jsonrpc: "2.0",
      id: this.allocateId(),
      method,
      params
    });

    return response.result;
  }

  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.buildHeaders(true),
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params
      })
    });

    this.captureSessionId(response);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OKX Market MCP notification failed with status ${response.status}: ${body}`);
    }
  }

  private async sendRequest<T>(payload: { jsonrpc: "2.0"; id: number; method: string; params?: Record<string, unknown> }): Promise<JsonRpcSuccess<T>> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.buildHeaders(true),
      body: JSON.stringify(payload)
    });

    this.captureSessionId(response);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OKX Market MCP request failed with status ${response.status}: ${body}`);
    }

    const envelope = await parseJsonRpcResponse<T>(response, payload.id);
    if ("error" in envelope) {
      throw new Error(`OKX Market MCP request failed with code ${envelope.error.code}: ${envelope.error.message}`);
    }

    return envelope;
  }

  private buildHeaders(includeProtocolVersion: boolean): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": this.config.apiKey
    };

    if (includeProtocolVersion) {
      headers["MCP-Protocol-Version"] = this.protocolVersion;
    }
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    return headers;
  }

  private captureSessionId(response: Response): void {
    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) {
      this.sessionId = sessionId;
    }
  }

  private allocateId(): number {
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return id;
  }
}

export { OkxMarketMcpClient as OkxClient };
export type { OkxMarketMcpClientConfig as OkxClientConfig };

async function parseJsonRpcResponse<T>(response: Response, expectedId: number): Promise<JsonRpcEnvelope<T>> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error("OKX Market MCP response body was empty.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const envelopes = contentType.includes("text/event-stream")
    ? parseEventStream<JsonRpcEnvelope<T>>(body)
    : parseJsonPayload<JsonRpcEnvelope<T>>(body);

  const match = envelopes.find((candidate) => candidate.id === expectedId) ?? envelopes[envelopes.length - 1];
  if (!match) {
    throw new Error(`OKX Market MCP response did not contain JSON-RPC id ${expectedId}.`);
  }

  return match;
}

function parseJsonPayload<T>(body: string): T[] {
  const parsed = JSON.parse(body) as T | T[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function parseEventStream<T>(body: string): T[] {
  const messages: T[] = [];

  for (const eventBlock of body.split(/\n\n+/)) {
    const data = eventBlock
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!data || data === "[DONE]") {
      continue;
    }

    const parsed = JSON.parse(data) as T | T[];
    if (Array.isArray(parsed)) {
      messages.push(...parsed);
    } else {
      messages.push(parsed);
    }
  }

  return messages;
}

function extractToolPayload<T>(result: McpToolCallResult): T {
  if (result.structuredContent !== undefined) {
    return result.structuredContent as T;
  }

  for (const item of result.content ?? []) {
    if (item.type !== "text" || typeof item.text !== "string") {
      continue;
    }

    const parsed = tryParseJson(item.text);
    if (parsed !== undefined) {
      return parsed as T;
    }
  }

  throw new Error("OKX Market MCP tool result did not include structured JSON content.");
}

function normalizeCurrentPricePayload(payload: unknown): OkxCurrentPricePoint {
  const candidate = pickObjectCandidate(payload);
  const price = readString(candidate, "price");
  const time = readString(candidate, "time");

  return {
    chainIndex: readString(candidate, "chainIndex", ""),
    tokenContractAddress: readString(candidate, "tokenContractAddress", ""),
    price,
    time
  };
}

function normalizeHistoricalPricePayload(payload: unknown): OkxHistoricalPriceResponseItem {
  const candidate = pickObjectCandidate(payload);
  const pricesInput = candidate.prices;
  if (!Array.isArray(pricesInput)) {
    throw new Error("OKX Market MCP historical price payload did not include a prices array.");
  }

  return {
    cursor: readString(candidate, "cursor", ""),
    prices: pricesInput.map(normalizeHistoricalPricePoint)
  };
}

function normalizeHistoricalPricePoint(point: unknown): OkxHistoricalPricePoint {
  if (!isRecord(point)) {
    throw new Error("OKX Market MCP historical price point was not an object.");
  }

  return {
    time: readString(point, "time"),
    price: readString(point, "price")
  };
}

function pickObjectCandidate(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    const [first] = payload;
    if (first === undefined) {
      throw new Error("OKX Market MCP payload array was empty.");
    }

    return pickObjectCandidate(first);
  }

  if (!isRecord(payload)) {
    throw new Error("OKX Market MCP payload was not an object.");
  }

  if (Array.isArray(payload.data)) {
    const [first] = payload.data;
    if (first === undefined) {
      throw new Error("OKX Market MCP payload data array was empty.");
    }

    return pickObjectCandidate(first);
  }

  if (isRecord(payload.data)) {
    return pickObjectCandidate(payload.data);
  }

  return payload;
}

function readString(record: Record<string, unknown>, key: string, fallback?: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`OKX Market MCP payload field ${key} was missing or not string-like.`);
}

function tryParseJson(text: string): unknown {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  if (!normalized) {
    return undefined;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
