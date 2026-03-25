import { Express, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function registerErrorMiddleware(app: Express): void {
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Invalid request payload",
        details: error.flatten()
      });
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  });
}
