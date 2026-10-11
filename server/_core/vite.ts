import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Where the built client lives.
 *
 * Two supported layouts, because the same function is used by `pnpm build`
 * (server bundled to `dist/index.js`, client to `dist/public`) and by
 * `NODE_ENV=production tsx server/_core/index.ts` (running from source):
 *
 *   - bundled server:  <root>/dist/index.js      → <root>/dist/public
 *   - source server:   <root>/server/_core/*.ts  → <root>/dist/public
 *
 * The previous implementation resolved `../public` from the bundle, i.e.
 * `<root>/public`, which never exists — production served an empty directory
 * and every request ended in an ENOENT on `index.html`.
 */
export function resolveStaticDir(): string {
  const candidates = [
    path.resolve(import.meta.dirname, "public"), // dist/index.js → dist/public
    path.resolve(import.meta.dirname, "../..", "dist", "public"), // server/_core → dist/public
  ];
  return pickStaticDir(candidates);
}

/**
 * Pure selection logic, exported so it can be tested against temporary
 * fixtures instead of whatever happens to be on disk during a test run.
 *
 * A candidate only counts when it actually contains a built `index.html`;
 * otherwise the first candidate is returned so the error message names a real
 * path instead of crashing on `undefined`.
 */
export function pickStaticDir(candidates: string[]): string {
  const found = candidates.find(dir =>
    fs.existsSync(path.join(dir, "index.html"))
  );
  if (found) return found;
  console.error(
    `Could not find the build directory (looked in: ${candidates.join(", ")}). Run "pnpm build" first.`
  );
  return candidates[0];
}

export function serveStatic(app: Express) {
  const distPath = resolveStaticDir();

  // Hashed assets are immutable; HTML must always be revalidated so a deploy
  // is picked up without a hard refresh.
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    })
  );

  // SPA fallback: every non-asset route renders the client router, which is
  // what makes deep links such as /produto/<handle> work on a hard refresh.
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
