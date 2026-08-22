import { allGrants } from "@/lib/grants-data";
import type { GenerateRequest, GenerateResponse } from "@/types/generate";
import type { GrantRecord } from "@/types/grants";
import { ONBOARDING_SUBJECT_OPTIONS } from "@/lib/onboarding-constants";
import type { OnboardingAnswers } from "@/types/onboarding";

function parseLooseKztFromText(s: string): number {
  const m = s.match(/(\d[\d\s]*)/);
  if (!m) return 0;
  const n = parseInt(m[1]!.replace(/\s/g, ""), 10) || 0;
  if (n <= 0) return 0;
  if (n < 500) return n * 1000;
  return Math.min(500_000, n);
}

const CITY_COST_KZT: { pattern: RegExp; monthly: number }[] = [
  { pattern: /almaty|алматы/i, monthly: 200000 },
  { pattern: /astana|nur-sultan|ас(т|с)ана/i, monthly: 180000 },
  { pattern: /shymkent|шымкент/i, monthly: 140000 },
  { pattern: /aktobe|aktaу|atyrau|aktau|oral|kostanay/i, monthly: 130000 },
];

function estimateMonthlyCost(req: GenerateRequest): number {
  const city =
    (req.city && req.city.trim()) || req.onboarding?.city || "";
  const baseReq = { ...req, city };

  if (baseReq.budget_monthly > 0) {
    return Math.max(100000, Math.min(500000, baseReq.budget_monthly + 20000));
  }
  for (const row of CITY_COST_KZT) {
    if (row.pattern.test(city)) return row.monthly;
  }
  if (baseReq.onboarding?.studyLocation === "abroad") {
    return 250000;
  }
  return 160000;
}

const CAREER_CATALOG: {
  keys: string[];
  title: string;
  salary: string;
  blurb: string;
}[] = [
  {
    keys: [
      "biology",
      "chemistry",
      "мед",
      "медецина",
      "мед",
      "bio",
      "меди",
    ],
    title: "Biomedical Engineer",
    salary: "450,000–700,000 KZT / month (KZ)",
    blurb: "R&D, devices, and clinical support roles with English/Russian; strong fit for olympiad and lab experience.",
  },
  {
    keys: ["computer", "cs", "програм", "it", "data", "python", "код", "сайт"],
    title: "Product-oriented Software Developer",
    salary: "500,000–900,000 KZT / month (KZ, mid-level)",
    blurb: "Full-stack and mobile paths; KZ fintech, banks, and outsourcing firms hire for English-first teams.",
  },
  {
    keys: [
      "physics",
      "math",
      "мех",
      "robot",
      "astro",
    ],
    title: "R&D / Applied Physics",
    salary: "420,000–650,000 KZT / month (KZ)",
    blurb: "Labs, metrology, energy, and logistics sensors — combine analytics with project delivery.",
  },
  {
    keys: ["engineer", "civil", "стро", "mash", "маш"],
    title: "Civil & Infrastructure Project Coordinator",
    salary: "400,000–600,000 KZT / month (KZ)",
    blurb: "EPCM and contractor offices in KZ; coordination with public clients and on-site work.",
  },
  {
    keys: ["econ", "биз", "марк", "марк", "марк", "manag", "mba"],
    title: "Business & Strategy Analyst",
    salary: "400,000–700,000 KZT / month (KZ corporate)",
    blurb: "Consulting, banking, and industrial holdings in Almaty and Astana.",
  },
  {
    keys: ["art", "диз", "media", "фото", "кино", "твор", "твор", "mедиа", "mедиa"],
    title: "Product Designer & Creative Lead",
    salary: "350,000–600,000 KZT / month (KZ, agencies + product)",
    blurb: "Studios, game companies, and brand teams; portfolio-driven hiring.",
  },
  {
    keys: ["teach", "educat", "преп", "уч", "оқы"],
    title: "EdTech & Instructional Design",
    salary: "320,000–520,000 KZT / month (KZ schools + online)",
    blurb: "Bilingual and STEM tutoring demand in major cities; pair with public speech skills.",
  },
  {
    keys: ["geography", "history", "publ", "govern", "policy", "mежд"],
    title: "Public & International Affairs",
    salary: "380,000–600,000 KZT / month (KZ, gov & NGOs)",
    blurb: "Civic tech, consulates, and EU-funded projects when language skills align.",
  },
];

