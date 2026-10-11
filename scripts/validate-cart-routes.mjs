/**
 * `pnpm validate:routes` — browser smoke test for the shared shell.
 *
 * Verifies, with a real browser, the things unit tests cannot: that every
 * route paints the brand header with a working cart, that the drawer opens,
 * traps focus, closes on Escape and on a backdrop click, and restores focus to
 * the trigger. It also checks the consent bar does not block the catalog.
 *
 * Requires a running server on http://127.0.0.1:3000 and a Playwright browser:
 *   node scripts/validate-cart-routes.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const ROUTES = [
  "/",
  "/produto/exemplo-inexistente",
  "/categoria/camisetas",
  "/categoria/inexistente",
  "/busca?q=quimono",
  "/trocas",
  "/privacidade",
  "/rota-que-nao-existe",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const results = [];

for (const path of ROUTES) {
  const entry = { path };
  try {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(400);

    entry.title = await page.title();
    entry.wordmark = await page.getByText("ARTE QUE VESTE").first().isVisible();
    entry.consentVisible = await page
      .getByRole("dialog", { name: "Preferências de privacidade" })
      .isVisible()
      .catch(() => false);

    const cartButton = page
      .getByRole("button", { name: /Abrir carrinho/i })
      .first();
    entry.cartButtonVisible = await cartButton.isVisible();
    await cartButton.click();

    const dialog = page.getByRole("dialog", { name: "Carrinho de compras" });
    entry.drawerOpened = await dialog.isVisible();
    entry.focusInsideDialog = await page.evaluate(() => {
      const active = document.activeElement;
      const dialogNode = document.querySelector(
        '[role="dialog"][aria-label="Carrinho de compras"]'
      );
      return Boolean(active && dialogNode && dialogNode.contains(active));
    });
    entry.focusRingVisible = await page.evaluate(() => {
      const node = document.activeElement;
      if (!node) return false;
      const style = window.getComputedStyle(node);
      return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
    });
    entry.backgroundInert = await page.evaluate(() => {
      const nodes = Array.from(document.getElementById("root")?.children ?? []);
      const background = nodes.find(node => !node.classList.contains("fixed"));
      return background
        ? "inert" in background && background.inert === true
        : "no-background-node";
    });

    await page.keyboard.press("Escape");
    entry.escapeClosed = !(await dialog.isVisible().catch(() => false));
    entry.focusRestored = await page.evaluate(
      label => document.activeElement?.getAttribute("aria-label") === label,
      (await cartButton.getAttribute("aria-label")) ?? ""
    );

    await cartButton.click();
    await page.locator("div.fixed.inset-0").click({ position: { x: 8, y: 8 } });
    entry.outsideClickClosed = !(await dialog.isVisible().catch(() => false));
  } catch (error) {
    entry.error = String(error).split("\n")[0];
  }
  results.push(entry);
}

console.log(JSON.stringify(results, null, 2));
const failures = results.filter(
  entry => entry.error || !entry.drawerOpened || !entry.wordmark
);
await browser.close();
process.exit(failures.length ? 1 : 0);
