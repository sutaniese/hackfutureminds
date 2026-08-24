import { NextResponse } from "next/server";
import { groqChat, isGroqConfigured, type GroqMessage } from "@/lib/learning/groq-chat";

export const runtime = "nodejs";
export const maxDuration = 30;

type TutorMessage = { role: "user" | "assistant"; text: string };

type TutorRequest = {
  question?: string;
  topicTitle?: string;
  subjectTitle?: string;
  grade?: number;
  theory?: string[];
  history?: TutorMessage[];
};

type TutorResponse = {
  answer: string;
  source: "ai" | "local";
};

const AI_UNAVAILABLE =
  "AI-репетитор сейчас недоступен. Попробуйте позже или откройте конспект темы ниже.";

const SYSTEM_PROMPT = [
  "Ты — AI-репетитор образовательной платформы teñ. для школьников Казахстана.",
  "Отвечай только на русском языке, простыми словами, максимум 120 слов, без markdown.",
  "Объясняй по шагам и заканчивай коротким вопросом, который проверяет понимание.",
  "Опирайся на переданный конспект темы. Если вопрос выходит за его рамки — честно скажи об этом",
  "и предложи, что стоит повторить.",
  "Никогда не давай готовый ответ на контрольную без объяснения хода решения.",
].join(" ");

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

/** Ответ без AI: подбираем из конспекта абзацы, наиболее близкие к вопросу. */
function localAnswer(body: TutorRequest): TutorResponse {
  const theory = (body.theory ?? []).filter((item) => item.trim().length > 0);
  const question = normalize(body.question ?? "");
  const words = question.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3);

  const ranked = theory
    .map((paragraph) => {
      const text = normalize(paragraph);
      const score = words.reduce((sum, word) => (text.includes(word) ? sum + 1 : sum), 0);
      return { paragraph, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked.filter((item) => item.score > 0).slice(0, 2);
  const picked = best.length > 0 ? best : ranked.slice(0, 1);

  if (picked.length === 0) {
    return {
      answer:
        "Пока не могу разобрать этот вопрос: у темы нет конспекта. Попробуй сформулировать вопрос по конкретному заданию — тогда я подскажу ход решения.",
      source: "local",
    };
  }

  const topic = body.topicTitle ? `Тема «${body.topicTitle}». ` : "";
  return {
    answer: `${topic}${picked.map((item) => item.paragraph).join(" ")} Попробуй применить это правило к своему заданию и напиши, какой шаг вызывает затруднение.`,
    source: "local",
  };
}

export async function POST(request: Request) {
  let body: TutorRequest = {};
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json(
      { answer: "Не удалось прочитать вопрос. Повтори попытку.", source: "local" },
      { status: 400 },
    );
  }

  if (!body.question?.trim()) {
    return NextResponse.json({
      answer: "Задай вопрос по теме — например, где ты застрял в решении.",
      source: "local",
    } satisfies TutorResponse);
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(localAnswer(body));
  }

  try {
    const context = [
      `Предмет: ${body.subjectTitle ?? "не указан"}`,
      `Тема: ${body.topicTitle ?? "не указана"}`,
      `Класс ученика: ${body.grade ?? "не указан"}`,
      "",
      "Конспект темы:",
      ...(body.theory ?? []).map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");

    const history: GroqMessage[] = (body.history ?? [])
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.text }));

    const { content, error } = await groqChat(
      [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n${context}`,
        },
        ...history,
        { role: "user", content: body.question.trim() },
      ],
      { maxTokens: 600, temperature: 0.5 },
    );

    const answer = content?.replace(/[`*#]/g, "").trim();
    if (answer) {
      return NextResponse.json({ answer: answer.slice(0, 1600), source: "ai" } satisfies TutorResponse);
    }

    console.error("[learning/tutor] AI failed:", error);
    return NextResponse.json({ answer: AI_UNAVAILABLE, source: "local" } satisfies TutorResponse);
  } catch (error) {
    console.error("[learning/tutor]", error);
    return NextResponse.json({ answer: AI_UNAVAILABLE, source: "local" } satisfies TutorResponse);
  }
}
