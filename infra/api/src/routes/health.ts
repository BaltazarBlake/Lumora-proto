import { Express, Request, Response } from "express";

export function registerHealthRoutes(app: Express): void {
  app.get("/health", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      service: "ai-alm-demo-api"
    });
  });
}
