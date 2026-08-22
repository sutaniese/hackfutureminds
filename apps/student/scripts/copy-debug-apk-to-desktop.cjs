const fs = require("fs");
const os = require("os");
const path = require("path");

const studentRoot = path.join(__dirname, "..");
const apk = path.join(
  studentRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const desktop = path.join(os.homedir(), "Desktop", "ten-pathwise-debug.apk");

if (!fs.existsSync(apk)) {
  console.error("APK not found at:\n", apk);
  console.error("Build it first: npm run android:assemble-debug (JDK + Android SDK required).");
  process.exit(1);
}

fs.copyFileSync(apk, desktop);
console.log("Copied debug APK to:\n", desktop);
