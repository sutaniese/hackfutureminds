import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** This app lives in `sutaniese/`, not the monorepo root. Fixes tracing + lockfile heuristics. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