function textBlob(req: GenerateRequest, onboarding?: OnboardingAnswers | null): string {
  const s = new Set(
    (req.interests || []).map((i) => i.toLowerCase())
  );
  if (onboarding?.subjectIds?.length) {
    for (const id of onboarding.subjectIds) {
      const o = ONBOARDING_SUBJECT_OPTIONS.find((x) => x.id === id);
      if (o) s.add(o.label.toLowerCase());
    }
  }
  if (onboarding) {
    s.add(onboarding.freeTime.toLowerCase());
    s.add(onboarding.achievements.toLowerCase());
    s.add(onboarding.budgetConstraints.toLowerCase());
    s.add(onboarding.city.toLowerCase());
    s.add((onboarding.workPreference ?? "ideas").toString());
  }
  return [req.city, (req.achievements || []).join(" "), (req.interests || []).join(" ")].join(" ").toLowerCase() + " " + Array.from(s).join(" ");
}

function pickThreeCareers(blob: string): (typeof CAREER_CATALOG)[number][] {
  const scores = CAREER_CATALOG.map((c) => {
    const score = c.keys.reduce(
      (acc, k) => (blob.includes(k) ? acc + 2 : acc),
      0
    );
    return { c, score };
  });
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score < 1) {
    return [
      CAREER_CATALOG[0],
      CAREER_CATALOG[1],
      CAREER_CATALOG[4],
    ];
  }
  const top = new Map<string, (typeof CAREER_CATALOG)[number]>();
  for (const { c } of scores) {
    if (top.size >= 3) break;
    if (![...top.values()].some((x) => x.title === c.title)) top.set(c.title, c);
  }
  const out = [...top.values()];
  while (out.length < 3) {
    const d = CAREER_CATALOG.find((c) => !out.some((x) => x.title === c.title));
    if (d) out.push(d);
    else break;
  }
  return out.slice(0, 3);
}

const HH_SEARCH = "https://hh.kz/search/vacancy?text=";

function vacancyFor(title: string, company: string, q: string): {
  title: string;
  company: string;
  url: string;
} {
  return {
    title: `Vacancies: ${title}`,
    company,
    url: `${HH_SEARCH}${encodeURIComponent(q)}`,
  };
}

function scoreGrant(g: GrantRecord, blob: string, onboarding?: OnboardingAnswers | null): number {
  const hay = `${g.eligibilityTags.join(" ")} ${g.name} ${g.kazakhstanRelevance} ${g.suggestedMatchBlurb}`.toLowerCase();
  let s = 0;
  for (const w of blob.split(/\W+/)) {
    if (w.length < 3) continue;
    if (hay.includes(w)) s += 0.3;
  }
  for (const t of g.eligibilityTags) {
    if (blob.toLowerCase().includes(t)) s += 2;
  }
  if (onboarding?.studyLocation) {
    if (onboarding.studyLocation === "abroad" && (hay.includes("abroad") || hay.includes("europe") || hay.includes("germany") || hay.includes("daad") || hay.includes("erasmus"))) s += 2;
    if (onboarding.studyLocation === "kazakhstan" && (hay.includes("kazakhstan") || hay.includes("nu ") || hay.includes("kimep") || hay.includes("nao"))) s += 2;
  }
  for (const ach of (onboarding?.achievements ?? "").toLowerCase().split(/[^a-zа-я0-9]+/)) {
    if (ach.length > 4 && hay.includes(ach)) s += 1.5;
  }
  if (g.monthlyKzt && g.monthlyKzt > 0) s += 0.2;
  return s;
}

function matchLevel(score: number): "low" | "medium" | "high" {
  if (score >= 4) return "high";
  if (score >= 1.5) return "medium";
  return "low";
}

function pickGrants(
  _req: GenerateRequest,
  blob: string,
  onboarding: OnboardingAnswers | null | undefined
): { sorted: { g: GrantRecord; score: number; match: "low" | "medium" | "high" }[] } {
  const rows = allGratsWithScore(blob, onboarding);
  rows.sort((a, b) => b.score - a.score);
  return { sorted: rows };
}

