import { NextResponse } from "next/server";
import { tryGenerateWithGroq } from "@/lib/generate/groq-optional";
import { generateDeterministic } from "@/lib/generate/deterministic";
import { parseGenerateRequest } from "@/lib/generate/parse-request";
import type {
  GenerateLanguage,
  GenerateRequest,
  GenerateResponse,
  MatchedGrantSummary,
} from "@/types/generate";

export const runtime = "nodejs";

type LiveGrant = {
  id: string;
  name: string;
  amount_kzt: number | null;
  amount_usd: number | null;
  level: string;
  fields: string[];
  gpa_min: number | null;
  deadline_month: string | null;
};

function inferField(payload: GenerateRequest) {
  const text = [
    ...payload.interests,
    payload.onboarding?.freeTime ?? "",
    payload.onboarding?.achievements ?? "",
  ].join(" ").toLowerCase();
  if (/math|informat|code|data|robot|physics/.test(text)) return "engineering";
  if (/bio|chem|medicine|health/.test(text)) return "medicine";
  if (/business|econ|finance/.test(text)) return "business";
  if (/law|history|international/.test(text)) return "law";
  return "any";
}

function inferLevel(payload: GenerateRequest) {
  const text = JSON.stringify(payload.onboarding ?? {}).toLowerCase();
  if (text.includes("phd") || text.includes("докторан")) return "phd";
  if (text.includes("master") || text.includes("магистр")) return "master";
  return "bachelor";
}

