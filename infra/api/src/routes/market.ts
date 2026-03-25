import { Express, Request, Response } from "express";

import { hasOkxCredentials } from "@ai-alm/sdk";

import { AppServices } from "../app.js";

export function registerMarketRoutes(app: Express, services: AppServices): void {
  app.get("/api/market/snapshot", async (request: Request, response: Response) => {
    const pair = request.query.pair;
    if (pair && pair !== "WETH-STK") {
      response.status(400).json({ error: "Only WETH-STK is supported in MVP." });
      return;
    }

    if (!hasOkxCredentials(services.env)) {
      response.status(503).json({ error: "OKX API key is required for OKX Market MCP snapshots." });
      return;
    }

    const result = await services.lumoraSkill.invoke({
      operation: "market_snapshot",
      pair: "WETH-STK",
      options: {
        includeMarketHistory: true
      }
    });
    response.json(result.market);
  });
}
