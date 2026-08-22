import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// When the repo is a monorepo, this keeps `next build` + file tracing inside this app folder
// (Vercel sets the working directory to Root Directory, e.g. `sutaniese/`).
const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Vite portal dev server (must match `apps/portal` `server.port`). */
const portalProxy =
  process.env.PORTAL_PROXY_URL ?? "http://127.0.0.1:5174";

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDir,
  transpilePackages: ["@pathwise/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
  /**
   * Single-site dev: everything is served from this app’s origin. The Vite
   * portal lives under `/hub/*`; its dev APIs stay at `/api/*` (no overlap
   * with Next route handlers: `/api/generate`, `/api/health`).
   */
  async rewrites() {
    const p = portalProxy.replace(/\/$/, "");
    return [
      { source: "/hub", destination: `${p}/hub/` },
      { source: "/hub/", destination: `${p}/hub/` },
      { source: "/hub/:path*", destination: `${p}/hub/:path*` },
      { source: "/api/career-compare", destination: `${p}/api/career-compare` },
      {
        source: "/api/recommendation-letter",
        destination: `${p}/api/recommendation-letter`,
      },
      { source: "/api/crm-sync", destination: `${p}/api/crm-sync` },
      { source: "/api/agent/:path*", destination: `${p}/api/agent/:path*` },
      { source: "/api/students", destination: `${p}/api/students` },
      { source: "/api/students/:path*", destination: `${p}/api/students/:path*` },
      { source: "/api/classes", destination: `${p}/api/classes` },
      { source: "/api/classes/:path*", destination: `${p}/api/classes/:path*` },
    ];
  },
};

export default nextConfig;