function inferGpa(payload: GenerateRequest) {
  const text = [...payload.achievements, payload.onboarding?.achievements ?? ""].join(" ");
  const match = text.match(/(?:gpa|средн\w* балл|балл)\D*(\d(?:[.,]\d)?)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

async function loadRelevantGrants(request: Request, payload: GenerateRequest) {
  const origin = new URL(request.url).origin;
  const field = inferField(payload);
  const level = inferLevel(payload);
  const gpa = inferGpa(payload);
  const url = new URL("/api/v1/grants", origin);
  url.searchParams.set("field", field);
  url.searchParams.set("level", level);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const raw = await response.text().catch(() => "");
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("<")) return [];
  let json: { data?: LiveGrant[] };
  try {
    json = JSON.parse(raw) as { data?: LiveGrant[] };
  } catch {
    return [];
  }
  const grants = Array.isArray(json.data) ? json.data : [];
  return grants.filter((grant) => {
    const fieldMatch = grant.fields.includes("any") || grant.fields.includes(field);
    const levelMatch = grant.level === "any" || grant.level === level;
    const gpaMatch = !grant.gpa_min || gpa === 0 || gpa >= grant.gpa_min;
    return fieldMatch && levelMatch && gpaMatch;
  });
}

function toMatchedGrant(grant: LiveGrant): MatchedGrantSummary {
  return {
    name: grant.name,
    amount: grant.amount_kzt ?? (grant.amount_usd ? grant.amount_usd * 450 : 0),
    deadline: grant.deadline_month ?? "",
    match: "high",
    grantId: grant.id,
  };
}

function pf(lang: GenerateLanguage, ru: string, en: string, kk: string): string {
  if (lang === "kk") return kk;
  if (lang === "en") return en;
  return ru;
}

/** Human-readable lines for the resume section (UI splits on blank lines into cards). */
function onboardingPortfolioLines(payload: GenerateRequest): string[] {
  const lang = payload.language || "ru";
  const o = payload.onboarding;
  const lines: string[] = [];

  if (payload.interests.length) {
    lines.push(
      `${pf(lang, "Сильные предметы и интересы", "Strong subjects & interests", "Пәндер мен қызығушылықтар")}: ${payload.interests.join(", ")}.`,
    );
  }

  if (o?.freeTime?.trim()) {
    lines.push(
      `${pf(lang, "Вне учёбы", "Outside class", "Сыныптан тыс")}: ${o.freeTime.replace(/\s+/g, " ").trim().slice(0, 520)}`,
    );
  }

  const achJoined = (payload.achievements ?? [])
    .map((s) => s.trim())
    .filter((s) => s && s !== "—")
    .join(" ");
  const ach = (o?.achievements ?? "").trim() || achJoined;
  if (ach) {
    lines.push(
      `${pf(lang, "Достижения", "Achievements", "Жетістіктер")}: ${ach.replace(/\s+/g, " ").slice(0, 720)}`,
    );
  }

  if (o?.city?.trim()) {
    lines.push(`${pf(lang, "Город", "City", "Қала")}: ${o.city.trim()}.`);
  }

  if (o?.studyLocation) {
    const loc =
      o.studyLocation === "abroad"
        ? pf(lang, "Ориентир — зарубежные программы", "Focus — study abroad", "Бағыт — шетелде оқу")
        : pf(lang, "Ориентир — учёба в Казахстане", "Focus — studying in Kazakhstan", "Бағыт — Қазақстанда оқу");
    lines.push(`${loc}.`);
  }

  if (o?.workPreference) {
    const map: Record<string, { ru: string; en: string; kk: string }> = {
      people: { ru: "Люди и забота", en: "People & care", kk: "Адамдар және күтім" },
      data: { ru: "Данные и аналитика", en: "Data & analysis", kk: "Деректер және талдау" },
      hands: { ru: "Практика и лаборатории", en: "Hands-on & lab", kk: "Практика және зертхана" },
      ideas: { ru: "Идеи и стратегия", en: "Ideas & strategy", kk: "Идеялар және стратегия" },
    };
    const w = map[o.workPreference] ?? { ru: o.workPreference, en: o.workPreference, kk: o.workPreference };
    lines.push(
      `${pf(lang, "Предпочтение по работе", "Preferred work style", "Жұмыс стилі")}: ${pf(lang, w.ru, w.en, w.kk)}.`,
    );
  }

  if (o?.budgetConstraints?.trim()) {
    lines.push(
      `${pf(lang, "Финансовые заметки", "Budget notes", "Бюджет ескертпелері")}: ${o.budgetConstraints.replace(/\s+/g, " ").trim().slice(0, 420)}`,
    );
  }

  return lines;
}

function composePortfolioBlock(payload: GenerateRequest, modelBlock: string): string {
  const head = onboardingPortfolioLines(payload).join("\n\n").trim();
  const base = modelBlock.trim();
  if (!head && !base) {
    return pf(
      payload.language || "ru",
      "Заполните анкету подробнее — здесь появится краткий текст для резюме и заявок.",
      "Add more onboarding answers — a short resume-ready snapshot will appear here.",
      "Анкетаны толығырақ толтырыңыз — мұнда түйінді мәтін пайда болады.",
    );
  }
  if (!base) return head;
  if (!head) return base;
  const bridge = pf(
    payload.language || "ru",
    "Как подать в резюме и заявках",
    "How to frame this in applications",
    "Өтінімдерде қалай көрсету керек",
  );
  return `${head}\n\n${bridge}:\n${base}`;
}

function withLiveGrants(
  response: GenerateResponse,
  grants: LiveGrant[],
  payload: GenerateRequest,
): GenerateResponse {
  const portfolio_block = composePortfolioBlock(payload, response.portfolio_block);

  if (grants.length === 0) {
    return { ...response, portfolio_block };
  }

  const matched = grants.slice(0, 5).map(toMatchedGrant);
  const coverage = matched.reduce((sum, grant) => sum + grant.amount, 0);
  const monthlyCost = response.financial_route.monthly_cost || 1;
  return {
    ...response,
    financial_route: {
      ...response.financial_route,
      grants: matched,
      gap: Math.max(0, monthlyCost - coverage),
      coverage_percent: Math.min(100, Math.round((coverage / monthlyCost) * 100)),
    },
    portfolio_block,
  };
}

/**
 * `POST /api/generate` — `student_dev_EN.md` request/response shape.
 * Tries Groq if `GROQ_API_KEY` is set; always falls back to
 * deterministic local logic (demo-safe, no key required).
 */
export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = parseGenerateRequest(json);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Bad request" },
        { status: 400 }
      );
    }

    const relevantGrants = await loadRelevantGrants(request, payload);
    const payloadWithGrants = {
      ...payload,
      available_grants: relevantGrants,
    } as GenerateRequest & { available_grants: LiveGrant[] };

    if (process.env.GROQ_API_KEY) {
      const ai = await tryGenerateWithGroq(payloadWithGrants);
      if (ai && isLikelyResponse(ai)) {
        return NextResponse.json(withLiveGrants(ai, relevantGrants, payload));
      }
    }

    return NextResponse.json(
      withLiveGrants(generateDeterministic(payloadWithGrants), relevantGrants, payload),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate route failed" },
      { status: 500 }
    );
  }
}

function isLikelyResponse(v: object): v is {
  career_map: unknown;
  financial_route: unknown;
  portfolio_block: unknown;
} {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.career_map) &&
    o.financial_route !== undefined &&
    typeof o.portfolio_block === "string"
  );
}
