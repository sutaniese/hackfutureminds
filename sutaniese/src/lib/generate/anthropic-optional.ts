import type { GenerateRequest, GenerateResponse } from "@/types/generate";

const API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * If `ANTHROPIC_API_KEY` is set, try one structured JSON call; on any
 * failure, callers should fall back to the deterministic local engine.
 */
export async function tryGenerateWithAnthropic(
  request: GenerateRequest
): Promise<GenerateResponse | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const model =
    process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";
  const prompt = `You are a JSON API. Given this student input, output ONLY a JSON object (no markdown) with shape:
{"career_map": [{"title": string, "salary_kzt": string, "description": string, "vacancies": [{"title": string, "company": string, "url": string}] }],
"financial_route": {"monthly_cost": number, "grants": [{"name": string, "amount": number, "deadline": string, "match": "low"|"medium"|"high"}], "gap": number, "coverage_percent": number},
"portfolio_block": string}
Kazakhstan market context. 3 career paths, realistic KZT salary band strings, 1-2 hh.kz style vacancy URLs for Kazakhstan. Keep grants plausible.

Input JSON:
${JSON.stringify(request).slice(0, 12_000)}`;

  let res: Response;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4_096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: { type: string; text: string }[];
  };
  const out =
    data.content
      ?.filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim() ?? "";
  if (!out) return null;
  const first = out.indexOf("{");
  const last = out.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(
      out.slice(first, last + 1)
    ) as GenerateResponse;
  } catch {
    return null;
  }
}
