import { clipPublicPath, fallbackLiveClipScript, videoClipFor } from "@pathwise/shared";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { parseBeatsFromModel, fallbackBeats, type LearningClip } from "@/lib/learning/clips/types";
import { parseLiveClipScriptFromModel } from "@/lib/learning/clips/live-script";
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
  const title = (body.title || localized?.title || "").trim();
  const prompt = (body.prompt || localized?.theory.join(" ") || title).trim();
  const skillId = (body.skillId || localized?.skills[0] || title).trim();
  return {
    title: title || (language === "kk" ? "Тақырып" : "Тема"),
    prompt: prompt || title,
    skillId: skillId || title,
    subject: body.subject || localized?.subjectId,
    grade: body.grade ?? localized?.grades[0],
  };
}

function systemPrompt(language: "ru" | "kk"): string {
  const langName = language === "kk" ? "қазақ тілінде" : "на русском языке";
  return `Ты режиссёр 40–60-секундного учебного клипа. Ответ — только JSON, без markdown.
Язык всех строк: ${langName}.
Схема:
{"title":"string","durationSec":48,"language":"${language}","scenes":[{"id":"s1","heading":"string","body":"string?","formula":"string?","narration":"string","visual":"formula"|"bullets"|"diagram"|"compare"}],"quiz":{"question":"string","options":["a","b","c"],"correctIndex":0,"explanation":"string","skillId":"string"}}
Правила:
- 3–6 сцен, не больше 6.
- Суммарно 120–140 слов narration, чтобы звучание заняло 40–60 секунд.
- formulas — обычный текст, безопасный для KaTeX (без $ и без \\n внутри формулы).
- quiz.options ровно 3 строки, correctIndex 0|1|2.
- Не выдумывай факты сверх текста учителя.`;
}

async function generateScript(body: GenerateBody, language: "ru" | "kk") {
  const seed = teacherPrompt(body, language);
  const fallbackInput = {
    title: seed.title,
    prompt: seed.prompt,
    language,
    skillId: seed.skillId,
    subject: seed.subject,
    grade: seed.grade,
  };
  const fallback = fallbackLiveClipScript(fallbackInput);

  if (!isGroqConfigured()) {
    return { script: fallback, source: "fallback" as const };
  }

  const messages = [
    { role: "system" as const, content: systemPrompt(language) },
    {
      role: "user" as const,
      content:
        language === "kk"
          ? `Тақырып: ${seed.title}\nПән: ${seed.subject ?? ""}\nСынып: ${seed.grade ?? ""}\nМұғалімнің мәтіні:\n${seed.prompt}`
          : `Тема: ${seed.title}\nПредмет: ${seed.subject ?? ""}\nКласс: ${seed.grade ?? ""}\nТекст учителя:\n${seed.prompt}`,
    },
  ];

  const first = await groqChat(messages, { maxTokens: 1100, temperature: 0.3 });
  const parsed = parseLiveClipScriptFromModel(first.content);
  if (parsed.ok) return { script: parsed.script, source: "ai" as const };

  const retry = await groqChat(
    [
      ...messages,
      { role: "assistant" as const, content: first.content || "" },
      {
        role: "user" as const,
        content:
          language === "kk"
            ? "JSON схемасы бұзылған. Толық жарамды JSON ғана қайтар, басқа мәтінсіз."
            : "JSON не подошёл к схеме. Верни только полный валидный JSON, без текста вокруг.",
      },
    ],
    { maxTokens: 1100, temperature: 0.1 },
  );
  const second = parseLiveClipScriptFromModel(retry.content);
  if (second.ok) return { script: second.script, source: "ai" as const };

  return { script: fallback, source: "fallback" as const };
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
    const { script, source } = await generateScript(body ?? {}, language);
    return json({ script, source });
  }

  const topicId = body.topicId || "math-quadratic";
  const locale = language;
  const baked = bakedClipFor(topicId, locale);
  if (baked) return json({ clip: baked, source: "baked" });

  const topic = findTopic(BASE_TOPICS, topicId);
  const localized = topic ? localizeTopic(topic, locale) : null;
  if (!localized) {
    const { script, source } = await generateScript(body, language);
    return json({ script, source });
  }

  const { script, source: scriptSource } = await generateScript(
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
  let source: "ai" | "local" | "script" = scriptSource === "ai" ? "ai" : "local";
  if (isGroqConfigured() && scriptSource !== "ai") {
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
  return json({ clip, script, source: source === "local" ? scriptSource : source });
}
