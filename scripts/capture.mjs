import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("images", { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
});
await page.goto("http://127.0.0.1:8080/");
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: "images/visualizer-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 375, height: 900 });
await page.screenshot({ path: "images/visualizer-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 1100 });
await page.locator("#speed").selectOption("0");
await page.locator("#run").click();
await page.locator("#result").waitFor({ state: "visible" });
await page.locator("#result").screenshot({ path: "images/solution.png" });
await page.goto("http://127.0.0.1:8080/#compare");
await page.locator("#compare-run").click();
await page.waitForFunction(() =>
  document
    .querySelector("#comparison-status")
    .textContent.startsWith("Experiment complete"),
);
await page.screenshot({ path: "images/comparison.png", fullPage: true });
await browser.close();
