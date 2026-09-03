/** Teacher-authored live clip script — played in the browser / Expo, never encoded. */

export const LIVE_CLIP_VISUALS = ["formula", "bullets", "diagram", "compare"] as const;
export type LiveClipVisual = (typeof LIVE_CLIP_VISUALS)[number];

export const LIVE_CLIP_WORDS_PER_SEC = 2.5;
export const LIVE_CLIP_MAX_SCENES = 6;
export const LIVE_CLIP_TARGET_WORDS = 130;
export const LIVE_CLIP_MIN_WORDS = 90;
export const LIVE_CLIP_MAX_WORDS = 150;

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

export function isLiveClipVisual(value: unknown): value is LiveClipVisual {
  return typeof value === "string" && (LIVE_CLIP_VISUALS as readonly string[]).includes(value);
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function estimateDurationSec(narrationWords: number): number {
  const seconds = Math.round(narrationWords / LIVE_CLIP_WORDS_PER_SEC);
  return Math.min(70, Math.max(40, seconds || 40));
}

export function totalNarrationWords(scenes: readonly { narration: string }[]): number {
  return scenes.reduce((sum, scene) => sum + countWords(scene.narration), 0);
}

export function sceneDurationMs(narration: string): number {
  const words = Math.max(1, countWords(narration));
  return Math.round((words / LIVE_CLIP_WORDS_PER_SEC) * 1000);
}

function trimToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function sentencesFrom(text: string): string[] {
  const chunks = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
  return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean);
}

function visualForIndex(index: number, text: string): LiveClipVisual {
  if (/[=+\-*/^√]|\\frac|x\^/.test(text)) return "formula";
  if (index === 0) return "diagram";
  if (index % 3 === 1) return "bullets";
  if (index % 3 === 2) return "compare";
  return "formula";
}

export function fallbackLiveClip(input: {
  title: string;
  prompt: string;
  language: "ru" | "kk";
  subject?: string;
  skillId?: string;
}): LiveClipScript {
  const kk = input.language === "kk";
  const title = input.title.trim() || (kk ? "Тақырып" : "Тема");
  const source = [input.prompt, title].filter((part) => part.trim()).join(". ");
  const sentences = sentencesFrom(source);
  const sceneCount = Math.min(LIVE_CLIP_MAX_SCENES, Math.max(4, Math.min(6, sentences.length)));
  const perScene = Math.max(1, Math.ceil(sentences.length / sceneCount));
  const wordsBudget = Math.floor(LIVE_CLIP_TARGET_WORDS / sceneCount);

  const scenes: LiveClipScene[] = [];
  for (let i = 0; i < sceneCount; i += 1) {
    const slice = sentences.slice(i * perScene, i * perScene + perScene);
    const body = slice.join(" ") || title;
    const heading =
      i === 0
        ? title
        : kk
          ? `Қадам ${i + 1}`
          : `Шаг ${i + 1}`;
    const lead = kk
      ? i === 0
        ? `${title}. Негізін қысқаша түсіндіреміз.`
        : body
      : i === 0
        ? `${title}. Коротко разберём суть.`
        : body;
    scenes.push({
      id: `scene-${i + 1}`,
      heading,
      body: trimToWords(body, 28),
      formula: visualForIndex(i, body) === "formula" ? trimToWords(body, 12) : undefined,
      narration: trimToWords(lead, wordsBudget),
      visual: visualForIndex(i, body),
    });
  }

  const words = totalNarrationWords(scenes);
  const skillId = input.skillId?.trim() || title;
  const quiz: LiveClipQuiz = kk
    ? {
        question: `${title} бойынша қай тұжырым дұрыс?`,
        options: [
          sentences[0] ? trimToWords(sentences[0], 10) : `${title} ережесін қолданамыз.`,
          kk ? "Тек жаттау керек, түсінудің қажеті жоқ." : "",
          "Тақырып емтиханда кездеспейді.",
        ],
        correctIndex: 0,
        explanation: sentences[1] ? trimToWords(sentences[1], 22) : `${title} — негізгі идеяны қолдану.`,
        skillId,
      }
    : {
        question: `Что верно про тему «${title}»?`,
        options: [
          sentences[0] ? trimToWords(sentences[0], 10) : `Нужно понять правило темы «${title}».`,
          "Достаточно заучить формулировку без смысла.",
          "Эта тема не встречается на контрольной.",
        ],
        correctIndex: 0,
        explanation: sentences[1]
          ? trimToWords(sentences[1], 22)
          : `Разберите условие и примените правило темы «${title}».`,
        skillId,
      };

  return {
    title,
    durationSec: estimateDurationSec(words),
    language: input.language,
    scenes,
    quiz,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScene(raw: unknown, index: number): LiveClipScene | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const heading = asString(row.heading);
  const narration = asString(row.narration);
  if (!heading || !narration) return null;
  const visual = isLiveClipVisual(row.visual) ? row.visual : visualForIndex(index, narration);
  const body = asString(row.body) || undefined;
  const formula = asString(row.formula) || undefined;
  return {
    id: asString(row.id) || `scene-${index + 1}`,
    heading: trimToWords(heading, 12),
    body: body ? trimToWords(body, 36) : undefined,
    formula: formula ? trimToWords(formula.replace(/\$/g, ""), 24) : undefined,
    narration: trimToWords(narration, 36),
    visual,
  };
}

function normalizeQuiz(raw: unknown, fallback: LiveClipQuiz): LiveClipQuiz {
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const question = asString(row.question);
  const options = Array.isArray(row.options) ? row.options.map(asString).filter(Boolean) : [];
  if (!question || options.length < 3) return fallback;
  const correct = Number(row.correctIndex);
  const correctIndex = (correct === 1 || correct === 2 ? correct : 0) as 0 | 1 | 2;
  return {
    question,
    options: [options[0], options[1], options[2]],
    correctIndex,
    explanation: asString(row.explanation) || fallback.explanation,
    skillId: asString(row.skillId) || fallback.skillId,
  };
}

/** Returns a complete script or null — never a half-valid object. */
export function parseLiveClipScript(
  raw: unknown,
  fallbackInput: { title: string; prompt: string; language: "ru" | "kk"; skillId?: string },
): LiveClipScript | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = asString(row.title) || fallbackInput.title;
  const language = row.language === "kk" ? "kk" : row.language === "ru" ? "ru" : fallbackInput.language;
  const list = Array.isArray(row.scenes) ? row.scenes : [];
  const scenes = list
    .slice(0, LIVE_CLIP_MAX_SCENES)
    .map((item, index) => normalizeScene(item, index))
    .filter((item): item is LiveClipScene => item !== null);
  if (scenes.length === 0) return null;
  const fallback = fallbackLiveClip({ ...fallbackInput, title, language });
  const words = totalNarrationWords(scenes);
  if (words < 8) return null;
  const duration = Number(row.durationSec);
  return {
    title,
    durationSec: Number.isFinite(duration)
      ? Math.min(70, Math.max(40, Math.round(duration)))
      : estimateDurationSec(words),
    language,
    scenes,
    quiz: normalizeQuiz(row.quiz, fallback.quiz),
  };
}

export function topicHasLiveClip(topic: { liveClip?: LiveClipScript | null } | null | undefined): boolean {
  return Boolean(topic?.liveClip?.scenes?.length);
}
