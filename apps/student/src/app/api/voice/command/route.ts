import { NextResponse } from "next/server";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { parseVoiceControlCommand, type VoiceControlCommand } from "@/lib/voice/control-command";

export const runtime = "nodejs";
export const maxDuration = 30;

const UNCLEAR: VoiceControlCommand = {
  action: "noop",
  speak: "Не понял, повторите.",
};

function systemPrompt() {
  return `Ты голосовой контроллер приложения teñ. Верни ОДИН JSON-объект из белого списка. Никакого JS, eval, URL вне приложения.
Действия:
{"action":"navigate","target":"home|cabinet|learning|diagnostics|topic|clips|class|students|teacher_hub|mentor|universities|grants|onboarding|results|roadmap|portfolio|support|accessibility","subjectId":"math?","topicQuery":"?","speak":"..."}
{"action":"diagnostic","verb":"start|skip|dont_know","subjectId":"math?","speak":"..."}
{"action":"clip","verb":"play|pause|replay|open","topicQuery":"?","speak":"..."}
{"action":"join_class","inviteCode":"TN-XXXXXX","speak":"..."}
{"action":"language","locale":"ru|kk|en","speak":"..."}
{"action":"role","role":"student|teacher|parent","speak":"..."}
{"action":"back","speak":"..."}
{"action":"open_more","speak":"..."}
{"action":"logout","confirm":false,"speak":"..."}
{"action":"read_screen","speak":"..."}
{"action":"noop","speak":"Не понял, повторите."}
speak — одна короткая фраза подтверждения на языке команды.
«не знаю» на диагностике → diagnostic.dont_know. «пропусти» → skip.
«открой клип по производной» → clip.open topicQuery=производная.
Не выдумывай action вне списка.`;
}

export async function mapTranscriptToCommand(input: {
  command: string;
  pathname?: string;
  locale?: string;
  role?: string;
  grade?: number | null;
  screenText?: string;
}): Promise<{ command: VoiceControlCommand; source: "ai" | "local" }> {
  const text = input.command.trim().slice(0, 600);
  if (!text) return { command: UNCLEAR, source: "local" };

  if (!isGroqConfigured()) {
    return { command: { action: "noop", speak: "Голосовое управление сейчас недоступно: нет GROQ_API_KEY." }, source: "local" };
  }

  const user = [
    `Path: ${input.pathname || "/"}`,
    `Locale: ${input.locale || "ru"}`,
    `Role: ${input.role || "student"}`,
    `Grade: ${input.grade ?? ""}`,
    input.screenText ? `Screen: ${input.screenText.slice(0, 800)}` : "",
    `Transcript: ${text}`,
  ]
    .filter(Boolean)
    .join("\n");

  const first = await groqChat(
    [
      { role: "system", content: systemPrompt() },
      { role: "user", content: user },
    ],
    { maxTokens: 400, temperature: 0, json: true, reasoningEffort: "low", timeoutMs: 20_000 },
  );
  let parsed = parseVoiceControlCommand(safeJson(first.content));
  if (parsed) return { command: parsed, source: "ai" };

  const retry = await groqChat(
    [
      { role: "system", content: systemPrompt() },
      { role: "user", content: user },
      { role: "assistant", content: first.content || "{}" },
      { role: "user", content: "Только валидный JSON из белого списка. Если неясно — action noop." },
    ],
    { maxTokens: 400, temperature: 0, json: true, reasoningEffort: "low", timeoutMs: 20_000 },
  );
  parsed = parseVoiceControlCommand(safeJson(retry.content));
  return { command: parsed ?? UNCLEAR, source: parsed ? "ai" : "local" };
}

function safeJson(raw: string | null): unknown {
  if (!raw) return null;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(raw.slice(first, last + 1));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    command?: string;
    pathname?: string;
    locale?: string;
    role?: string;
    grade?: number | null;
    screenText?: string;
  } | null;
  const command = typeof body?.command === "string" ? body.command : "";
  if (!command.trim()) {
    return NextResponse.json({ error: "Empty voice command." }, { status: 400 });
  }
  const mapped = await mapTranscriptToCommand({
    command,
    pathname: body?.pathname,
    locale: body?.locale,
    role: body?.role,
    grade: body?.grade,
    screenText: body?.screenText,
  });
  return NextResponse.json({ command: mapped.command, intent: mapped.command, source: mapped.source });
}
