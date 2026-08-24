import { ONBOARDING_SUBJECT_OPTIONS } from "@/lib/onboarding-constants";
import { BASE_TOPICS, subjectTitle } from "@/lib/learning/catalog";
import {
  LEVEL_LABELS,
  type DiagnosticResult,
  type LearningProfile,
} from "@/lib/learning/store";
import { LEARNING_GOALS } from "@/lib/learning/types";
import type { TargetUniversity } from "@/portal/lib/targetUniversity";
import type { GenerateResponse } from "@/types/generate";
import type { OnboardingAnswers, WorkPreference } from "@/types/onboarding";

export type RoadmapNode = {
  id: string;
  title: string;
  subtitle: string;
  phase: string;
  detail: string;
  actions: string[];
  metric: string;
  x: number;
  y: number;
  tone: "purple" | "green" | "red" | "slate";
};

const SUBJECT_RU: Record<string, string> = {
  math: "математика",
  physics: "физика",
  chemistry: "химия",
  biology: "биология",
  history: "история",
  english: "английский",
  kazakh: "қазақ тілі",
  russian: "русский",
  cs: "информатика",
  literature: "литература",
  geography: "география",
  informatics: "информатика",
};

const WORK_RU: Record<WorkPreference, string> = {
  people: "команды и люди",
  data: "данные и анализ",
  hands: "лаборатории и практика",
  ideas: "идеи и стратегия",
};

export type RoadmapTrack = {
  id: string;
  label: string;
  profession: string;
  programs: string;
  proof: string;
};

export function subjectListRu(ids: string[]): string {
  if (!ids.length) return "профиль ещё не выбран";
  return ids
    .map(
      (id) =>
        SUBJECT_RU[id] ??
        ONBOARDING_SUBJECT_OPTIONS.find((item) => item.id === id)?.label ??
        id,
    )
    .join(", ");
}

