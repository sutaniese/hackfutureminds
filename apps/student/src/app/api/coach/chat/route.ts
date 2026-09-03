import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { requireUserResponse, HttpError } from "@/lib/server/require-user";
import { teacherAgentChat } from "@/lib/server/teacher-agent";
import { userFacingAiError, COACH_UNAVAILABLE } from "@/lib/learning/ai-error-hint";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type Body = {
  message?: string;
  spoken?: boolean;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  classId?: string;
  studentId?: string;
  learning?: {
    grade?: number;
    subjectId?: string;
    weakTopics?: string[];
    topicTitle?: string;
    theory?: string[];
  };
};

const STUDENT_SYSTEM = `Ты — AI-наставник ученика teñ. Отвечай коротко, голосом: 2–4 предложения, без markdown.
Опирайся только на контекст этого ученика (класс, предмет, слабые темы, конспект). Не упоминай других учеников.
Язык — язык вопроса.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const message = body?.message?.trim() ?? "";
  if (!message) return json({ error: "Required: message" }, 400);

  const spokenHint = body?.spoken
    ? "Ответ должен звучать вслух: коротко, без списков."
    : "";

  if (isSupabaseConfigured()) {
    const { user, error } = await requireUserResponse();
    if (error) {
      // Guest student tutor is still allowed with the caller's own learning snapshot.
    } else if (user.role === "teacher") {
      try {
        const result = await teacherAgentChat(user, {
          studentId: body?.studentId,
          classId: body?.classId,
          message: `${spokenHint}\n${message}`.trim(),
        });
        return json({ reply: result.reply, source: result.source, role: "teacher" });
      } catch (err) {
        if (err instanceof HttpError) return json({ error: err.message }, err.status);
        return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
      }
    }
  }

  if (!isGroqConfigured()) {
    return json({ reply: COACH_UNAVAILABLE, source: "local", role: "student" });
  }

  const learning = body?.learning;
  const context = [
    `Класс: ${learning?.grade ?? "не указан"}`,
    `Предмет: ${learning?.subjectId ?? "не указан"}`,
    `Тема: ${learning?.topicTitle ?? "не указана"}`,
    learning?.weakTopics?.length ? `Слабые темы: ${learning.weakTopics.join(", ")}` : "",
    learning?.theory?.length ? `Конспект:\n${learning.theory.slice(0, 6).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const history = (body?.history ?? []).slice(-8).map((item) => ({
    role: item.role,
    content: item.text,
  }));

  const { content, error } = await groqChat(
    [
      { role: "system", content: `${STUDENT_SYSTEM}\n${spokenHint}\n\n${context}` },
      ...history,
      { role: "user", content: message },
    ],
    { maxTokens: 500, temperature: 0.4, reasoningEffort: "low" },
  );

  if (!content) {
    return json({ reply: userFacingAiError(error, COACH_UNAVAILABLE), source: "local", role: "student" });
  }
  return json({ reply: content.replace(/[`*#]/g, "").trim().slice(0, 1200), source: "ai", role: "student" });
}
