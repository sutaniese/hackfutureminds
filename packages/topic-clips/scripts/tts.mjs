#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const voiceDir = path.join(publicDir, "voice");
const scenesDir = path.join(root, ".cache", "scenes");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
    });
  });
}

async function probeDuration(file) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number(stdout.trim());
}

async function loadScripts() {
  const { stdout } = await run(process.execPath, [
    "--experimental-strip-types",
    "--no-warnings",
    path.join(root, "scripts", "dump-scripts.ts"),
  ]);
  return JSON.parse(stdout);
}

function voiceFor(locale) {
  return locale === "kk" ? "kk-KZ-DauletNeural" : "ru-RU-DmitryNeural";
}

async function synth(text, voice, outFile, rate) {
  await run(process.execPath === process.execPath ? "python3" : "python3", [
    "-m",
    "edge_tts",
    "--voice",
    voice,
    "--rate",
    rate,
    "--text",
    text,
    "--write-media",
    outFile,
  ]);
}

async function main() {
  const only = process.argv.slice(2);
  await mkdir(voiceDir, { recursive: true });
  await mkdir(scenesDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  const scripts = await loadScripts();
  const timings = {};

  for (const script of scripts) {
    if (only.length && !only.includes(script.id)) continue;
    const voice = voiceFor(script.locale);
    const sceneFiles = [];
    const sceneSeconds = [];
    for (let i = 0; i < script.scenes.length; i += 1) {
      const scene = script.scenes[i];
      const raw = path.join(scenesDir, `${script.id}-${i}.mp3`);
      if (scene.kind === "end" || !scene.voice.trim()) {
        await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "1.00", "-q:a", "9", raw]);
        sceneSeconds.push(1);
        sceneFiles.push(raw);
        continue;
      }
      await synth(scene.voice, voice, raw, "+8%");
      sceneSeconds.push(await probeDuration(raw));
      sceneFiles.push(raw);
    }

    const listFile = path.join(scenesDir, `${script.id}.txt`);
    await writeFile(listFile, sceneFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
    const concat = path.join(scenesDir, `${script.id}-concat.mp3`);
    await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", concat]);
    let totalVoice = await probeDuration(concat);
    const voiceMp3 = path.join(voiceDir, `${script.id}.mp3`);
    let tempo = 1;
    if (totalVoice > 56) tempo = totalVoice / 52;
    else if (totalVoice < 41) tempo = totalVoice / 46;
    tempo = Math.min(1.8, Math.max(0.7, tempo));
    if (Math.abs(tempo - 1) > 0.03) {
      await run("ffmpeg", ["-y", "-i", concat, "-filter:a", `atempo=${tempo.toFixed(3)}`, "-q:a", "6", voiceMp3]);
      sceneSeconds.forEach((seconds, i) => {
        sceneSeconds[i] = seconds / tempo;
      });
      // keep end card at 1s
      sceneSeconds[sceneSeconds.length - 1] = 1;
    } else {
      await run("ffmpeg", ["-y", "-i", concat, "-q:a", "6", voiceMp3]);
    }
    const audioSeconds = await probeDuration(voiceMp3);
    const totalSeconds = audioSeconds;
    timings[script.id] = {
      id: script.id,
      totalSeconds: Number(totalSeconds.toFixed(3)),
      sceneSeconds: sceneSeconds.map((n) => Number(n.toFixed(3))),
      voiceFile: `voice/${script.id}.mp3`,
    };
    console.log(`${script.id}: ${totalSeconds.toFixed(2)}s (tempo ${tempo.toFixed(2)})`);
  }

  const existingPath = path.join(publicDir, "timings.json");
  let merged = {};
  try {
    const { readFile } = await import("node:fs/promises");
    merged = JSON.parse(await readFile(existingPath, "utf8"));
  } catch {
    merged = {};
  }
  Object.assign(merged, timings);
  await writeFile(existingPath, `${JSON.stringify(merged, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
