import { chromium } from "playwright";
const browser = await chromium.launch({
  channel: "chromium",
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/docs/submission.html");
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: "docs/24BCT0058-submission.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
