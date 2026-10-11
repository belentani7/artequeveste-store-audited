import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { pickStaticDir, resolveStaticDir } from "./_core/vite";

/**
 * Regression cover for the production bug where `serveStatic` looked for the
 * built client in `server/_core/public` (i.e. `<root>/public`), which never
 * exists — every production request ended in an ENOENT on `index.html`.
 */
const fixtures: string[] = [];

function fixtureDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aqv-static-"));
  fixtures.push(dir);
  return dir;
}

function withIndexHtml(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "index.html"),
    '<!doctype html><div id="root"></div>'
  );
  return dir;
}

afterAll(() => {
  for (const dir of fixtures) fs.rmSync(dir, { recursive: true, force: true });
});

describe("pickStaticDir", () => {
  it("prefers the first candidate that really contains a built index.html", () => {
    const root = fixtureDir();
    const bundled = withIndexHtml(path.join(root, "dist", "public"));

    expect(pickStaticDir([path.join(root, "public"), bundled])).toBe(bundled);
  });

  it("ignores directories that exist but were never built", () => {
    const root = fixtureDir();
    fs.mkdirSync(path.join(root, "public"), { recursive: true }); // exists, no index.html
    const built = withIndexHtml(path.join(root, "dist", "public"));

    expect(pickStaticDir([path.join(root, "public"), built])).toBe(built);
  });

  it("falls back to the first candidate (and logs) when nothing is built", () => {
    const root = fixtureDir();
    const missing = path.join(root, "dist", "public");

    expect(pickStaticDir([missing])).toBe(missing);
  });
});

describe("resolveStaticDir", () => {
  it("points at dist/public so a production boot cannot serve an empty folder", () => {
    // This test file lives in server/; the resolver lives in server/_core/.
    expect(resolveStaticDir()).toBe(
      path.resolve(import.meta.dirname, "..", "dist", "public")
    );
  });

  it("ships the campaign assets and crawler files the storefront references", () => {
    const publicDir = path.resolve(
      import.meta.dirname,
      "..",
      "client",
      "public"
    );
    for (const asset of [
      path.join("campaign", "aqv-2026-campaign-hero.jpg"),
      path.join("campaign", "aqv-2026-material-detail.jpg"),
      "robots.txt",
      "sitemap.xml",
    ]) {
      expect(
        fs.existsSync(path.join(publicDir, asset)),
        `missing client/public/${asset}`
      ).toBe(true);
    }
  });
});
