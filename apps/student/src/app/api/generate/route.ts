import { NextResponse } from "next/server";
import { tryGenerateWithGroq } from "@/lib/generate/groq-optional";
import { generateDeterministic } from "@/lib/generate/deterministic";
import { parseGenerateRequest } from "@/lib/generate/parse-request";

export const runtime = "nodejs";

/**
 * `POST /api/generate` — `student_dev_EN.md` request/response shape.
 * Tries Groq if `GROQ_API_KEY` is set; always falls back to
 * deterministic local logic (demo-safe, no key required).
 */
export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = parseGenerateRequest(json);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Bad request" },
        { status: 400 }
      );
    }

    if (process.env.GROQ_API_KEY) {
      const ai = await tryGenerateWithGroq(payload);
      if (ai && isLikelyResponse(ai)) {
        return NextResponse.json(ai);
      }
    }

    return NextResponse.json(generateDeterministic(payload));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate route failed" },
      { status: 500 }
    );
  }
}

function isLikelyResponse(v: object): v is {
  career_map: unknown;
  financial_route: unknown;
  portfolio_block: unknown;
} {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.career_map) &&
    o.financial_route !== undefined &&
    typeof o.portfolio_block === "string"
  );
}
