import { NextResponse } from "next/server";
import { getGroqApiKey, resolveGroqChatModel } from "@/lib/groq-env";
import { UNIVERSITIES } from "@/portal/data/universities";
import type { OnboardingAnswers } from "@/types/onboarding";
import type { UniversityProgramRecommendation } from "@/types/generate";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = resolveGroqChatModel();

type RecommendRequest = {
  onboarding?: OnboardingAnswers | null;
  language?: "en" | "kk" | "ru";
  careerTitles?: string[];
};

type CatalogProgram = ReturnType<typeof programCatalog>[number];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function programCatalog() {
  return UNIVERSITIES.flatMap((university) =>
    (university.programs ?? []).map((program) => ({
      universityId: university.id,
      universityName: university.nameEn || university.name,
      universityNameRu: university.nameRu,
      city: university.city,
      rank: university.rank,
      type: university.type,
      categories: university.rankingCategories,
      languages: university.languages,
      description: university.description,
      website: university.website,
      intakes: university.intakes ?? [],
      scholarships: university.scholarships ?? [],
      requirements: university.requirements,
      programTitle: program.titleEn,
      programTitleRu: program.titleRu,
      language: program.language,
      durationYears: program.durationYears,
    })),
  );
}

function subjectText(answers: OnboardingAnswers, careerTitles: string[] = []) {
  return [
    answers.subjectIds.join(", "),
    answers.freeTime,
    answers.achievements,
    answers.workPreference ?? "",
    answers.studyLocation ?? "",
    answers.city,
    answers.budgetConstraints,
    careerTitles.join(" "),
  ].join(" ").toLowerCase();
}

function professionTrack(answers: OnboardingAnswers, careerTitles: string[] = []) {
  const text = subjectText(answers, careerTitles);
  if (/software|developer|data|ai|computer|cs|it|информ|код|python|math|матем/.test(text)) {
    return {
      label: "Разработка, AI и данные",
      keywords: ["computer", "software", "data", "mathematics", "information", "engineering", "physics", "electrical"],
      reason: "Ваши ответы указывают на математику, информатику, программирование и работу с данными.",
    };
  }
  if (/medicine|medical|doctor|health|bio|chem|мед|био|хим/.test(text)) {
    return {
      label: "Медицина, здоровье и биотехнологии",
      keywords: ["medicine", "medical", "health", "biology", "chemical", "biomedical", "pharmacy"],
      reason: "Ваши интересы связаны с биологией, химией и медицинскими профессиями.",
    };
  }
  if (/business|finance|econom|management|entrepreneur|маркет|бизнес|эконом/.test(text)) {
    return {
      label: "Бизнес, экономика и управление",
      keywords: ["business", "finance", "economics", "management", "accounting", "marketing"],
      reason: "Ваши цели ближе к бизнесу, финансам, управлению и предпринимательству.",
    };
  }
  if (/law|policy|politic|international|history|debate|прав|истор|межд/.test(text)) {
    return {
      label: "Право, политика и международные отношения",
      keywords: ["law", "political", "international", "relations", "history", "policy"],
      reason: "В профиле виден интерес к обществу, праву, истории, дебатам и международной работе.",
    };
  }
  if (/design|art|media|creative|writing|литера|дизайн|твор/.test(text)) {
    return {
      label: "Креативные индустрии и коммуникации",
      keywords: ["media", "design", "communication", "languages", "literature", "culture", "journalism"],
      reason: "Ваши ответы указывают на творческие профессии, языки и медиа.",
    };
  }
  return {
    label: "Междисциплинарные программы",
    keywords: ["engineering", "business", "computer", "mathematics", "international", "economics"],
    reason: "Ответы охватывают разные области, поэтому подбираем гибкие программы с сильным результатом.",
  };
}

