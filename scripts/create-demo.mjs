import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const scenes = [
  {
    seconds: 24,
    action: async (page) => page.goto("http://127.0.0.1:8080/"),
  },
  {
    seconds: 26,
    action: async (page) => page.locator("#depth-limit").fill("2"),
  },
  {
    seconds: 32,
    action: async (page) => {
      await page.locator("#next").click();
      await page.locator(".trace-section").scrollIntoViewIfNeeded();
    },
  },
  {
    seconds: 30,
    action: async (page) => {
      await page.locator("#speed").selectOption("0");
      await page.locator("#pause").click();
      await page.locator("#result").waitFor({ state: "visible" });
      await page.locator("#result").scrollIntoViewIfNeeded();
      await page.locator("#play-solution").click();
    },
  },
  {
    seconds: 25,
    action: async (page) => {
      await page.locator("#reset").click();
      await page.locator("#depth-limit").fill("1");
      await page.locator("#run").click();
      await page.locator("#result").waitFor({ state: "visible" });
      await page.locator("#result").scrollIntoViewIfNeeded();
    },
  },
  {
    seconds: 30,
    action: async (page) => {
      await page.goto("http://127.0.0.1:8080/#compare");
      await page.locator("#compare-run").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#comparison-status").textContent ===
          "Comparison complete.",
      );
    },
  },
  {
    seconds: 30,
    action: async (page) => page.goto("http://127.0.0.1:8080/#algorithm"),
  },
];
await mkdir("tmp/demo", { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: "tmp/demo", size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const video = page.video();
for (let i = 0; i < scenes.length; i++) {
  await scenes[i].action(page);
  console.log("Scene " + (i + 1) + "/" + scenes.length);
  await page.waitForTimeout(scenes[i].seconds * 1000);
}
await context.close();
await video.saveAs("tmp/demo/walkthrough.webm");
await browser.close();
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "tmp/demo/walkthrough.webm",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "26",
  "-pix_fmt",
  "yuv420p",
  "-an",
  "-movflags",
  "+faststart",
  "docs/24BCT0058-dls-demo.mp4",
]);
console.log("Saved demonstration video.");
