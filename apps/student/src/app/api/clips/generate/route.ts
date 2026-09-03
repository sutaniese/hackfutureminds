import { clipPublicPath, videoClipFor } from "@pathwise/shared";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { parseBeatsFromModel, fallbackBeats, type LearningClip } from "@/lib/learning/clips/types";
import { generateLiveClipScript, teacherFallbackLine } from "@/lib/learning/clips/generate-live-script";
import { bakedClipFor, localClipForTopic } from "@/lib/learning/clips";
import { BASE_TOPICS, findTopic } from "@/lib/learning/catalog";
import { localizeTopic } from "@/lib/learning/kk-overlay";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type GenerateBody = {
  topicId?: string;
  locale?: string;
  language?: string;
  prompt?: string;
  subject?: string;
  grade?: number;
  title?: string;
  skillId?: string;
};

function langOf(body: GenerateBody | null, request: Request): "ru" | "kk" {
  const fromQuery = new URL(request.url).searchParams.get("locale");
  const raw = body?.language || body?.locale || fromQuery || "ru";
  return raw === "kk" ? "kk" : "ru";
}

function teacherPrompt(body: GenerateBody, language: "ru" | "kk"): {
  title: string;
  prompt: string;
  skillId: string;
  subject?: string;
  grade?: number;
} {
  const topic = body.topicId ? findTopic(BASE_TOPICS, body.topicId) : null;
  const localized = topic ? localizeTopic(topic, language) : null;
  const rawTitle = (body.title || localized?.title || "").trim();
  const prompt = (body.prompt || localized?.theory.join(" ") || rawTitle).trim();
  const skillId = (body.skillId || localized?.skills[0] || rawTitle).trim();
  const titleLooksLikeBrief = rawTitle.length > 48 && prompt.startsWith(rawTitle.slice(0, 40));
  const title = titleLooksLikeBrief
    ? localized?.title || (language === "kk" ? "Тақырып" : "Тема")
    : rawTitle || localized?.title || (language === "kk" ? "Тақырып" : "Тема");
  return {
    title: title || (language === "kk" ? "Тақырып" : "Тема"),
    prompt: prompt || title,
    skillId: skillId || title,
    subject: body.subject || localized?.subjectId,
    grade: body.grade ?? localized?.grades[0],
  };
}

async function generateScript(body: GenerateBody, language: "ru" | "kk") {
  const seed = teacherPrompt(body, language);
  const result = await generateLiveClipScript({
    title: seed.title,
    prompt: seed.prompt,
    language,
    skillId: seed.skillId,
    subject: seed.subject,
    grade: seed.grade,
  });
  return {
    ...result,
    notice: result.source === "fallback" ? teacherFallbackLine(result.reason, language) : null,
  };
}

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GenerateBody | null;
  const language = langOf(body, request);
  const wantsScript = Boolean(body?.prompt || body?.title || body?.language);

  if (wantsScript || !body?.topicId) {
    const generated = await generateScript(body ?? {}, language);
    return json({
      script: generated.script,
      source: generated.source,
      reason: generated.reason,
      notice: generated.notice,
      issues: generated.issues,
      model: generated.model,
    });
  }

  const topicId = body.topicId || "math-quadratic";
  const locale = language;
  const baked = bakedClipFor(topicId, locale);
  if (baked) return json({ clip: baked, source: "baked" });

  const topic = findTopic(BASE_TOPICS, topicId);
  const localized = topic ? localizeTopic(topic, locale) : null;
  if (!localized) {
    const generated = await generateScript(body, language);
    return json({
      script: generated.script,
      source: generated.source,
      reason: generated.reason,
      notice: generated.notice,
    });
  }

  const generated = await generateScript(
    {
      ...body,
      title: localized.title,
      prompt: localized.theory.join("\n"),
      skillId: localized.skills[0],
      subject: localized.subjectId,
      grade: localized.grades[0],
    },
    language,
  );

  let beats = fallbackBeats(localized.title, localized.theory, locale);
  let source: "ai" | "local" | "script" = generated.source === "ai" ? "ai" : "local";
  if (isGroqConfigured() && generated.source !== "ai") {
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
      { maxTokens: 800, temperature: 0.3, json: true, reasoningEffort: "low" },
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
  return json({
    clip,
    script: generated.script,
    source: source === "local" ? generated.source : source,
    reason: generated.reason,
    notice: generated.notice,
  });
}
