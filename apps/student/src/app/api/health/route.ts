import { NextResponse } from "next/server";
import { getGroqApiKey } from "@/lib/groq-env";

/**
 * Smallest route to test that the deployment runs this Next app. Open `/api/health` on Vercel; if
 * this 404s but a static Vercel page still appears, the build output is not this project.
 *
 * `ai` is true when the server process can read a non-empty AI API key (after trim). It does
 * not prove the key is valid. `.env.local` is not used on Vercel unless you set the
 * same variable in the project’s Environment Variables and redeploy.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, service: "sutaniese", ai: Boolean(getGroqApiKey()) },
    { status: 200 },
  );
}
