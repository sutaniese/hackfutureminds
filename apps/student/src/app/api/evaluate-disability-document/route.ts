import { NextResponse } from "next/server";
import type {
  DisabilitySupportType,
  DisabilityDocumentEvaluation,
} from "@/lib/auth";

export const runtime = "nodejs";

type EvaluateRequest = {
  supportTypes?: DisabilitySupportType[];
  notes?: string;
  document?: {
    name?: string;
    type?: string;
    size?: number;
    dataUrl?: string;
  };
};

type GroqMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.slice(0, 5000) : fallback;
}

function isImageDataUrl(value: string | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}

function buildPrompt(input: EvaluateRequest) {
  const supportTypes = input.supportTypes?.length
    ? input.supportTypes.join(", ")
    : "not selected";
  const document = input.document;

  return [
    "You are an accessibility intake assistant for a student career guidance app in Kazakhstan.",
    "Evaluate the provided disability/support document only for educational accommodations.",
    "Do not diagnose. Do not make final legal or medical decisions.",
    "Return strict JSON only. No markdown.",
    "",
    "JSON schema:",
    "{",
    '  "status": "reviewed" | "needs_human_review",',
    '  "documentType": "string",',
    '  "summary": "string",',
    '  "confidence": number,',
    '  "detectedSupportTypes": string[],',
    '  "recommendedAccommodations": string[],',
    '  "caveats": string[]',
    "}",
    "",
    `Student selected support types: ${supportTypes}`,
    `Student notes: ${safeString(input.notes, "none")}`,
    `Document name: ${safeString(document?.name, "unknown")}`,
    `Document MIME type: ${safeString(document?.type, "unknown")}`,
    `Document size: ${typeof document?.size === "number" ? document.size : "unknown"} bytes`,
    "",
    "If the file cannot be read or is not an image, infer only from metadata and notes, set status to needs_human_review, and explain that a human must verify the document.",
  ].join("\n");
}

function fallbackEvaluation(input: EvaluateRequest): DisabilityDocumentEvaluation {
  return {
    status: "needs_human_review",
    documentType: input.document?.type || "unknown",
    summary:
      "Документ сохранён для проверки, но автоматическая оценка недоступна без настроенного Groq API.",
    confidence: 0,
    detectedSupportTypes: input.supportTypes ?? [],
    recommendedAccommodations: [
      "Проверить документ вручную перед принятием решений.",
      "Использовать комментарий ученика для временных образовательных адаптаций.",
    ],
    caveats: ["Нужен GROQ_API_KEY в .env.local."],
    evaluatedAt: Date.now(),
  };
}

function parseEvaluation(content: string, input: EvaluateRequest): DisabilityDocumentEvaluation {
  try {
    const parsed = JSON.parse(content) as Partial<DisabilityDocumentEvaluation>;
    const status =
      parsed.status === "reviewed" || parsed.status === "needs_human_review"
        ? parsed.status
        : "needs_human_review";
    return {
      status,
      documentType: safeString(parsed.documentType, input.document?.type || "unknown"),
      summary: safeString(parsed.summary, "Документ требует ручной проверки."),
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      detectedSupportTypes: Array.isArray(parsed.detectedSupportTypes)
        ? parsed.detectedSupportTypes.filter((item): item is DisabilitySupportType =>
            typeof item === "string",
          )
        : input.supportTypes ?? [],
      recommendedAccommodations: Array.isArray(parsed.recommendedAccommodations)
        ? parsed.recommendedAccommodations.filter((item): item is string => typeof item === "string")
        : [],
      caveats: Array.isArray(parsed.caveats)
        ? parsed.caveats.filter((item): item is string => typeof item === "string")
        : ["AI output should be verified by a human."],
      evaluatedAt: Date.now(),
    };
  } catch {
    return {
      ...fallbackEvaluation(input),
      summary: content.slice(0, 1000) || "Groq returned an unreadable evaluation.",
      caveats: ["Groq response was not valid JSON; human review required."],
    };
  }
}

export async function POST(request: Request) {
  let input: EvaluateRequest;
  try {
    input = (await request.json()) as EvaluateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    return NextResponse.json({ evaluation: fallbackEvaluation(input) }, { status: 200 });
  }

  const prompt = buildPrompt(input);
  const imageUrl = input.document?.dataUrl;
  const content: GroqMessageContent = isImageDataUrl(imageUrl)
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl as string } },
      ]
    : prompt;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You evaluate accessibility support documents for educational accommodations. Return JSON only.",
        },
        { role: "user", content },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return jsonError(`Groq evaluation failed: ${text || response.statusText}`, response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const output = data.choices?.[0]?.message?.content;
  if (!output) return jsonError("Groq returned an empty evaluation.", 502);

  return NextResponse.json({ evaluation: parseEvaluation(output, input) });
}
