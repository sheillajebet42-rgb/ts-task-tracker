import "express-async-errors"; // forwards rejected promises in async handlers to the error middleware
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { authRouter } from "./routes/auth";
import { taskRouter } from "./routes/tasks";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use(express.static(path.join(__dirname, "..", "..", "public")));

  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", taskRouter);

  // Central error handler: thanks to express-async-errors, DB failures in async routes end up here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  });
  return app;
}
