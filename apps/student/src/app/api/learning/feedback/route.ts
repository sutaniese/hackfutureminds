import { NextResponse } from "next/server";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";

export const runtime = "nodejs";
export const maxDuration = 30;

type FeedbackRequest = {
  prompt?: string;
  passage?: string;
  options?: string[];
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
  topicTitle?: string;
  subjectTitle?: string;
  skill?: string;
  grade?: number;
  difficulty?: number;
};

type FeedbackResponse = {
  feedback: string;
  nextStep: string;
  source: "ai" | "local";
};

const SYSTEM_PROMPT = [
  "Ты — доброжелательный репетитор для школьника из Казахстана.",
  "Отвечай только на русском языке, без markdown и без списков.",
  "Максимум 60 слов. Обращайся к ученику на «ты».",
  "Если ответ неверный — коротко объясни, где именно ошибка в рассуждении, и напомни правило.",
  "Если ответ верный — подтверди и добавь одну мысль, которая углубляет понимание.",
  "Никогда не выдумывай факты: опирайся на переданное объяснение.",
].join(" ");

function localFeedback(body: FeedbackRequest): FeedbackResponse {
  const explanation = body.explanation?.trim();
  const topic = body.topicTitle?.trim();

  if (body.isCorrect) {
    return {
      feedback: explanation
        ? `Верно. ${explanation}`
        : "Верно. Решение построено правильно, ход рассуждения можно применять и к похожим заданиям.",
      nextStep: topic
        ? `Возьми следующее задание темы «${topic}» — уровень сложности повысится автоматически.`
        : "Переходи к следующему заданию — сложность подстроится под твой результат.",
      source: "local",
    };
  }

  return {
    feedback:
      explanation ||
      "Разбери условие ещё раз по шагам и проверь, какое правило здесь применяется.",
    nextStep: body.skill
      ? `Повтори навык «${body.skill}» в конспекте темы и вернись к похожему заданию.`
      : "Открой конспект темы и вернись к заданию того же уровня.",
    source: "local",
  };
}

function buildUserPrompt(body: FeedbackRequest): string {
  const lines = [
    `Предмет: ${body.subjectTitle ?? "не указан"}`,
    `Тема: ${body.topicTitle ?? "не указана"}`,
    `Навык: ${body.skill ?? "не указан"}`,
    `Класс ученика: ${body.grade ?? "не указан"}`,
    `Уровень задания: ${body.difficulty ?? "не указан"} из 3`,
  ];

  if (body.passage?.trim()) lines.push(`Текст к заданию: ${body.passage.trim()}`);
  lines.push(`Вопрос: ${body.prompt ?? ""}`);
  if (body.options?.length) lines.push(`Варианты: ${body.options.join(" | ")}`);
  lines.push(`Ответ ученика: ${body.studentAnswer ?? "нет ответа"}`);
  lines.push(`Правильный ответ: ${body.correctAnswer ?? "не указан"}`);
  lines.push(`Результат: ${body.isCorrect ? "верно" : "неверно"}`);
  if (body.explanation?.trim()) lines.push(`Разбор из базы: ${body.explanation.trim()}`);

  lines.push(
    "",
    "Верни строго JSON без пояснений вокруг:",
    '{"feedback": "объяснение для ученика", "nextStep": "один конкретный следующий шаг"}',
  );

  return lines.join("\n");
}

export async function POST(request: Request) {
  let body: FeedbackRequest = {};
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return NextResponse.json(
      { feedback: "Не удалось прочитать запрос.", nextStep: "Повтори попытку.", source: "local" },
      { status: 400 },
    );
  }

  const fallback = localFeedback(body);
  if (!isGroqConfigured()) {
    return NextResponse.json(fallback);
  }

  try {
    const { content } = await groqChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body) },
      ],
      { maxTokens: 400, temperature: 0.3 },
    );

    if (!content) return NextResponse.json(fallback);

    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        const parsed = JSON.parse(content.slice(first, last + 1)) as {
          feedback?: unknown;
          nextStep?: unknown;
        };
        const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() : "";
        const nextStep = typeof parsed.nextStep === "string" ? parsed.nextStep.trim() : "";
        if (feedback) {
          return NextResponse.json({
            feedback,
            nextStep: nextStep || fallback.nextStep,
            source: "ai",
          } satisfies FeedbackResponse);
        }
      } catch {
        /* модель вернула не JSON — используем сырой текст ниже */
      }
    }

    const plain = content.replace(/[`*#]/g, "").trim();
    if (plain.length > 0) {
      return NextResponse.json({
        feedback: plain.slice(0, 900),
        nextStep: fallback.nextStep,
        source: "ai",
      } satisfies FeedbackResponse);
    }

    return NextResponse.json(fallback);
  } catch (error) {
    console.error("[learning/feedback]", error);
    return NextResponse.json(fallback);
  }
}
