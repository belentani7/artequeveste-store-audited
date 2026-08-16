import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { CLIENT_VERSION, PVCU_VERSION, createTraceId } from "../../shared/pvcu";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const traceId = typeof req.headers["x-trace-id"] === "string" ? req.headers["x-trace-id"] : createTraceId();
    const clientVersion = typeof req.headers["x-client-version"] === "string" ? req.headers["x-client-version"] : "unknown";
    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("X-Client-Version", CLIENT_VERSION);
    res.setHeader("X-PVCU-Version", PVCU_VERSION);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; frame-ancestors 'none';");
    if (req.path.startsWith("/api/") && clientVersion !== "unknown" && clientVersion !== CLIENT_VERSION) {
      return res.status(426).json({ error: { code: "PVC-5xx", message: "Cliente desatualizado" }, envelope: { validationStatus: "FAILED", traceId, profile: "ecommerce-safe", version: PVCU_VERSION } });
    }
    if (req.path.startsWith("/api/")) {
      const key = req.ip ?? "unknown";
      const now = Date.now();
      const current = requestCounts.get(key);
      if (!current || current.resetAt <= now) requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
      else if (current.count >= 120) return res.status(429).json({ error: { code: "PVC-4xx", message: "Muitas requisições" }, traceId });
      else current.count += 1;
    }
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
