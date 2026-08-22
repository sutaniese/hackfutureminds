const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rawPath = path.join(root, "data", "grants_raw.json");

const SOURCES = [
  "https://bolashak.gov.kz/ru/strany-predostavlyayushchie-granty",
  "https://bolashak.gov.kz/ru/usloviya-i-dokumenty",
  "https://bolashak.gov.kz/ru/pretendentu",
  "https://edu.gov.kz",
];

async function refresh() {
  console.log("Starting Vesper scrape...");
  console.log("Sources:", SOURCES.join(", "));

  // Cursor MCP provides the Vesper extractor interactively. For scheduled jobs,
  // place the latest MCP/Vesper export into data/grants_raw.json before running
  // this script, or replace this block with your hosted Vesper API call.
  const raw = JSON.parse(await fs.readFile(rawPath, "utf8"));
  raw.refreshed_at = new Date().toISOString();
  raw.refresh_note =
    "Refresh script reused the latest Vesper export. Configure hosted Vesper API here for cron automation.";
  await fs.writeFile(rawPath, `${JSON.stringify(raw, null, 2)}\n`);

  const clean = spawnSync(process.execPath, [path.join(__dirname, "clean-grants-with-claude.js")], {
    stdio: "inherit",
    env: process.env,
  });
  if (clean.status !== 0) throw new Error("Claude cleaning failed.");

  const seed = spawnSync(process.execPath, [path.join(__dirname, "seed-grants.js")], {
    stdio: "inherit",
    env: process.env,
  });
  if (seed.status !== 0) throw new Error("Supabase seed failed.");

  console.log("Grants refreshed:", new Date().toISOString());
}

refresh().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
