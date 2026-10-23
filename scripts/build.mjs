import { cp, mkdir, rm, writeFile } from "node:fs/promises";

// Publish an explicit allowlist rather than source-control or dependency files.
await rm("_site", { recursive: true, force: true });
await mkdir("_site", { recursive: true });
for (const path of [
  "index.html",
  "css",
  "js",
  "assets",
  "images",
  "docs",
  "Artificial Intelligence QP 1.pdf",
]) {
  await cp(path, `_site/${path}`, { recursive: true });
}
await writeFile("_site/.nojekyll", "");
console.log("Static site prepared in _site/");
