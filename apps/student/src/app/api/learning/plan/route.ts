import { NextResponse } from "next/server";
import { extractJsonObject, groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";

export const runtime = "nodejs";
export const maxDuration = 30;

type PlanWeekInput = { index: number; title: string; goals: string[] };

type PlanRequest = {
  grade?: number;
  subjectTitle?: string;
  goals?: string[];
  examDate?: string;
  daysLeft?: number | null;
  minutesPerDay?: number;
  level?: number;
  levelLabel?: string;
  weakSpots?: string[];
  basePlan?: { headline?: string; weeks?: PlanWeekInput[] };
};

type PlanResponse = {
  headline: string;
  focus: string[];
  weeks: PlanWeekInput[];
  source: "ai" | "local";
};

const SYSTEM_PROMPT = [
  "Ты — методист, который составляет план подготовки для школьника из Казахстана.",
  "Пиши только на русском языке, коротко и по делу, без markdown.",
  "Не выдумывай темы: используй только те названия недель, которые переданы в запросе.",
  "Формулировки задач должны быть измеримыми: сколько заданий, что повторить, как проверить себя.",
].join(" ");

function localPlan(body: PlanRequest): PlanResponse {
  const weeks = body.basePlan?.weeks ?? [];
  const focus = body.weakSpots?.length
    ? body.weakSpots.slice(0, 3).map((spot) => `Закрыть пробел: ${spot}`)
    : ["Пройти диагностику, чтобы план стал точнее"];

  return {
    headline:
      body.basePlan?.headline?.trim() ||
      `План подготовки по предмету «${body.subjectTitle ?? "выбранный предмет"}»`,
    focus,
    weeks,
    source: "local",
  };
}

function buildUserPrompt(body: PlanRequest): string {
  const weeks = body.basePlan?.weeks ?? [];
  return [
    `Класс: ${body.grade ?? "не указан"}`,
    `Предмет: ${body.subjectTitle ?? "не указан"}`,
    `Цели: ${body.goals?.join(", ") || "не указаны"}`,
    `Дата цели: ${body.examDate || "не указана"}`,
    `Дней до цели: ${body.daysLeft ?? "не указано"}`,
    `Время в день: ${body.minutesPerDay ?? 30} минут`,
    `Уровень по диагностике: ${body.levelLabel ?? "не определён"}`,
    `Слабые навыки: ${body.weakSpots?.join(", ") || "пока не выявлены"}`,
    "",
    "Недели плана (названия менять нельзя):",
    ...weeks.map((week) => `${week.index}. ${week.title}`),
    "",
    "Верни строго JSON вида:",
    '{"headline": "одно предложение о плане", "focus": ["3 приоритета"], "weeks": [{"index": 1, "title": "название как передано", "goals": ["2-3 задачи на неделю"]}]}',
  ].join("\n");
}

export async function POST(request: Request) {
  let body: PlanRequest = {};
  try {
    body = (await request.json()) as PlanRequest;
  } catch {
    return NextResponse.json(localPlan({}), { status: 400 });
  }

  const fallback = localPlan(body);
  if (!isGroqConfigured()) {
    return NextResponse.json(fallback);
  }

  try {
    const { content } = await groqChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body) },
      ],
      { maxTokens: 900, temperature: 0.4 },
    );

    const parsed = extractJsonObject<{
      headline?: unknown;
      focus?: unknown;
      weeks?: unknown;
    }>(content);

    if (!parsed) return NextResponse.json(fallback);

    const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const focus = Array.isArray(parsed.focus)
      ? parsed.focus.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [];

    const weeks: PlanWeekInput[] = Array.isArray(parsed.weeks)
      ? parsed.weeks
          .map((item, index) => {
            const week = item as { index?: unknown; title?: unknown; goals?: unknown };
            const base = fallback.weeks[index];
            return {
              index: typeof week.index === "number" ? week.index : base?.index ?? index + 1,
              title: base?.title ?? (typeof week.title === "string" ? week.title : ""),
              goals: Array.isArray(week.goals)
                ? week.goals.filter((goal): goal is string => typeof goal === "string").slice(0, 4)
                : base?.goals ?? [],
            };
          })
          .filter((week) => week.title.length > 0)
      : [];

    if (!headline && weeks.length === 0 && focus.length === 0) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json({
      headline: headline || fallback.headline,
      focus: focus.length > 0 ? focus : fallback.focus,
      weeks: weeks.length > 0 ? weeks : fallback.weeks,
      source: "ai",
    } satisfies PlanResponse);
  } catch (error) {
    console.error("[learning/plan]", error);
    return NextResponse.json(fallback);
  }
}
