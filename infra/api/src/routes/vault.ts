import { Express, Request, Response } from "express";

import { AppServices } from "../app.js";

export function registerVaultRoutes(app: Express, services: AppServices): void {
  app.get("/api/vault/state", async (_request: Request, response: Response) => {
    const result = await services.lumoraSkill.invoke({
      operation: "vault_state"
    });
    response.json(result.vaultState);
  });
}
