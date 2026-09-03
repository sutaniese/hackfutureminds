import { groqChat, isGroqConfigured, extractJsonObject } from "@/lib/learning/groq-chat";
import {
  fallbackGeneratedTasks,
  fallbackTopicNotes,
  parseGeneratedTasks,
  parseTopicNotes,
  type GeneratedTask,
  type TopicNotes,
} from "@/lib/learning/constructor-generate";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type Body = {
  kind?: "tasks" | "notes";
  title?: string;
  subject?: string;
  grade?: number;
  language?: "ru" | "kk";
  goal?: string;
  skills?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const kind = body?.kind === "notes" ? "notes" : "tasks";
  const title = body?.title?.trim() || "Тема";
  const subject = body?.subject?.trim() || "math";
  const grade = body?.grade || 9;
  const language = body?.language === "kk" ? "kk" : "ru";
  const goal = body?.goal?.trim() || "";
  const skills = body?.skills?.trim() || title;

  if (kind === "notes") {
    const notes = await generateNotes({ title, subject, grade, language, goal });
    return json({ notes, source: notes.source });
  }

  const tasks = await generateTasks({ title, subject, grade, language, goal, skills });
  return json({ tasks: tasks.tasks, source: tasks.source });
}

async function generateTasks(input: {
  title: string;
  subject: string;
  grade: number;
  language: string;
  goal: string;
  skills: string;
}): Promise<{ tasks: GeneratedTask[]; source: "ai" | "fallback" }> {
  const local = fallbackGeneratedTasks(input.title, input.skills.split(",")[0] || input.title);
  if (!isGroqConfigured()) return { tasks: local, source: "fallback" };

  const result = await groqChat(
    [
      {
        role: "system",
        content: `Ты учитель. Верни JSON {"tasks":[...]} — 3 задания: difficulty 1, 2 и 3.
Каждое: prompt, options (4 строки), answerIndex (0-3), explanation, difficulty, skillId.
Язык: ${input.language}. Без markdown.`,
      },
      {
        role: "user",
        content: `Тема: ${input.title}\nПредмет: ${input.subject}\nКласс: ${input.grade}\nЦель: ${input.goal}\nНавыки: ${input.skills}`,
      },
    ],
    { maxTokens: 1200, temperature: 0.3, json: true, reasoningEffort: "low" },
  );
  const parsed = parseGeneratedTasks(extractJsonObject(result.content));
  if (parsed?.length) return { tasks: parsed, source: "ai" };
  return { tasks: local, source: "fallback" };
}

async function generateNotes(input: {
  title: string;
  subject: string;
  grade: number;
  language: string;
  goal: string;
}): Promise<{ notes: TopicNotes; source: "ai" | "fallback" }> {
  const local = fallbackTopicNotes(input.title, input.goal);
  if (!isGroqConfigured()) return { notes: local, source: "fallback" };

  const result = await groqChat(
    [
      {
        role: "system",
        content: `Ты учитель. Верни JSON конспект:
{"keyIdea":"...","formula":"...","bullets":["...","...","..."],"example":"...","mistake":"..."}
Коротко, для ученика. Язык: ${input.language}.`,
      },
      {
        role: "user",
        content: `Тема: ${input.title}\nПредмет: ${input.subject}\nКласс: ${input.grade}\nЦель: ${input.goal}`,
      },
    ],
    { maxTokens: 700, temperature: 0.2, json: true, reasoningEffort: "low" },
  );
  const parsed = parseTopicNotes(extractJsonObject(result.content));
  if (parsed) return { notes: parsed, source: "ai" };
  return { notes: local, source: "fallback" };
}
