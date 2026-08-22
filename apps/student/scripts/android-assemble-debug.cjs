const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const studentRoot = path.join(__dirname, "..");
const androidDir = path.join(studentRoot, "android");

const sdk =
  process.env.ANDROID_HOME ||
  path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Android", "Sdk");

if (!fs.existsSync(path.join(sdk, "platform-tools"))) {
  console.error(
    "Android SDK not found. Install Android Studio or set ANDROID_HOME.\nExpected:",
    sdk,
  );
  process.exit(1);
}

const isWin = process.platform === "win32";
const gradle = isWin ? "gradlew.bat" : "./gradlew";
const r = spawnSync(gradle, ["assembleDebug"], {
  cwd: androidDir,
  env: { ...process.env, ANDROID_HOME: sdk },
  stdio: "inherit",
  shell: isWin,
});

process.exit(r.status === null ? 1 : r.status);
