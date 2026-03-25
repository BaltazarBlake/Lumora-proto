import { Express, Request, Response } from "express";
import { z } from "zod";

import {
  deploymentTargetSchema,
  executionAuthSchema,
  hasOkxCredentials,
  hasWalletPrivateKey,
  resolveExecutionPolicy
} from "@ai-alm/sdk";

import { AppServices } from "../app.js";

const rebalanceBodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("agent"),
    dryRun: z.boolean().optional(),
    target: deploymentTargetSchema,
    auth: executionAuthSchema
  }),
  z.object({
    mode: z.literal("manual"),
    dryRun: z.boolean().optional(),
    tickLower: z.number().int(),
    tickUpper: z.number().int(),
    reason: z.string().optional(),
    target: deploymentTargetSchema,
    auth: executionAuthSchema
  })
]);

export function registerRebalanceRoutes(app: Express, services: AppServices): void {
  app.post("/api/rebalance/execute", async (request: Request, response: Response) => {
    const payload = rebalanceBodySchema.parse(request.body);

    if (resolveExecutionPolicy(payload.auth) === "env-signer" && !hasWalletPrivateKey(services.env)) {
      response.status(503).json({ error: "WALLET_PRIVATE_KEY is required for rebalance preview and execution." });
      return;
    }

    if (payload.mode === "agent") {
      if (!hasOkxCredentials(services.env)) {
        response.status(503).json({ error: "OKX API key is required for OKX Market MCP-backed agent execution." });
        return;
      }

      const result = await services.lumoraSkill.invoke({
        operation: payload.dryRun ? "preview_rebalance" : "execute_rebalance",
        pair: "WETH-STK",
        mode: "agent",
        target: payload.target,
        auth: payload.auth,
        options: {
          includeMarketHistory: true,
          includeExecutionPreview: false
        }
      });

      if (!result.execution) {
        response.json({
          success: false,
          dryRun: payload.dryRun ?? false,
          reason: result.decision?.reason ?? ["agent decided not to execute"],
          executionPreview: result.executionPreview ?? null
        });
        return;
      }

      response.json(result.execution);
      return;
    }

    const result = await services.lumoraSkill.invoke({
      operation: payload.dryRun ? "preview_rebalance" : "execute_rebalance",
      pair: "WETH-STK",
      mode: "manual",
      manualRange: {
        tickLower: payload.tickLower,
        tickUpper: payload.tickUpper
      },
      target: payload.target,
      auth: payload.auth,
      reason: payload.reason,
      options: {
        includeMarketHistory: true
      }
    });
    response.json(result.execution);
  });
}
