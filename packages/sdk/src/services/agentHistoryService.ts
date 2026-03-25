import fs from "node:fs/promises";
import path from "node:path";

import type { AppEnv } from "../config/env.js";
import type { MarketSnapshot } from "../market/marketTypes.js";
import { resolveRepoPath } from "../utils/deployments.js";
import type { RebalanceExecutionResult } from "./executionService.js";
import type { VaultState } from "./vaultStateService.js";

export interface AgentHistoryEntry {
  timestamp: number;
  marketSnapshot?: MarketSnapshot;
  vaultState: VaultState;
  result: RebalanceExecutionResult;
}

export class AgentHistoryService {
  constructor(private readonly env: Pick<AppEnv, "AGENT_HISTORY_DIR">) {
  }

  async readHistory(limit = 20, options?: { namespace?: string }): Promise<AgentHistoryEntry[]> {
    const historyPath = this.getHistoryPath(options?.namespace);

    try {
      const raw = await fs.readFile(historyPath, "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .slice(-limit)
        .map((line) => JSON.parse(line) as AgentHistoryEntry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async appendEntry(entry: AgentHistoryEntry, options?: { namespace?: string }): Promise<void> {
    const historyPath = this.getHistoryPath(options?.namespace);
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.appendFile(historyPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  private getHistoryPath(namespace = "default"): string {
    return path.join(resolveRepoPath(this.env.AGENT_HISTORY_DIR), namespace, "history.jsonl");
  }
}
