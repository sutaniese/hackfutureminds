import type { GenerateRequest, GenerateResponse } from "@/types/generate";

/** Groq OpenAI-compatible base URL */
const GROQ_CHAT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * If `GROQ_API_KEY` is set, try one JSON-shaped chat completion; on any
 * failure, callers should fall back to the deterministic local engine.
 */
export async function tryGenerateWithGroq(
  request: GenerateRequest
): Promise<GenerateResponse | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const model =
    process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  const userContent = `You are a JSON API. Given this student input, output ONLY a valid JSON object (no markdown, no backticks) with this exact shape:
{"career_map": [{"title": string, "salary_kzt": string, "description": string, "vacancies": [{"title": string, "company": string, "url": string}] }],
"financial_route": {"monthly_cost": number, "grants": [{"name": string, "amount": number, "deadline": string, "match": "low"|"medium"|"high"}], "gap": number, "coverage_percent": number},
"portfolio_block": string}
Use Kazakhstan market context. 3 career paths, realistic KZT salary band strings, 1-2 plausible vacancy search URLs (e.g. hh.kz). Keep grants plausible.

Input JSON:
${JSON.stringify(request).slice(0, 12_000)}`;

  let res: Response;
  try {
    res = await fetch(GROQ_CHAT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4_096,
        temperature: 0.3,
        messages: [
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let data: {
    choices?: { message?: { content?: string } }[];
  };
  try {
    data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
  } catch {
    return null;
  }
  const out = data.choices?.[0]?.message?.content?.trim() ?? "";
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
