import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

// Records real browser interactions and adds explicitly synthetic narration.
// Requires local HTTP server, Chromium, espeak-ng, ffprobe and ffmpeg.
const scenes = [
  {
    title: "8-Puzzle Lab · Aayush Dwivedi · 24BCT0058",
    text: "Welcome to Eight Puzzle Lab, an Artificial Intelligence digital assignment prepared for Aayush Dwivedi, registration number twenty four B C T zero zero five eight. The allocation table assigns algorithm number three, Depth Limited Search. Only this assigned algorithm is implemented. The eight puzzle has eight numbered tiles and one blank on a three by three grid. Each legal move swaps the blank with one adjacent tile. The task is to find a sequence of moves from an initial configuration to a chosen goal.",
    action: async (p) => {
      await p.goto("http://127.0.0.1:8080/");
      await p.evaluate(() => document.fonts.ready);
    },
  },
  {
    title: "Set the states and depth bound · 0 denotes the blank",
    text: "The setup panel accepts both an initial state and a goal state. Each number from zero through eight must occur exactly once. Zero, or an underscore, represents the blank. The default example is two moves from the standard goal. Presets include the example in the assignment. Random generation performs legal moves from the selected goal, so the resulting puzzle is solvable relative to that goal. A depth limit is the maximum number of moves the search may explore along any branch. Here the limit is two.",
    action: async (p) => {
      await p.locator("#depth-limit").fill("2");
    },
  },
  {
    title: "Inspect one expansion · parent, successors, open stack and history",
    text: "Take the first search step. Depth Limited Search explores depth first in the fixed order up, right, down, then left. It checks for the goal before checking the depth bound, so a goal exactly at the bound succeeds. This root expansion generates four legal successors. The open stack shows pending visits, with the next visit first. Expanded history is observational, not a global visited set. Only ancestors on the active path are excluded, preserving valid revisits reached later with more remaining depth. Pause, resume, and previous and next controls make this process inspectable.",
    action: async (p) => {
      await p.locator("#next").click();
      await p.locator(".trace-section").scrollIntoViewIfNeeded();
    },
  },
  {
    title: "Solution found · Down → Right · 2 moves, cost 2",
    text: "Resume the search at instant speed. The solution contains two blank moves, down followed by right. Each move has unit cost, so the path cost is two. Play solution animates the tiles on the large board, and individual solution states can also be selected. Generated nodes count the root and successor visits admitted to the frontier. Expanded nodes count visits whose successors were generated. The time measures computation, excluding animation and pauses. Memory is a logical estimate, not a browser heap measurement. D L S does not generally guarantee a shortest path.",
    action: async (p) => {
      await p.locator("#speed").selectOption("0");
      await p.locator("#pause").click();
      await p.locator("#result").waitFor({ state: "visible" });
      await p.locator("#result").scrollIntoViewIfNeeded();
      await p.locator("#play-solution").click();
    },
  },
  {
    title: "A cutoff is inconclusive · the bound prevented further exploration",
    text: "Now reset and choose a depth limit of one. The result is depth limit reached. This is a cutoff: the bound prevented further exploration before the goal could be found. It does not prove the puzzle is unsolvable. By contrast, an initial state whose inversion parity differs from the goal is rejected before search. The application also has a fifty thousand visit safeguard to keep the browser responsive. Reaching that resource limit is inconclusive too. Reset cancels pending playback, and editing either puzzle state clears stale experiment results.",
    action: async (p) => {
      await p.locator("#reset").click();
      await p.locator("#depth-limit").fill("1");
      await p.locator("#run").click();
      await p.locator("#result").waitFor({ state: "visible" });
      await p.locator("#result").scrollIntoViewIfNeeded();
    },
  },
  {
    title: "Compare measured DLS runs at independent depth limits",
    text: "The comparison page runs D L S independently at limits zero, two, four, and eight on exactly the same initial and goal states. These are independent experiments, not iterative deepening. The zero limit cuts off immediately. A limit of two solves this example. Higher limits can explore more branches before reaching the same goal, increasing generated and expanded visits even when the solution length stays unchanged. All displayed values come from actual runs. Since only D L S is assigned, no other search algorithms or invented benchmark results are included.",
    action: async (p) => {
      await p.goto("http://127.0.0.1:8080/#compare");
      await p.locator("#compare-run").click();
      await p.waitForFunction(() =>
        document
          .querySelector("#comparison-status")
          .textContent.startsWith("Experiment complete"),
      );
    },
  },
  {
    title: "DLS · O(b^ℓ) time · O(bℓ) search storage · no heuristic",
    text: "The algorithm page explains the working principle, pseudocode, advantages, and limitations. For branching factor b and limit L, worst case time is b to the power L, while search working storage is proportional to b times L. Visualization history adds separate bounded storage. D L S is complete within the chosen finite bound when allowed to finish, but not for deeper goals, and it is not optimal. It is an uninformed search and uses no heuristic. The project uses H T M L, C S S, JavaScript, and Bootstrap, with tests and deployment on GitHub Pages. This walkthrough uses synthetic narration.",
    action: async (p) => {
      await p.goto("http://127.0.0.1:8080/#algorithm");
    },
  },
];
await mkdir("tmp/demo", { recursive: true });
const durations = [];
for (let i = 0; i < scenes.length; i++) {
  execFileSync(
    "espeak-ng",
    ["-s", "155", "-v", "en-us", "-w", `tmp/demo/${i}.wav`, "--stdin"],
    { input: scenes[i].text },
  );
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `tmp/demo/${i}.wav`,
    "-af",
    "apad=pad_dur=1",
    `tmp/demo/padded-${i}.wav`,
  ]);
  durations.push(
    Number(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          `tmp/demo/padded-${i}.wav`,
        ],
        { encoding: "utf8" },
      ),
    ),
  );
}
await writeFile(
  "tmp/demo/audio-list.txt",
  scenes.map((_, i) => `file 'padded-${i}.wav'`).join("\n"),
);
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  "tmp/demo/audio-list.txt",
  "-c",
  "copy",
  "tmp/demo/narration.wav",
]);
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
const started = Date.now();
for (let i = 0; i < scenes.length; i++) {
  await scenes[i].action(page);
  await page.evaluate((title) => {
    document.querySelector("#demo-caption")?.remove();
    const caption = document.createElement("div");
    caption.id = "demo-caption";
    caption.textContent = title + "  •  Synthetic narration";
    caption.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;background:#153b32;color:#edf4df;padding:14px 28px;font:600 16px Manrope,sans-serif;text-align:center;z-index:10";
    document.body.append(caption);
  }, scenes[i].title);
  console.log(`Scene ${i + 1}/${scenes.length}: ${scenes[i].title}`);
  await page.waitForTimeout(durations[i] * 1000);
}
if (Date.now() - started < 181000)
  await page.waitForTimeout(181000 - (Date.now() - started));
await context.close();
await video.saveAs("tmp/demo/walkthrough.webm");
await browser.close();
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "tmp/demo/walkthrough.webm",
  "-i",
  "tmp/demo/narration.wav",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "27",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-af",
  "apad",
  "-shortest",
  "-movflags",
  "+faststart",
  "docs/24BCT0058-dls-demo.mp4",
]);
console.log("Created docs/24BCT0058-dls-demo.mp4");
