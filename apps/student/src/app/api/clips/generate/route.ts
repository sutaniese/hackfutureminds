import { clipPublicPath, videoClipFor } from "@pathwise/shared";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { parseBeatsFromModel, fallbackBeats, type LearningClip } from "@/lib/learning/clips/types";
import { liveClipFromModelText } from "@/lib/learning/clips/live-script";
import { bakedClipFor, localClipForTopic } from "@/lib/learning/clips";
import { BASE_TOPICS, findTopic } from "@/lib/learning/catalog";
import { localizeTopic } from "@/lib/learning/kk-overlay";
import type { LiveClipScript } from "@pathwise/shared";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const LIVE_SYSTEM = `Ты режиссёр короткого учебного клипа 40–60 секунд. Верни ТОЛЬКО JSON без markdown:
{"title":"...","durationSec":52,"language":"ru"|"kk","scenes":[{"id":"s1","heading":"...","body":"...","formula":"необязательно, без $","narration":"...","visual":"formula"|"bullets"|"diagram"|"compare"}],"quiz":{"question":"...","options":["a","b","c"],"correctIndex":0,"explanation":"...","skillId":"..."}}
Правила: 4–6 сцен; суммарно 120–140 слов narration; формулы обычным текстом (KaTeX-safe, без $); язык = language; quiz ровно 3 варианта.`;

export async function GET(request: Request) {
  const topicId = new URL(request.url).searchParams.get("topicId") || "math-quadratic";
  const locale = new URL(request.url).searchParams.get("locale") === "kk" ? "kk" : "ru";
  const video = videoClipFor(topicId, locale);
  const clip = bakedClipFor(topicId, locale) ?? localClipForTopic(topicId, locale);
  return json({
    clip,
    source: video ? "video" : "baked",
    videoUrl: clipPublicPath(topicId, locale),
  });
}

async function generateTeacherScript(input: {
  title: string;
  prompt: string;
  language: "ru" | "kk";
  subject?: string;
  grade?: number;
  skillId?: string;
}): Promise<{ script: LiveClipScript; source: "ai" | "fallback" }> {
  const fallbackInput = {
    title: input.title,
    prompt: input.prompt,
    language: input.language,
    skillId: input.skillId,
  };

  const ask = async () => {
    if (!isGroqConfigured()) return null;
    return groqChat(
      [
        { role: "system", content: LIVE_SYSTEM },
        {
          role: "user",
          content: `Тема: ${input.title}\nПредмет: ${input.subject || "не указан"}\nКласс: ${input.grade || "не указан"}\nЯзык: ${input.language}\nЧто объяснить:\n${input.prompt}`,
        },
      ],
      { maxTokens: 900, temperature: 0.35 },
    );
  };

  const first = await ask();
  let parsed = liveClipFromModelText(first?.content, fallbackInput);
  if (parsed.source !== "fallback") {
    return { script: parsed.script, source: "ai" };
  }

  const retry = first?.content ? await ask() : null;
  parsed = liveClipFromModelText(retry?.content ?? first?.content, fallbackInput);
  if (parsed.source !== "fallback") {
    return { script: parsed.script, source: "ai" };
  }
  return { script: parsed.script, source: "fallback" };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    topicId?: string;
    locale?: string;
    prompt?: string;
    title?: string;
    subject?: string;
    grade?: number;
    skillId?: string;
    mode?: "teacher" | "catalog";
  } | null;

  const locale = body?.locale === "kk" ? "kk" : "ru";
  const prompt = body?.prompt?.trim() ?? "";
  const teacherMode = body?.mode === "teacher" || prompt.length > 0;

  if (teacherMode) {
    const title = (body?.title || "").trim() || prompt.slice(0, 80) || (locale === "kk" ? "Тақырып" : "Тема");
    const { script, source } = await generateTeacherScript({
      title,
      prompt: prompt || title,
      language: locale,
      subject: body?.subject,
      grade: body?.grade,
      skillId: body?.skillId,
    });
    return json({ script, source, live: true });
  }

  const topicId = body?.topicId || "math-quadratic";
  const baked = bakedClipFor(topicId, locale);
  if (baked) return json({ clip: baked, source: "baked" });

  const topic = findTopic(BASE_TOPICS, topicId);
  const localized = topic ? localizeTopic(topic, locale) : null;
  if (!localized) return json({ error: "Topic not found" }, 404);

  let beats = fallbackBeats(localized.title, localized.theory, locale);
  let source: "ai" | "local" = "local";
  if (isGroqConfigured()) {
    const result = await groqChat(
      [
        {
          role: "system",
          content:
            'Ты режиссёр коротких учебных клипов. Верни JSON {"beats":[{"kind":"hook|idea|example|check","title":"...","text":"...","seconds":8}]} ровно 4 бита, язык как у пользователя, без видео.',
        },
        {
          role: "user",
          content: `Тема: ${localized.title}\nКонспект:\n${localized.theory.join("\n")}\nЯзык: ${locale}`,
        },
      ],
      { maxTokens: 500, temperature: 0.4 },
    );
    if (result.content) {
      beats = parseBeatsFromModel(result.content, localized.title, localized.theory);
      source = "ai";
    }
  }

  const clip: LearningClip = {
    id: `live-${topicId}-${Date.now().toString(36)}`,
    topicId,
    title: localized.title,
    locale,
    baked: false,
    quizTaskId: localized.tasks[0]?.id ?? "",
    beats,
  };
  return json({ clip, source });
}
