import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type ExtractRequest = {
  fileName?: string;
  mimeType?: string;
  text?: string;
  dataUrl?: string;
};

type ExtractedStudent = {
  displayName: string;
  age: number;
  city: string;
  language: "ru" | "kk" | "en";
  target_university: string;
  interests: string[];
  achievements: string[];
  primaryCareerTitle: string;
  portfolio_block: string;
  monthly_cost: number;
  needsFinancialHelp: boolean;
};

function fallbackStudent(input: ExtractRequest): ExtractedStudent {
  const source = [input.fileName, input.text].filter(Boolean).join("\n").toLowerCase();
  const nameFromFile = input.fileName?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

  const interests = [
    source.includes("math") || source.includes("мат") ? "математика" : "",
    source.includes("program") || source.includes("код") || source.includes("it") ? "программирование" : "",
    source.includes("bio") || source.includes("био") ? "биология" : "",
    source.includes("business") || source.includes("бизнес") ? "бизнес" : "",
  ].filter(Boolean);

  return {
    displayName: nameFromFile || "Новый ученик",
    age: 16,
    city: "Казахстан",
    language: "ru",
    target_university: "Подобрать после анализа",
    interests: interests.length ? interests : ["интересы из файла"],
    achievements: input.text
      ? input.text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 8)
          .slice(0, 4)
      : ["Файл прикреплён для дальнейшего анализа"],
    primaryCareerTitle: interests.includes("программирование")
      ? "IT / Software"
      : interests.includes("биология")
        ? "Medicine / Biology"
        : "Карьерное направление уточняется",
    portfolio_block: input.text?.slice(0, 700) || `Родитель загрузил файл ${input.fileName || "student file"}.`,
    monthly_cost: 120000,
    needsFinancialHelp: source.includes("grant") || source.includes("грант") || source.includes("budget"),
  };
}

function cleanStudent(value: Partial<ExtractedStudent>, input: ExtractRequest): ExtractedStudent {
  const fallback = fallbackStudent(input);
  return {
    displayName: typeof value.displayName === "string" && value.displayName.trim() ? value.displayName.trim() : fallback.displayName,
    age: typeof value.age === "number" && value.age >= 10 && value.age <= 25 ? Math.round(value.age) : fallback.age,
    city: typeof value.city === "string" && value.city.trim() ? value.city.trim() : fallback.city,
    language: value.language === "kk" || value.language === "en" || value.language === "ru" ? value.language : fallback.language,
    target_university:
      typeof value.target_university === "string" && value.target_university.trim()
        ? value.target_university.trim()
        : fallback.target_university,
    interests: Array.isArray(value.interests)
      ? value.interests.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : fallback.interests,
    achievements: Array.isArray(value.achievements)
      ? value.achievements.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : fallback.achievements,
    primaryCareerTitle:
      typeof value.primaryCareerTitle === "string" && value.primaryCareerTitle.trim()
        ? value.primaryCareerTitle.trim()
        : fallback.primaryCareerTitle,
    portfolio_block:
      typeof value.portfolio_block === "string" && value.portfolio_block.trim()
        ? value.portfolio_block.trim()
        : fallback.portfolio_block,
    monthly_cost:
      typeof value.monthly_cost === "number" && value.monthly_cost >= 0 ? Math.round(value.monthly_cost) : fallback.monthly_cost,
    needsFinancialHelp:
      typeof value.needsFinancialHelp === "boolean" ? value.needsFinancialHelp : fallback.needsFinancialHelp,
  };
}

export async function POST(request: Request) {
  let input: ExtractRequest;
  try {
    input = (await request.json()) as ExtractRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!input.fileName && !input.text && !input.dataUrl) {
    return NextResponse.json({ error: "Missing file content." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    return NextResponse.json({ student: fallbackStudent(input), source: "local-fallback" });
  }

  const prompt = [
    "Extract a Kazakhstan student profile for a parent dashboard from the provided file.",
    "Use only information visible in the file. If missing, use conservative defaults.",
    "Return strict JSON only, no markdown.",
    "",
    "JSON schema:",
    '{ "displayName": "string", "age": number, "city": "string", "language": "ru|kk|en", "target_university": "string", "interests": ["string"], "achievements": ["string"], "primaryCareerTitle": "string", "portfolio_block": "string", "monthly_cost": number, "needsFinancialHelp": boolean }',
    "",
    `File name: ${input.fileName || "unknown"}`,
    `MIME type: ${input.mimeType || "unknown"}`,
    input.text ? `Text content:\n${input.text.slice(0, 12000)}` : "No machine-readable text was provided.",
  ].join("\n");

  const content =
    input.dataUrl && input.mimeType?.startsWith("image/")
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: input.dataUrl } },
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
          content: "You extract student profile data for PathWise. Return JSON only.",
        },
        { role: "user", content },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ student: fallbackStudent(input), source: "local-fallback" });
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return NextResponse.json({ student: fallbackStudent(input), source: "local-fallback" });

  try {
    return NextResponse.json({
      student: cleanStudent(JSON.parse(raw) as Partial<ExtractedStudent>, input),
      source: "groq",
    });
  } catch {
    return NextResponse.json({ student: fallbackStudent(input), source: "local-fallback" });
  }
}
