import { groqChat, isGroqConfigured, extractJsonObject } from "@/lib/learning/groq-chat";
import { compactClassContext, publishTopic } from "@/lib/server/class-service";
import { HttpError, type AuthedUser } from "@/lib/server/require-user";
import type { Topic } from "@/lib/learning/types";
import { createServerSupabase } from "@/lib/supabase/server";

const SYSTEM = `Ты — ИИ-ассистент учителя на платформе teñ.
Отвечай коротко, на языке учителя. Опирайся ТОЛЬКО на compact context pack ниже — не выдумывай учеников.
Если просят «кто застрял на Ньютоне» — назови имена из atRisk/weakTopics.
Если просят план на 20 минут — 3 шага.
Если просят черновик заданий или опубликовать тему — верни в конце блок:
<<PUBLISH_TOPIC>>
{"id":"custom-...","subjectId":"math","title":"...","grades":[9],"summary":"...","skills":["..."],"theory":["..."],"materials":[],"tasks":[{"id":"...","topicId":"...","type":"single","difficulty":1,"skill":"...","prompt":"...","options":["a","b","c","d"],"answer":0,"explanation":"...","minutes":3}],"custom":true}
<<END_PUBLISH>>
`;

function fallbackReply(pack: unknown, message: string): string {
  const text = message.toLowerCase();
  const json = JSON.stringify(pack, null, 2);
  if (text.includes("newton") || text.includes("ньютон")) {
    return `Смотрю compact pack. Ученики с пробелом phys-newton перечислены в atRisk/weakTopics. Если список пуст — диагностика ещё не дошла.\n\n${json}`;
  }
  if (text.includes("план") || text.includes("20")) {
    return "20 минут: 5 мин конспект слабой темы, 10 мин два задания из банка, 5 мин повтор ошибки. Источник — локальный движок, без выдуманных учеников.";
  }
  return `По compact pack класса: ${json.slice(0, 1200)}`;
}

export async function teacherAgentChat(
  user: AuthedUser,
  input: { studentId?: string; classId?: string; message: string; publish?: boolean },
) {
  if (user.role !== "teacher") throw new HttpError(403, "Только для учителя.");
  const pack = await compactClassContext(user, input.studentId || "", input.classId);
  const supabase = await createServerSupabase();

  if (supabase && pack.student) {
    await supabase.from("agent_messages").insert({
      teacher_id: user.id,
      student_id: pack.student.id,
      class_id: pack.class?.id ?? null,
      role: "user",
      text: input.message,
    });
  }

  let reply = fallbackReply(pack, input.message);
  let source: "ai" | "fallback" = "fallback";
  if (isGroqConfigured()) {
    const result = await groqChat(
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Compact context:\n${JSON.stringify(pack)}\n\nВопрос учителя:\n${input.message}`,
        },
      ],
      { maxTokens: 900, temperature: 0.3 },
    );
    if (result.content) {
      reply = result.content;
      source = "ai";
    }
  }

  let published: Topic | null = null;
  const start = reply.indexOf("<<PUBLISH_TOPIC>>");
  const end = reply.indexOf("<<END_PUBLISH>>");
  if (start >= 0 && end > start && pack.class) {
    const raw = reply.slice(start + "<<PUBLISH_TOPIC>>".length, end);
    const topic = extractJsonObject<Topic>(raw);
    if (topic?.title && topic.tasks?.length && (input.publish !== false)) {
      const id = topic.id || `custom-agent-${Date.now().toString(36)}`;
      published = await publishTopic(user, pack.class.id, {
        ...topic,
        id,
        subjectId: topic.subjectId || pack.student?.subjectId || "math",
        grades: topic.grades?.length ? topic.grades : [9],
        theory: topic.theory?.length ? topic.theory : ["Черновик агента."],
        skills: topic.skills?.length ? topic.skills : [topic.title],
        materials: topic.materials ?? [],
        tasks: topic.tasks.map((task, index) => ({
          ...task,
          id: task.id || `${id}-task-${index + 1}`,
          topicId: id,
          type: task.type || "single",
          difficulty: task.difficulty || 1,
          minutes: task.minutes || 3,
        })),
        custom: true,
      });
      reply = `${reply.slice(0, start).trim()}\n\nОпубликовано в класс: «${published.title}».`;
    }
  }

  if (supabase && pack.student) {
    await supabase.from("agent_messages").insert({
      teacher_id: user.id,
      student_id: pack.student.id,
      class_id: pack.class?.id ?? null,
      role: "assistant",
      text: reply,
    });
  }

  return { reply, source, published, pack };
}

export async function teacherAgentHistory(user: AuthedUser, studentId: string) {
  const supabase = await createServerSupabase();
  if (!supabase) return { messages: [] };
  const { data } = await supabase
    .from("agent_messages")
    .select("role, text, created_at")
    .eq("teacher_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true })
    .limit(40);
  return {
    messages: (data ?? []).map((row) => ({
      role: row.role as "user" | "assistant",
      text: row.text,
      ts: row.created_at,
    })),
  };
}
