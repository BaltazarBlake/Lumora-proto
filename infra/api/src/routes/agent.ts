import { Express, Request, Response } from "express";

import { hasOkxCredentials } from "@ai-alm/sdk";

import { AppServices } from "../app.js";

export function registerAgentRoutes(
  app: Express,
  services: AppServices,
  _env: { AGENT_HISTORY_DIR: string }
): void {
  app.get("/api/agent/decision", async (_request: Request, response: Response) => {
    if (!hasOkxCredentials(services.env)) {
      response.status(503).json({ error: "OKX API key is required for OKX Market MCP-backed agent decisions." });
      return;
    }

    const result = await services.lumoraSkill.invoke({
      operation: "decision",
      pair: "WETH-STK",
      options: {
        includeMarketHistory: true
      }
    });
    response.json(result.decision);
  });

  app.get("/api/agent/history", async (_request: Request, response: Response) => {
    const result = await services.lumoraSkill.invoke({
      operation: "history",
      limit: 20
    });
    response.json(result.history);
  });
}
