import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getStorefrontStatus } from "./shopify";
import {
  contentSecurityPolicy,
  checkRateLimit,
  pruneRateLimiter,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  type RateBucket,
} from "./security";
import { CLIENT_VERSION, PVCU_VERSION, createTraceId } from "../../shared/pvcu";

const isProduction = process.env.NODE_ENV === "production";

/** JSON bodies in this storefront are tiny; 50 MB was a template default. */
const JSON_BODY_LIMIT = "512kb";

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
  const requestCounts = new Map<string, RateBucket>();
  let lastPruneAt = 0;

  app.disable("x-powered-by");
  // The storefront runs behind the preview/edge proxy: trusting exactly one hop
  // makes `req.ip` the real client for rate limiting without letting a caller
  // spoof an arbitrary X-Forwarded-For chain.
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const traceId =
      typeof req.headers["x-trace-id"] === "string"
        ? req.headers["x-trace-id"]
        : createTraceId();
    const clientVersion =
      typeof req.headers["x-client-version"] === "string"
        ? req.headers["x-client-version"]
        : "unknown";

    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("X-Client-Version", CLIENT_VERSION);
    res.setHeader("X-PVCU-Version", PVCU_VERSION);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(self)"
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      contentSecurityPolicy(isProduction)
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
      res.setHeader("X-Frame-Options", "DENY");
    }

    // Health probes are exempt from the client-version gate: monitors do not
    // send our custom header, and they must never be told to "update".
    if (req.path === "/api/health") {
      next();
      return;
    }

    if (
      req.path.startsWith("/api/") &&
      clientVersion !== "unknown" &&
      clientVersion !== CLIENT_VERSION
    ) {
      return res.status(426).json({
        error: { code: "PVC-5xx", message: "Cliente desatualizado" },
        envelope: {
          validationStatus: "FAILED",
          traceId,
          profile: "ecommerce-safe",
          version: PVCU_VERSION,
        },
      });
    }

    if (req.path.startsWith("/api/")) {
      const now = Date.now();
      if (now - lastPruneAt > RATE_LIMIT_WINDOW_MS) {
        pruneRateLimiter(requestCounts, now);
        lastPruneAt = now;
      }
      const decision = checkRateLimit(requestCounts, req.ip ?? "unknown", now);
      if (!decision.allowed) {
        res.setHeader("Retry-After", String(decision.retryAfterSeconds));
        return res.status(429).json({
          error: { code: "PVC-4xx", message: "Muitas requisições" },
          traceId,
        });
      }
      res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
      res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    }

    next();
  });

  /**
   * Liveness/readiness probe. Dependency-free by design: it must not fail
   * because Shopify is slow, and it must never leak a token — only whether the
   * store is configured.
   */
  app.get("/api/health", (_req, res) => {
    const status = getStorefrontStatus();
    res.status(200).json({
      ok: true,
      service: "artequeveste-store",
      clientVersion: CLIENT_VERSION,
      pvcuVersion: PVCU_VERSION,
      environment: isProduction ? "production" : "development",
      commerce: {
        mode: status.mode,
        apiVersion: status.apiVersion,
        storeConfigured: status.mode === "live",
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: JSON_BODY_LIMIT, extended: true }));
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(
      `Server running on http://localhost:${port}/ (${isProduction ? "production" : "development"})`
    );
  });
}

startServer().catch(console.error);
