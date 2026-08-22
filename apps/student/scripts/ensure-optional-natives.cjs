/**
 * Tailwind 4 and lightningcss ship platform-specific .node files as optional dependencies.
 * npm may skip them (Node 18 + engines on optional packages, cross-OS node_modules, etc.).
 * This script fetches the matching linux-x64 tgz if the binary is still missing.
 *
 * Set SKIP_OPTIONAL_NATIVE=1 to skip (e.g. offline, or you only build on another OS).
 */
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const skip = process.env.SKIP_OPTIONAL_NATIVE === "1" || process.env.SKIP_OPTIONAL_NATIVE === "true";
if (skip) process.exit(0);

if (process.platform !== "linux" || process.arch !== "x64") {
  process.exit(0);
}

const root = path.join(__dirname, "..");
const nodeModules = path.join(root, "node_modules");

function isMusl() {
  try {
    return fs.readFileSync("/usr/bin/ldd", "utf8").includes("musl");
  } catch {
    return false;
  }
}

const glibcOrMusl = isMusl() ? "musl" : "gnu";

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function doReq(href) {
      const f = fs.createWriteStream(dest);
      https
        .get(href, (r) => {
          if (r.statusCode && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
            f.close();
            try {
              fs.unlinkSync(dest);
            } catch {
              /* */
            }
            r.destroy();
            doReq(new URL(r.headers.location, href).href);
            return;
          }
          if (r.statusCode !== 200) {
            f.close();
            try {
              fs.unlinkSync(dest);
            } catch {
              /* */
            }
            r.resume();
            reject(new Error(`GET ${href} -> ${r.statusCode}`));
            return;
          }
          r.pipe(f);
          f.on("finish", () => f.close((e) => (e ? reject(e) : resolve())));
        })
        .on("error", (e) => {
          f.destroy();
          try {
            fs.unlinkSync(dest);
          } catch {
            /* */
          }
          reject(e);
        });
    }
    doReq(url);
  });
}

function extractTgzToNodeModule(tgzPath, targetDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "n-native-"));
  try {
    execFileSync("tar", ["-xzf", tgzPath, "-C", tmp], { stdio: "ignore" });
    const packed = path.join(tmp, "package");
    if (!fs.existsSync(packed)) {
      throw new Error("tarball had no package/ root");
    }
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.cpSync(packed, targetDir, { recursive: true });
  } finally {
    try {
      fs.rmSync(tgzPath, { force: true });
    } catch {
      /* */
    }
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* */
    }
  }
}

function ensureNpmTgz(tgzUrl, finalDir, markerFile) {
  if (fs.existsSync(path.join(finalDir, markerFile))) {
    return Promise.resolve();
  }
  const tgz = path.join(os.tmpdir(), `n-${path.basename(tgzUrl)}`);
  // eslint-disable-next-line no-console -- one-line hint for long installs
  console.warn(`[sutaniese] missing native ${path.basename(finalDir)}; downloading…`);
  return downloadFile(tgzUrl, tgz)
    .then(() => {
      extractTgzToNodeModule(tgz, finalDir);
    })
    .then(() => {
      if (!fs.existsSync(path.join(finalDir, markerFile))) {
        throw new Error(`After extract, still missing: ${markerFile}`);
      }
    });
}

const oxide = readJson(path.join(nodeModules, "@tailwindcss", "oxide", "package.json"));
const lc = readJson(path.join(nodeModules, "lightningcss", "package.json"));
const oxideV = oxide?.version;
const lcV = lc?.version;
if (!oxideV || !lcV) {
  process.exit(0);
}

const oxideName = `oxide-linux-x64-${glibcOrMusl}`;
const lcName = `lightningcss-linux-x64-${glibcOrMusl}`;
const tailwindTgz = `https://registry.npmjs.org/@tailwindcss/${oxideName}/-/${oxideName}-${oxideV}.tgz`;
const lcTgz = `https://registry.npmjs.org/${lcName}/-/${lcName}-${lcV}.tgz`;

const tailwindDest = path.join(nodeModules, "@tailwindcss", oxideName);
const lcDest = path.join(nodeModules, lcName);
const twMarker = `tailwindcss-oxide.linux-x64-${glibcOrMusl}.node`;
const lcMarker = `lightningcss.linux-x64-${glibcOrMusl}.node`;

Promise.resolve()
  .then(() => ensureNpmTgz(tailwindTgz, tailwindDest, twMarker))
  .then(() => ensureNpmTgz(lcTgz, lcDest, lcMarker))
  .then(() => process.exit(0))
  .catch((e) => {
    console.warn("[sutaniese] ensure-optional-natives (non-fatal):", e.message || e);
    process.exit(0);
  });
