import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route("**/api/trpc/**", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await route.continue();
});
await page.goto("http://127.0.0.1:3000/produto/exemplo-inexistente", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(350);
const loadingVisible = await page.getByText("Preparando a peça").isVisible();
const cartVisible = await page.getByRole("button", { name: "Abrir carrinho" }).isVisible();
await page.screenshot({ path: "/tmp/artequeveste-pdp-loading-2026.png", fullPage: false });
console.log(JSON.stringify({ loadingVisible, cartVisible, screenshot: "/tmp/artequeveste-pdp-loading-2026.png" }));
await browser.close();
