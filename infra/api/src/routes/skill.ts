import { Express, Request, Response } from "express";

import {
  hasOkxCredentials,
  hasWalletPrivateKey,
  lumoraSkillInputSchema,
  skillOperationRequiresOkx,
  skillOperationRequiresWallet
} from "@ai-alm/sdk";

import { AppServices } from "../app.js";

export function registerSkillRoutes(app: Express, services: AppServices): void {
  app.post("/api/skill/lumora", async (request: Request, response: Response) => {
    const input = lumoraSkillInputSchema.parse(request.body);

    if (skillOperationRequiresOkx(input) && !hasOkxCredentials(services.env)) {
      response.status(503).json({ error: "OKX API key is required for this lumora operation." });
      return;
    }

    if (skillOperationRequiresWallet(input) && !hasWalletPrivateKey(services.env)) {
      response.status(503).json({ error: "WALLET_PRIVATE_KEY is required for this lumora operation." });
      return;
    }

    const result = await services.lumoraSkill.invoke(input);
    response.json(result);
  });
}