function scoreProgram(program: CatalogProgram, answers: OnboardingAnswers, careerTitles: string[] = []) {
  const text = subjectText(answers, careerTitles);
  const track = professionTrack(answers, careerTitles);
  const haystack = [
    program.programTitle,
    program.programTitleRu,
    program.categories.join(" "),
    program.universityName,
    program.description,
  ].join(" ").toLowerCase();
  let score = 50;
  if (answers.city && program.city.toLowerCase().includes(answers.city.toLowerCase())) score += 12;
  if (answers.studyLocation === "kazakhstan") score += 8;
  for (const keyword of track.keywords) {
    if (haystack.includes(keyword)) score += 8;
  }
  if (text.includes("math") || text.includes("мат") || text.includes("data")) {
    if (/it|computer|data|engineering|software|information/i.test(haystack)) score += 18;
  }
  if (text.includes("bio") || text.includes("chem") || text.includes("medicine")) {
    if (/medicine|medical|biology|health/i.test(haystack)) score += 18;
  }
  if (text.includes("business") || text.includes("econ")) {
    if (/business|finance|econom|management/i.test(haystack)) score += 18;
  }
  if (text.includes("law") || text.includes("history")) {
    if (/law|international|relations|policy/i.test(haystack)) score += 18;
  }
  score += Math.max(0, 10 - program.rank);
  return Math.min(100, score);
}

function toRecommendation(
  program: CatalogProgram,
  score: number,
  answers: OnboardingAnswers,
  careerTitles: string[] = [],
): UniversityProgramRecommendation {
  const track = professionTrack(answers, careerTitles);
  const deadline = program.intakes[0]?.deadline;
  const scholarships = program.scholarships.map((item) => item.title).slice(0, 3);
  const documents = program.requirements?.requiredDocs
    ?.filter((doc) => doc.required)
    .map((doc) => doc.titleEn)
    .slice(0, 4) ?? [];
  const sameCity = Boolean(answers.city && program.city.toLowerCase().includes(answers.city.toLowerCase()));
  const categories = program.categories.map(String);

  return {
    universityId: program.universityId,
    universityName: program.universityName,
    city: program.city,
    programTitle: program.programTitle,
    language: program.language,
    durationYears: program.durationYears,
    fitScore: score,
    website: program.website,
    rank: program.rank,
    universityType: program.type,
    categories,
    description: program.description,
    admissionDeadline: deadline,
    languageRequirement: program.requirements?.languageRequirement,
    scholarships,
    documents,
    professionTrack: track.label,
    matchSummary: `${track.label}: ${track.reason}`,
    reasons: [
      track.reason,
      sameCity
        ? `Located in your preferred city: ${program.city}.`
        : `Real university option in ${program.city}; compare it with your preferred city ${answers.city || "choice"}.`,
      `Program language: ${program.language}; duration: ${program.durationYears} years.`,
      categories.length ? `Strong catalog categories: ${categories.slice(0, 3).join(", ")}.` : "Catalog profile fits your direction.",
    ],
    nextSteps: [
      deadline ? `Check the ${deadline} intake deadline on the official site.` : "Check the next intake deadline on the official site.",
      program.requirements?.languageRequirement
        ? `Prepare language proof: ${program.requirements.languageRequirement}.`
        : "Check language and admission requirements.",
      scholarships.length
        ? `Compare scholarships: ${scholarships.slice(0, 2).join(", ")}.`
        : "Compare grant coverage with the grants page.",
    ],
  };
}

function fallbackRecommendations(answers: OnboardingAnswers, careerTitles: string[] = []): UniversityProgramRecommendation[] {
  return programCatalog()
    .map((program) => ({ program, score: scoreProgram(program, answers, careerTitles) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ program, score }) => toRecommendation(program, score, answers, careerTitles));
}

