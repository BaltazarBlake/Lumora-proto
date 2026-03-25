import express, { Express, Request, Response } from "express";

import {
  AgentService,
  AgentHistoryService,
  ExecutionService,
  hasOkxCredentials,
  hasWalletPrivateKey,
  loadAppEnv,
  LumoraSkill,
  MarketSnapshotService,
  VaultStateService
} from "@ai-alm/sdk";

import { registerAgentRoutes } from "./routes/agent.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMarketRoutes } from "./routes/market.js";
import { registerRebalanceRoutes } from "./routes/rebalance.js";
import { registerSkillRoutes } from "./routes/skill.js";
import { registerVaultRoutes } from "./routes/vault.js";
import { registerErrorMiddleware } from "./middleware/error.js";

export interface AppServices {
  env: ReturnType<typeof loadAppEnv>;
  marketSnapshotService: MarketSnapshotService;
  vaultStateService: VaultStateService;
  agentService: AgentService;
  executionService: ExecutionService;
  agentHistoryService: AgentHistoryService;
  lumoraSkill: LumoraSkill;
}

export function createApp(): Express {
  const env = loadAppEnv();
  const marketSnapshotService = new MarketSnapshotService(env);
  const vaultStateService = new VaultStateService(env);
  const agentService = new AgentService(env);
  const executionService = new ExecutionService(env);
  const agentHistoryService = new AgentHistoryService(env);

  const services: AppServices = {
    env,
    marketSnapshotService,
    vaultStateService,
    agentService,
    executionService,
    agentHistoryService,
    lumoraSkill: new LumoraSkill(env, {
      marketSnapshotService,
      vaultStateService,
      agentService,
      executionService,
      agentHistoryService
    })
  };

  const app = express();
  app.use(express.json());

  app.get("/", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      service: "ai-alm-demo-api",
      capabilities: {
        liveMarketData: hasOkxCredentials(env),
        rebalanceExecution: hasWalletPrivateKey(env)
      }
    });
  });

  registerHealthRoutes(app);
  registerMarketRoutes(app, services);
  registerVaultRoutes(app, services);
  registerAgentRoutes(app, services, env);
  registerRebalanceRoutes(app, services);
  registerSkillRoutes(app, services);
  registerErrorMiddleware(app);

  return app;
}
