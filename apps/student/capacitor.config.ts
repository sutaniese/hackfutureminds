import type { CapacitorConfig } from "@capacitor/cli";
import * as fs from "node:fs";
import * as path from "node:path";

/** Read CAPACITOR_SERVER_URL from apps/student/.env.local (no extra npm deps). */
function readEnvLocalCapUrl(): string | undefined {
  try {
    const filePath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(filePath)) return undefined;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const m = /^\s*CAPACITOR_SERVER_URL\s*=\s*(.*)$/.exec(line);
      if (m?.[1]) {
        return m[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

const liveUrl = (process.env.CAPACITOR_SERVER_URL?.trim() || readEnvLocalCapUrl()?.trim()) ?? "";

const config: CapacitorConfig = {
  appId: "com.pathwise.student",
  appName: "teñ PathWise",
  webDir: "www",
  ...(liveUrl
    ? {
        server: {
          url: liveUrl.replace(/\/$/, ""),
          androidScheme: "https",
        },
      }
    : {}),
};

export default config;
