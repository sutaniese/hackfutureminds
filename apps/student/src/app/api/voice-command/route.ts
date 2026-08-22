import { NextResponse } from "next/server";
import { getGroqApiKey, getGroqChatModel } from "@/lib/groq-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow Groq chat to finish on Vercel (requires Pro for >10s; harmless on Hobby). */
export const maxDuration = 60;

const GROQ_FETCH_MS = 25_000;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type VoiceAction =
  | {
      action: "navigate";
      path: "/" | "/onboarding" | "/results" | "/roadmap" | "/grants" | "/portfolio" | "/support" | "/accessibility";
      speak: string;
    }
  | {
      action: "search_grants";
      path: "/grants";
      query?: string;
      match?: "all" | "high" | "medium" | "low";
      type?: "all" | "monthly" | "full" | "one_time";
      openFirst?: boolean;
      speak: string;
    }
  | {
      action: "explain";
      speak: string;
    };

type VoiceRequest = {
  command?: string;
  pathname?: string;
  locale?: "ru" | "en" | "kk";
};

const ALLOWED_PATHS = new Set([
  "/",
  "/onboarding",
  "/results",
  "/roadmap",
  "/grants",
  "/portfolio",
  "/support",
  "/accessibility",
]);

type AllowedPath = VoiceAction extends { action: "navigate"; path: infer P } ? P : never;

function cleanCommand(input: unknown) {
  return typeof input === "string" ? input.trim().slice(0, 600) : "";
}

function fallbackIntent(command: string): VoiceAction {
  const text = command.toLowerCase();
  const wantsOpen = /open|открой|аш|перейди|go/.test(text);
  const wantsSuitable = /suitable|подход|recommend|match|найди|find|grant|грант/.test(text);

  if (/grant|грант|стипенд|scholar/.test(text)) {
    return {
      action: "search_grants",
      path: "/grants",
      query: text.includes("bolashak") || text.includes("болаш") ? "bolashak" : undefined,
      match: wantsSuitable ? "high" : "all",
      openFirst: wantsOpen && /first|перв|луч|best|подход|suitable|подходящ/i.test(text),
      speak: wantsOpen
        ? "Открываю раздел грантов и подбираю подходящие варианты."
        : "Открываю гранты и включаю подбор подходящих вариантов.",
    };
  }
  if (/roadmap|дорож|карта|future|будущ/.test(text)) {
    return { action: "navigate", path: "/roadmap", speak: "Открываю персональную дорожную карту." };
  }
  if (/plan|план|result|результ/.test(text)) {
    return { action: "navigate", path: "/results", speak: "Открываю персональный план." };
  }
  if (/portfolio|портф/.test(text)) {
    return { action: "navigate", path: "/portfolio", speak: "Открываю портфолио." };
  }
  if (/support|поддерж|accessibility|доступ/.test(text)) {
    return { action: "navigate", path: "/support", speak: "Открываю страницу поддержки." };
  }
  if (/start|onboard|старт|онборд/.test(text)) {
    return { action: "navigate", path: "/onboarding", speak: "Открываю онбординг." };
  }
  return {
    action: "explain",
    speak:
      "Я могу открыть старт, план, дорожную карту, гранты, портфолио или поддержку. Например: открой гранты и найди подходящие.",
  };
}

function isGrantSearchCommand(command: string) {
  const text = command.toLowerCase();
  return /grant|грант|стипенд|scholar/.test(text) && /suitable|подход|recommend|match|найди|find|луч/.test(text);
}

function normalizeIntent(value: unknown, command: string): VoiceAction {
  if (!value || typeof value !== "object") return fallbackIntent(command);
  const data = value as Record<string, unknown>;
  const action = data.action;

  if (isGrantSearchCommand(command) && (action === "navigate" || action === "explain")) {
    return fallbackIntent(command);
  }

  if (action === "navigate" && typeof data.path === "string" && ALLOWED_PATHS.has(data.path)) {
    return {
      action,
      path: data.path as AllowedPath,
      speak: typeof data.speak === "string" ? data.speak.slice(0, 280) : "Открываю раздел.",
    };
  }

  if (action === "search_grants") {
    const match = data.match === "high" || data.match === "medium" || data.match === "low" || data.match === "all"
      ? data.match
      : "high";
    const type = data.type === "monthly" || data.type === "full" || data.type === "one_time" || data.type === "all"
      ? data.type
      : undefined;
    return {
      action,
      path: "/grants",
      query: typeof data.query === "string" ? data.query.slice(0, 80) : undefined,
      match,
      type,
      openFirst: data.openFirst === true,
      speak: typeof data.speak === "string" ? data.speak.slice(0, 280) : "Открываю гранты.",
    };
  }

  if (action === "explain") {
    return {
      action,
      speak: typeof data.speak === "string" ? data.speak.slice(0, 280) : fallbackIntent(command).speak,
    };
  }

  return fallbackIntent(command);
}

function parseGroqChatJson(text: string): { choices?: Array<{ message?: { content?: string } }> } | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) return null;
  try {
    return JSON.parse(trimmed) as { choices?: Array<{ message?: { content?: string } }> };
  } catch {
    return null;
  }
}

/** Strip optional ```json fences and parse model output. */
function parseModelActionJson(content: string): unknown {
  let s = content.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function buildPrompt(input: VoiceRequest, command: string) {
  return [
    "You are a voice accessibility controller for PathWise, a student guidance web app.",
    "Return strict JSON only. No markdown.",
    "The user may be blind or unable to use hands, so convert speech into one safe UI action.",
    "",
    "Allowed JSON actions:",
    '{"action":"navigate","path":"/|/onboarding|/results|/roadmap|/grants|/portfolio|/support|/accessibility","speak":"short response"}',
    '{"action":"search_grants","path":"/grants","query":"optional search text","match":"all|high|medium|low","type":"all|monthly|full|one_time","openFirst":boolean,"speak":"short response"}',
    '{"action":"explain","speak":"short help response"}',
    "",
    "Rules:",
    "- Never output URLs outside the app.",
    "- Use search_grants when the user asks to find suitable grants/scholarships.",
    "- Set openFirst=true only when the user explicitly asks to open the best/first suitable grant.",
    "- Keep speak in the user's likely language.",
    "",
    `Current path: ${input.pathname || "/"}`,
    `Locale: ${input.locale || "ru"}`,
    `Command: ${command}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let command = "";
  try {
    let input: VoiceRequest;
    try {
      input = (await request.json()) as VoiceRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    command = cleanCommand(input.command);
    if (!command) return NextResponse.json({ error: "Empty voice command." }, { status: 400 });

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json({ intent: fallbackIntent(command), source: "fallback" });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(GROQ_FETCH_MS),
      body: JSON.stringify({
        model: getGroqChatModel(DEFAULT_MODEL),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You convert accessibility voice commands into one safe JSON UI action. Return JSON only.",
          },
          { role: "user", content: buildPrompt(input, command) },
        ],
      }),
    });

    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      return NextResponse.json({ intent: fallbackIntent(command), source: "fallback" });
    }

    const data = parseGroqChatJson(raw);
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? parseModelActionJson(content) : null;
    return NextResponse.json({ intent: normalizeIntent(parsed, command), source: "groq" });
  } catch (err) {
    console.error("[voice-command]", err);
    const safe = command.trim() ? fallbackIntent(command) : fallbackIntent("help");
    return NextResponse.json({ intent: safe, source: "fallback" });
  }
}
