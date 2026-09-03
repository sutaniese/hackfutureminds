#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "../..");
const outDir = path.join(repo, "apps/student/public/clips");
const mobileDemoDir = path.join(repo, "apps/mobile/assets/clips");
const timings = JSON.parse(await readFile(path.join(root, "public/timings.json"), "utf8"));

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: root, ...opts });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function probe(file) {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration,size", "-show_streams", "-of", "json", file],
    { encoding: "utf8" },
  );
  return JSON.parse(result.stdout || "{}");
}

const DEMO = ["math-quadratic", "phys-newton", "inf-python"];
const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(timings);

await mkdir(outDir, { recursive: true });
await mkdir(mobileDemoDir, { recursive: true });

for (const id of ids) {
  const dest = path.join(outDir, `${id}.mp4`);
  if (process.env.SKIP_EXISTING === "1") {
    try {
      const info = await probe(dest);
      const duration = Number(info.format?.duration ?? 0);
      if (duration >= 40 && duration <= 60) {
        console.log(`skip existing ${id} (${duration.toFixed(1)}s)`);
        if (DEMO.includes(id)) {
          await copyFile(dest, path.join(mobileDemoDir, `${id}.mp4`));
        }
        continue;
      }
    } catch {
      /* render */
    }
  }
  console.log(`\n=== render ${id} ===`);
  await run("npx", [
    "remotion",
    "render",
    "src/index.ts",
    id,
    dest,
    "--concurrency=3",
    "--jpeg-quality=82",
    "--crf=28",
    "--log=info",
    "--chromium-flag=--no-sandbox",
    "--chromium-flag=--disable-setuid-sandbox",
    "--chromium-flag=--disable-dev-shm-usage",
  ]);
  const info = await probe(dest);
  const duration = Number(info.format?.duration ?? 0);
  const mb = Number(info.format?.size ?? 0) / (1024 * 1024);
  const hasAudio = (info.streams ?? []).some((s) => s.codec_type === "audio");
  console.log(`${id}: ${duration.toFixed(2)}s, ${mb.toFixed(2)} MB, audio=${hasAudio}`);
  if (duration < 40 || duration > 60) {
    throw new Error(`${id} duration ${duration} outside 40–60s`);
  }
  if (!hasAudio) throw new Error(`${id} has no audio`);
  if (DEMO.includes(id)) {
    await copyFile(dest, path.join(mobileDemoDir, `${id}.mp4`));
  }
}

console.log("\nAll requested clips rendered.");
