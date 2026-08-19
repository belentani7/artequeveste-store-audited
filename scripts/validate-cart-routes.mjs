import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const results = [];

for (const path of ["/produto/exemplo-inexistente", "/rota-que-nao-existe"]) {
  await page.goto(`http://127.0.0.1:3000${path}`, { waitUntil: "networkidle" });
  const cartButton = page.getByRole("button", { name: /Abrir carrinho/i });
  await cartButton.click();
  const dialog = page.getByRole("dialog", { name: "Carrinho de compras" });
  const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const focusStyle = await page.evaluate(() => { const node = document.activeElement; return node ? getComputedStyle(node).outlineStyle !== "none" || getComputedStyle(node).outlineWidth !== "0px" : false; });
  results.push({ path, opened: await dialog.isVisible(), focusedLabel, focusStyle });
  await page.keyboard.press("Escape");
  results[results.length - 1].escapeClosed = !(await dialog.isVisible().catch(() => false));
  await cartButton.click();
  await page.locator("div.fixed.inset-0").click({ position: { x: 6, y: 6 } });
  results[results.length - 1].outsideClosed = !(await dialog.isVisible().catch(() => false));
}

console.log(JSON.stringify(results));
await browser.close();
