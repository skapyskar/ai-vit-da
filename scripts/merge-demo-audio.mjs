import { execFileSync } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";

// Scene boundaries from docs/demo-narration.txt, in seconds.
const boundaries = [0, 23.96, 50.08, 82.24, 112.4, 137.48, 167.48, 197.44];
const directory = process.argv[2];
if (!directory) {
  throw new Error("Usage: node scripts/merge-demo-audio.mjs <audio-directory>");
}
const video = "docs/24BCT0058-dls-demo.mp4";
const output = "tmp/demo-narrated.mp4";
const inputs = [];
const filters = [];
for (let i = 0; i < boundaries.length - 1; i++) {
  const file = resolve(directory, `${i + 1}.ogg`);
  const duration = Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
      ],
      { encoding: "utf8" },
    ).trim(),
  );
  const window = boundaries[i + 1] - boundaries[i];
  if (!Number.isFinite(duration) || duration <= 0 || duration > window * 1.1) {
    throw new Error(
      `Recording ${i + 1} has an unexpected duration: ${duration}`,
    );
  }
  // Leave short clips at their recorded pace. For an overrun, retain every
  // word with a small pitch-preserving speed adjustment and a 0.2 second pause.
  const tempo = duration > window ? duration / (window - 0.2) : 1;
  inputs.push("-i", file);
  filters.push(
    `[${i + 1}:a:0]asetpts=PTS-STARTPTS,aresample=48000,` +
      `aformat=sample_fmts=fltp:channel_layouts=mono,atempo=${tempo},` +
      `apad,atrim=duration=${window},asetpts=PTS-STARTPTS[a${i}]`,
  );
  console.log(
    `Recording ${i + 1}: start ${boundaries[i].toFixed(3)}s, ` +
      `input ${duration.toFixed(3)}s, speed ${tempo.toFixed(4)}x, ` +
      `pause about ${(window - duration / tempo).toFixed(3)}s`,
  );
}
filters.push(
  boundaries
    .slice(1)
    .map((_, i) => `[a${i}]`)
    .join("") + "concat=n=7:v=0:a=1[narration]",
);
await mkdir("tmp", { recursive: true });
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-v",
    "error",
    "-i",
    video,
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "0:v:0",
    "-map",
    "[narration]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(boundaries.at(-1)),
    "-movflags",
    "+faststart",
    output,
  ],
  { stdio: "inherit" },
);
// Replace the submission video only after FFmpeg finishes successfully.
await rename(output, video);
console.log(`Saved ${video}`);
