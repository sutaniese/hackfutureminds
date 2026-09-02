import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { parseBeatsFromModel, fallbackBeats, type LearningClip } from "@/lib/learning/clips/types";
import { bakedClipFor, localClipForTopic } from "@/lib/learning/clips";
import { BASE_TOPICS, findTopic } from "@/lib/learning/catalog";
import { localizeTopic } from "@/lib/learning/kk-overlay";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const topicId = new URL(request.url).searchParams.get("topicId") || "math-quadratic";
  const locale = new URL(request.url).searchParams.get("locale") === "kk" ? "kk" : "ru";
  const clip = bakedClipFor(topicId, locale) ?? localClipForTopic(topicId, locale);
  return json({ clip });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    topicId?: string;
    locale?: string;
  } | null;
  const topicId = body?.topicId || "math-quadratic";
  const locale = body?.locale === "kk" ? "kk" : "ru";
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
