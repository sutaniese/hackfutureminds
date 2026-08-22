import { NextResponse } from "next/server";

/**
 * Smallest route to test that the deployment runs this Next app. Open `/api/health` on Vercel; if
 * this 404s but a static Vercel page still appears, the build output is not this project.
 */
export function GET() {
  return NextResponse.json({ ok: true, service: "sutaniese" }, { status: 200 });
}
