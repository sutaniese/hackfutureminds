/** Live teacher-authored clip: JSON scenes played in the browser, never encoded to video. */

export const LIVE_CLIP_VISUALS = ["formula", "bullets", "diagram", "compare"] as const;
export type LiveClipVisual = (typeof LIVE_CLIP_VISUALS)[number];

export const LIVE_CLIP_WORDS_PER_SEC = 2.5;
export const LIVE_CLIP_MIN_SEC = 40;
export const LIVE_CLIP_MAX_SEC = 60;
export const LIVE_CLIP_MAX_SCENES = 6;

export type LiveClipScene = {
  id: string;
  heading: string;
  body?: string;
  formula?: string;
  narration: string;
  visual: LiveClipVisual;
};

export type LiveClipQuiz = {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  skillId: string;
};

export type LiveClipScript = {
  title: string;
  durationSec: number;
  language: "ru" | "kk";
  scenes: LiveClipScene[];
  quiz: LiveClipQuiz;
};

export type LiveClipFallbackInput = {
  title: string;
  prompt: string;
  language: "ru" | "kk";
  skillId?: string;
  subject?: string;
  grade?: number;
};

export const CLIP_STAGE = {
  ink: "#07060F",
  inkSoft: "#12101C",
  purple: "#6C63FF",
  purpleSoft: "#A99CFF",
  white: "#F7F6FF",
  muted: "#C7C3E0",
  card: "#161326",
  cardLine: "#2A2550",
  mint: "#43D19E",
  wordmark: "teñ.",
} as const;

export function countNarrationWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function estimateDurationSec(script: Pick<LiveClipScript, "scenes">): number {
  const words = script.scenes.reduce((sum, scene) => sum + countNarrationWords(scene.narration), 0);
  const seconds = Math.round(words / LIVE_CLIP_WORDS_PER_SEC);
  return Math.min(LIVE_CLIP_MAX_SEC, Math.max(LIVE_CLIP_MIN_SEC, seconds || LIVE_CLIP_MIN_SEC));
}

export function sceneDurationMs(narration: string): number {
  const words = countNarrationWords(narration);
  return Math.max(4_000, Math.round((words / LIVE_CLIP_WORDS_PER_SEC) * 1_000));
}

function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8);
}

function chunksOf(text: string, size: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    out.push(words.slice(i, i + size).join(" "));
  }
  return out;
}

function looksLikeFormula(text: string): boolean {
  return /[=√∑∫≤≥≠]|\\frac|x\^|y\^|\d+\s*[+\-*/]\s*\d+/.test(text);
}

const COPY = {
  ru: {
    open: (title: string) => `Сейчас разберём тему «${title}». Смотрите формулу и шаги на экране.`,
    idea: "Главная идея — в тексте учителя. Держим её на экране и проговариваем спокойно.",
    example: "Применяем то же правило на коротком примере, без лишних шагов.",
    compare: "Сравните два случая: что общее и чем они отличаются.",
    recap: "Коротко: запомните формулировку и когда её применять. Дальше — одно задание.",
    quizQ: (title: string) => `Что главное в теме «${title}»?`,
    quizExplain: "Вернитесь к формулировке из клипа и разберите условие ещё раз.",
    distractorA: "Другое правило из соседней темы",
    distractorB: "Случайный факт без связи с условием",
  },
  kk: {
    open: (title: string) => `Қазір «${title}» тақырыбын қарастырамыз. Экрандағы формула мен қадамдарға қараңыз.`,
    idea: "Негізгі идея — мұғалім мәтінінде. Оны экранда ұстап, анық айтамыз.",
    example: "Сол ережені қысқа мысалда қолданамыз, артық қадамсыз.",
    compare: "Екі жағдайды салыстырыңыз: не ортақ және несімен ерекшеленеді.",
    recap: "Қысқаша: тұжырымды және оны қашан қолдану керегін есте сақтаңыз. Келесі — бір тапсырма.",
    quizQ: (title: string) => `«${title}» тақырыбында не басты?`,
    quizExplain: "Клиптегі тұжырымға оралып, шартты қайта талдаңыз.",
    distractorA: "Көрші тақырыптың басқа ережесі",
    distractorB: "Шартқа қатысы жоқ кездейсоқ факт",
  },
} as const;

/**
 * Deterministic scene script from the teacher's own wording.
 * Used when the model is missing or returns an unusable payload.
 */
export function fallbackLiveClipScript(input: LiveClipFallbackInput): LiveClipScript {
  const language = input.language === "kk" ? "kk" : "ru";
  const copy = COPY[language];
  const title = input.title.trim() || (language === "kk" ? "Тақырып" : "Тема");
  const prompt = input.prompt.replace(/\s+/g, " ").trim() || title;
  const skillId = (input.skillId || title).slice(0, 80);
  const parts = sentencesOf(prompt);
  const pieces = parts.length >= 2 ? parts : chunksOf(prompt, 18);
  const a = pieces[0] || prompt;
  const b = pieces[1] || pieces[0] || prompt;
  const c = pieces[2] || b;
  const formulaSource = [a, b, c, prompt].find(looksLikeFormula);

  const scenes: LiveClipScene[] = [
    {
      id: "s1",
      heading: title,
      body: a,
      narration: `${copy.open(title)} ${a}`.trim(),
      visual: "diagram",
    },
    {
      id: "s2",
      heading: language === "kk" ? "Идея" : "Идея",
      body: b,
      formula: formulaSource,
      narration: `${copy.idea} ${b}`.trim(),
      visual: formulaSource ? "formula" : "bullets",
    },
    {
      id: "s3",
      heading: language === "kk" ? "Қадамдар" : "Шаги",
      body: c,
      narration: `${copy.example} ${c}`.trim(),
      visual: "bullets",
    },
    {
      id: "s4",
      heading: language === "kk" ? "Салыстыру" : "Сравнение",
      body: `${a}\n${b}`,
      narration: `${copy.compare} ${a} ${b}`.trim(),
      visual: "compare",
    },
    {
      id: "s5",
      heading: language === "kk" ? "Қорытынды" : "Итог",
      body: prompt.slice(0, 280),
      narration: `${copy.recap} ${title}. ${a}`.trim(),
      visual: "bullets",
    },
  ].slice(0, LIVE_CLIP_MAX_SCENES);

  const correct = a.length > 48 ? `${a.slice(0, 72).trim()}…` : a;
  const quiz: LiveClipQuiz = {
    question: copy.quizQ(title),
    options: [correct, copy.distractorA, copy.distractorB],
    correctIndex: 0,
    explanation: `${copy.quizExplain} ${a}`.trim(),
    skillId,
  };

  const script: LiveClipScript = {
    title,
    durationSec: LIVE_CLIP_MIN_SEC,
    language,
    scenes,
    quiz,
  };
  script.durationSec = estimateDurationSec(script);
  return script;
}

export function topicHasLiveClip(
  topic: { id: string; clipScript?: LiveClipScript | null } | null | undefined,
): boolean {
  return Boolean(topic?.clipScript?.scenes?.length);
}