function allGratsWithScore(
  blob: string,
  onboarding: OnboardingAnswers | null | undefined
) {
  return allGrants().map((g) => {
    const score = scoreGrant(g, blob, onboarding);
    return { g, score, match: matchLevel(score) };
  });
}

function stackAmountKzt(g: GrantRecord): number {
  const c = g.coverageContributionKzt ?? 0;
  const m = g.monthlyKzt ?? 0;
  return c > 0 ? c : m;
}

function asFinancial(
  cost: number,
  grants: { g: GrantRecord; match: "low" | "medium" | "high" }[]
): {
  financial_route: GenerateResponse["financial_route"];
} {
  const withMoney = grants
    .filter((x) => stackAmountKzt(x.g) > 0)
    .sort((a, b) => stackAmountKzt(b.g) - stackAmountKzt(a.g));
  const pick = withMoney.slice(0, 3);
  const sum = pick.reduce((acc, x) => acc + stackAmountKzt(x.g), 0);
  const cap = Math.min(sum, cost);
  const gap = Math.max(0, cost - cap);
  const coverage_percent =
    cost <= 0 ? 0 : Math.min(100, Math.round((cap / cost) * 100));
  return {
    financial_route: {
      monthly_cost: cost,
      grants: pick.map((x) => {
        const amt = stackAmountKzt(x.g);
        return {
          name: x.g.name,
          amount: Math.round(amt),
          deadline: x.g.deadline,
          match: x.match,
          grantId: x.g.id,
        };
      }),
      gap,
      coverage_percent,
    },
  };
}

function portfolioBlock(
  req: GenerateRequest,
  onboarding?: OnboardingAnswers | null
): string {
  const first =
    (req.achievements && req.achievements[0]) ||
    onboarding?.achievements?.trim() ||
    "";
  const cleaned = first.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!cleaned.length) {
    return "Aspiring student in Kazakhstan: building a structured portfolio in PathWise (demo packaging).";
  }
  if (/\d/.test(cleaned)) {
    return `${cleaned} – framed for admissions and employers: emphasize measurable impact and your role.`;
  }
  return `Standout: ${cleaned} — phrased for KZ and international applications (PathWise — demo).`;
}

export function generateDeterministic(
  request: GenerateRequest
): GenerateResponse {
  const onboarding = request.onboarding ?? null;
  const interests =
    request.interests?.length
      ? request.interests
      : (onboarding?.subjectIds
          ?.map(
            (id) =>
              ONBOARDING_SUBJECT_OPTIONS.find((o) => o.id === id)?.label || id
          ) ?? []) ?? [];
  const reqNorm: GenerateRequest = {
    ...request,
    city: (request.city || onboarding?.city || "").trim(),
    onboarding,
    interests: interests.length
      ? interests
      : ["interdisciplinary"],
    achievements:
      request.achievements?.length
        ? request.achievements
        : (onboarding?.achievements
            ? [onboarding.achievements]
            : [""]) ?? [""],
    target_university:
      request.target_university ||
      (onboarding ? `Target based on city: ${onboarding.city || "KZ"}` : ""),
  };

  const blob = textBlob(reqNorm, onboarding);
  const three = pickThreeCareers(blob);

  const career_map = three.map((c) => {
    return {
      title: c.title,
      salary_kzt: c.salary,
      description: c.blurb,
      vacancies: [
        vacancyFor(c.title, "hh.kz (search)", c.title + " " + (reqNorm.city || "Kazakhstan")),
        vacancyFor("Similar roles on hh.kz", "Linked regional employers", c.title + " " + (reqNorm.city || "KZ")),
      ],
    };
  });

  const { sorted } = pickGrants(reqNorm, blob, onboarding);
  const ranked = sorted.map((r) => ({ g: r.g, match: r.match }));

  const fromBudget = onboarding
    ? parseLooseKztFromText(onboarding.budgetConstraints)
    : 0;

  const cost = estimateMonthlyCost({
    ...reqNorm,
    city: reqNorm.city || onboarding?.city || "",
    onboarding: reqNorm.onboarding ?? onboarding,
    budget_monthly: reqNorm.budget_monthly > 0 ? reqNorm.budget_monthly : fromBudget,
  });

  const { financial_route } = asFinancial(cost, ranked);
  return {
    career_map,
    financial_route,
    portfolio_block: portfolioBlock(reqNorm, onboarding),
  };
}