function promptFor(answers: OnboardingAnswers, language: RecommendRequest["language"], careerTitles: string[] = []) {
  const shortlistedCatalog = programCatalog()
    .map((program) => ({
      ...program,
      localFitScore: scoreProgram(program, answers, careerTitles),
    }))
    .sort((a, b) => b.localFitScore - a.localFitScore)
    .slice(0, 14);

  return [
    "You are an admissions advisor for Kazakhstan high-school students.",
    "Pick specific universities and programs from the provided catalog only.",
    "Use the student's 7 onboarding answers and generated career/profession titles.",
    "Prioritize real fit between profession direction, interests, university categories, program title, city, language, scholarships, admissions requirements, and deadlines.",
    "Return strict JSON only, no markdown.",
    "",
    "JSON schema:",
    '{ "recommendations": [ { "universityId": "string", "universityName": "string", "city": "string", "programTitle": "string", "language": "string", "durationYears": number, "fitScore": number, "professionTrack": "string", "matchSummary": "string", "reasons": ["string"], "nextSteps": ["string"] } ] }',
    "",
    `Response language: ${language || "en"}`,
    `Student answers: ${JSON.stringify(answers)}`,
    `Generated career/profession titles: ${JSON.stringify(careerTitles)}`,
    `Pre-matched real university catalog: ${JSON.stringify(shortlistedCatalog)}`,
  ].join("\n");
}

function parseRecommendations(content: string, answers: OnboardingAnswers, careerTitles: string[] = []) {
  try {
    const parsed = JSON.parse(content) as {
      recommendations?: Partial<UniversityProgramRecommendation>[];
    };
    const catalog = programCatalog();
    const byKey = new Map(catalog.map((program) => [`${program.universityId}::${program.programTitle}`, program]));
    const byUniversity = new Map(catalog.map((program) => [program.universityId, program]));
    const recommendations = (parsed.recommendations ?? [])
      .filter((item) => typeof item.universityId === "string" && byUniversity.has(item.universityId))
      .slice(0, 5)
      .map((item): UniversityProgramRecommendation => {
        const program =
          byKey.get(`${item.universityId}::${item.programTitle}`) ??
          byUniversity.get(item.universityId as string)!;
        const base = toRecommendation(
          program,
          typeof item.fitScore === "number" ? Math.max(0, Math.min(100, item.fitScore)) : scoreProgram(program, answers, careerTitles),
          answers,
          careerTitles,
        );
        return {
          ...base,
          programTitle: String(item.programTitle || base.programTitle),
          professionTrack: String(item.professionTrack || base.professionTrack),
          matchSummary: String(item.matchSummary || base.matchSummary),
          reasons: Array.isArray(item.reasons)
            ? item.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 4)
            : base.reasons,
          nextSteps: Array.isArray(item.nextSteps)
            ? item.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 4)
            : base.nextSteps,
        };
      });
    return recommendations.length ? recommendations : fallbackRecommendations(answers, careerTitles);
  } catch {
    return fallbackRecommendations(answers, careerTitles);
  }
}

export async function POST(request: Request) {
  let input: RecommendRequest | undefined;
  try {
    try {
      input = (await request.json()) as RecommendRequest;
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    if (!input.onboarding) return jsonError("Missing onboarding answers.", 400);

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
      });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveGroqChatModel(process.env.GROQ_MODEL),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You recommend university programs from a fixed catalog. Return JSON only.",
          },
          { role: "user", content: promptFor(input.onboarding, input.language, input.careerTitles ?? []) },
        ],
      }),
    });

    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
        warning: `AI: ${raw.slice(0, 240) || response.statusText}`,
      });
    }

    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("<")) {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
        warning: "AI returned non-JSON body.",
      });
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    } catch {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
        warning: "AI JSON parse failed.",
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
        warning: "AI returned empty recommendations.",
      });
    }

    return NextResponse.json({
      recommendations: parseRecommendations(content, input.onboarding, input.careerTitles ?? []),
      source: "ai",
    });
  } catch (e) {
    console.error("[recommend-programs]", e);
    if (input?.onboarding) {
      return NextResponse.json({
        recommendations: fallbackRecommendations(input.onboarding, input.careerTitles ?? []),
        source: "local-fallback",
        warning: "Unexpected error; using catalog fallback.",
      });
    }
    return jsonError("Program recommendations failed.", 500);
  }
}