export function inferTrack(
  answers: OnboardingAnswers | null,
  diagnostic: DiagnosticResult | null,
  generated: GenerateResponse | null,
): RoadmapTrack {
  const career = generated?.career_map[0]?.title?.trim();
  const subjects = new Set(answers?.subjectIds ?? []);
  const blob = [
    ...(answers?.subjectIds ?? []),
    answers?.freeTime ?? "",
    answers?.achievements ?? "",
    diagnostic?.subjectId ?? "",
    career ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (subjects.has("biology") || subjects.has("chemistry") || /bio|мед|health|врач|chem/.test(blob)) {
    return {
      id: "bio",
      label: "Биомедицина и здоровье",
      profession: career || "врач-исследователь / биомед-инженер",
      programs: "медицина, биотехнологии, public health",
      proof: "олимпиады, лабораторные отчёты, волонтёрство в клинике",
    };
  }
  if (
    subjects.has("cs") ||
    diagnostic?.subjectId === "informatics" ||
    /code|python|data|ии|информат/.test(blob)
  ) {
    return {
      id: "cs",
      label: "CS, данные и ИИ",
      profession: career || "разработчик / data analyst",
      programs: "computer science, software engineering, AI",
      proof: "GitHub, хакатоны, олимпиады по информатике и математике",
    };
  }
  if (
    subjects.has("math") ||
    subjects.has("physics") ||
    diagnostic?.subjectId === "math" ||
    diagnostic?.subjectId === "physics"
  ) {
    return {
      id: "stem",
      label: "Инженерия и точные науки",
      profession: career || "инженер / applied physics",
      programs: "engineering, applied math, physics",
      proof: "олимпиады, инженерные проекты, лабораторные работы",
    };
  }
  if (subjects.has("history") || subjects.has("geography") || /law|policy|debate|дипломат/.test(blob)) {
    return {
      id: "policy",
      label: "Общество, право и международные отношения",
      profession: career || "аналитик политики / юрист",
      programs: "law, public policy, international relations",
      proof: "эссе, дебаты, Model UN, языковые сертификаты",
    };
  }
  return {
    id: "general",
    label: career ? `Трек: ${career}` : "Персональный междисциплинарный трек",
    profession: career || "направление по сильным предметам",
    programs: "программы под ваши предметы и город",
    proof: "проекты, эссе, конкурсы, рекомендации",
  };
}

function weakTopicTitles(diagnostic: DiagnosticResult | null): string[] {
  if (!diagnostic) return [];
  return Object.entries(diagnostic.byTopic)
    .filter(([, score]) => score.total > 0 && score.correct / score.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([id]) => BASE_TOPICS.find((topic) => topic.id === id)?.title ?? id)
    .slice(0, 3);
}

function goalTitles(profile: LearningProfile | null): string {
  if (!profile?.goals.length) return "учёба в своём темпе";
  return profile.goals
    .map((id) => LEARNING_GOALS.find((goal) => goal.id === id)?.title ?? id)
    .join(", ");
}

export function buildPersonalRoadmap(input: {
  answers: OnboardingAnswers | null;
  diagnostic: DiagnosticResult | null;
  profile: LearningProfile | null;
  generated: GenerateResponse | null;
  targetUniversity: TargetUniversity | null;
}): RoadmapNode[] {
  const { answers, diagnostic, profile, generated, targetUniversity } = input;
  const track = inferTrack(answers, diagnostic, generated);
  const city = answers?.city.trim() || targetUniversity?.city || "Казахстан";
  const place = answers?.studyLocation === "abroad" ? "зарубежное поступление" : "поступление в Казахстане";
  const budget = answers?.budgetConstraints.trim() || "грант в приоритете";
  const achievement = answers?.achievements.trim() || "текущие школьные результаты";
  const subjects = subjectListRu(answers?.subjectIds ?? []);
  const style = answers?.workPreference ? WORK_RU[answers.workPreference] : "смешанный формат";
  const profession = track.profession;
  const uni =
    targetUniversity?.name ||
    (answers?.studyLocation === "abroad" ? "целевой зарубежный вуз" : `вузы ${city}`);
  const grant = generated?.financial_route.grants[0];
  const level = diagnostic ? LEVEL_LABELS[diagnostic.level] : null;
  const weak = weakTopicTitles(diagnostic);
  const accuracy = diagnostic
    ? Math.round((diagnostic.correct / Math.max(1, diagnostic.total)) * 100)
    : null;
  const exam = profile?.examDate;
  const diagSubject = diagnostic ? subjectTitle(diagnostic.subjectId) : null;

  return [
    {
      id: "vision",
      title: "Специализация",
      subtitle: track.label,
      phase: "Сейчас",
      detail: `Ваш трек — ${track.label}. Сильные предметы: ${subjects}. Стиль работы: ${style}. Целевая роль: ${profession}.`,
      actions: [
        `Зафиксировать направление «${track.label}»`,
        `Выбрать 2 программы: ${track.programs}`,
        "Написать одно предложение: кем вы хотите стать через 5 лет",
      ],
      metric: "Ясность трека",
      x: 9,
      y: 68,
      tone: "purple",
    },
    {
      id: "gaps",
      title: "Пробелы диагностики",
      subtitle: level
        ? `${diagSubject}, ${profile?.grade ?? diagnostic?.grade} класс · уровень ${level}${accuracy != null ? ` · ${accuracy}%` : ""}`
        : "Сначала пройдите диагностику — план подтянет слабые темы",
      phase: "2–6 недель",
      detail: weak.length
        ? `Диагностика показала, что сейчас тянут вниз: ${weak.join(", ")}. Закройте их до набора портфолио.`
        : diagnostic
          ? "Критических пробелов нет — держите темп по профильному предмету и переходите к проектам."
          : "Без диагностики roadmap не знает ваши узкие темы. Это не общий шаблон — это ваш уровень.",
      actions: weak.length
        ? weak.map((title) => `Отработать тему: ${title}`)
        : diagnostic
          ? [`Продолжить ${diagSubject} на уровне «${level}»`, "Решать по 15–30 минут в день"]
          : ["Открыть диагностику", "Пройти 8 вопросов по предмету"],
      metric: "Закрытые пробелы",
      x: 25,
      y: 34,
      tone: "red",
    },
    {
      id: "skills",
      title: "Навыковый спринт",
      subtitle: track.proof,
      phase: "1–3 месяца",
      detail: `Соберите доказательства вокруг «${achievement}». Цель обучения: ${goalTitles(profile)}. Работодатели и приёмные комиссии смотрят на артефакты, не на лозунги.`,
      actions: [
        `Один портфолио-проект под ${track.label}`,
        "Еженедельный лог прогресса (фото, GitHub, отчёт)",
        "Обратная связь учителя или наставника",
      ],
      metric: "Сила доказательств",
      x: 43,
      y: 61,
      tone: "green",
    },
    {
      id: "programs",
      title: "Шортлист вузов",
      subtitle: uni,
      phase: "3–5 месяцев",
      detail: `Сравнивайте ${track.programs} вокруг ${city}. ${place}. Оставьте только программы, которые совпадают с предметами (${subjects}) и бюджетом.`,
      actions: [
        `Короткий список: ${uni}`,
        "Проверить пререквизиты и язык обучения",
        "Сверить дедлайны с датой цели" + (exam ? ` (${exam})` : ""),
      ],
      metric: "Fit программ",
      x: 61,
      y: 28,
      tone: "purple",
    },
    {
      id: "grants",
      title: "Грантовая стратегия",
      subtitle: grant ? `${grant.name} · ${grant.deadline}` : budget,
      phase: "5–7 месяцев",
      detail: grant
        ? `По вашему плану первым совпадением идёт «${grant.name}» (дедлайн ${grant.deadline}). Покрытие бюджета: ${generated?.financial_route.coverage_percent ?? 0}%.`
        : `Ориентир по деньгам: ${budget}. Откройте каталог грантов под ${place} и сохраните 3 совпадения.`,
      actions: [
        "Открыть страницу грантов",
        "Сохранить 3 подходящих гранта",
        "Собрать транскрипт и подтверждающие документы",
      ],
      metric: "Покрытие бюджета",
      x: 78,
      y: 56,
      tone: "red",
    },
    {
      id: "launch",
      title: "Подача",
      subtitle: exam ? `цель к ${exam}` : "подать, собеседование, запасной план",
      phase: "7–12 месяцев",
      detail: `Соберите пакет: портфолио, мотивационное, рекомендация. Роль: ${profession}. Если ${city} не сложится — запасная программа того же трека.`,
      actions: [
        "Черновик мотивационного эссе под выбранный трек",
        "Запросить рекомендательное письмо",
        "Репетиция собеседования + запасной вуз",
      ],
      metric: "Готовность пакета",
      x: 92,
      y: 31,
      tone: "slate",
    },
  ];
}

export function readinessScore(input: {
  answers: OnboardingAnswers | null;
  diagnostic: DiagnosticResult | null;
  generated: GenerateResponse | null;
}): number {
  const { answers, diagnostic, generated } = input;
  if (!answers) return 12;
  let score = 18;
  if (answers.subjectIds.length) score += 14;
  if (answers.freeTime.trim()) score += 8;
  if (answers.achievements.trim()) score += 14;
  if (answers.workPreference) score += 8;
  if (answers.studyLocation) score += 8;
  if (answers.city.trim()) score += 6;
  if (answers.budgetConstraints.trim()) score += 6;
  if (diagnostic) score += 12;
  if (generated?.career_map.length) score += 6;
  return Math.min(100, score);
}
