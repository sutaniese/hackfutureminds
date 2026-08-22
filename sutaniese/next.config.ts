import type { NextConfig } from "next";

// Keep this minimal: custom `outputFileTracingRoot` is easy to misconfigure on Vercel.
// For local “wrong workspace root” warnings, see the README (Deploy / Vercel).
const nextConfig: NextConfig = {};

export default nextConfig;
