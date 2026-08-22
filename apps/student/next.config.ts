import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// When the repo is a monorepo, this keeps `next build` + file tracing inside this app folder
// (Vercel sets the working directory to Root Directory, e.g. `sutaniese/`).
const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDir,
  transpilePackages: ["@pathwise/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
};

export default nextConfig;
