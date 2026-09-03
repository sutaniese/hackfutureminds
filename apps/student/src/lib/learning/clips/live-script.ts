import { z } from "zod";
import {
  LIVE_CLIP_MAX_SCENES,
  estimateDurationSec,
  fallbackLiveClipScript,
  type LiveClipFallbackInput,
  type LiveClipScript,
  type LiveClipVisual,
} from "@pathwise/shared";
import { extractJsonObject } from "@/lib/learning/groq-chat";

const visualSchema = z.enum(["formula", "bullets", "diagram", "compare"]);

const sceneSchema = z.object({
  id: z.string().min(1).max(40),
  heading: z.string().min(1).max(120),
  body: z.string().max(600).optional(),
  formula: z.string().max(240).optional(),
  narration: z.string().min(1).max(900),
  visual: visualSchema,
});

const quizSchema = z.object({
  question: z.string().min(1).max(240),
  options: z.tuple([z.string().min(1).max(180), z.string().min(1).max(180), z.string().min(1).max(180)]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  explanation: z.string().min(1).max(400),
  skillId: z.string().min(1).max(80),
});

export const liveClipScriptSchema = z.object({
  title: z.string().min(1).max(120),
  durationSec: z.preprocess((value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 48;
    return Math.min(60, Math.max(40, Math.round(n)));
  }, z.number().int().min(40).max(60)),
  language: z.enum(["ru", "kk"]),
  scenes: z.array(sceneSchema).min(3).max(LIVE_CLIP_MAX_SCENES),
  quiz: quizSchema,
});

export type LiveClipParseResult =
  | { ok: true; script: LiveClipScript }
  | { ok: false; issues: string[] };

function issuesOf(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
}

function coerceDuration(script: LiveClipScript): LiveClipScript {
  return { ...script, durationSec: estimateDurationSec(script) };
}

function asText(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function coerceVisual(value: unknown, text: string): LiveClipVisual {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("formula") || raw.includes("формул") || /[=^\\]|\\frac/.test(text)) return "formula";
  if (raw.includes("compare") || raw.includes("сравн") || raw.includes("салыст")) return "compare";
  if (raw.includes("diagram") || raw.includes("схем") || raw.includes("диагр")) return "diagram";
  if (raw.includes("bullet") || raw.includes("список") || raw.includes("тізім")) return "bullets";
  return "bullets";
}

function coerceCorrectIndex(value: unknown): 0 | 1 | 2 {
  const n = Number(value);
  if (n === 1 || n === 2) return n;
  return 0;
}

/** Loosen Groq JSON (string indexes, extra scenes, missing ids) before strict zod. */
export function coerceLiveClipPayload(input: unknown, seed?: { language?: "ru" | "kk"; skillId?: string }): unknown {
  if (!input || typeof input !== "object") return input;
  const row = input as Record<string, unknown>;
  const language = row.language === "kk" || row.language === "ru" ? row.language : seed?.language ?? "ru";
  const list = Array.isArray(row.scenes) ? row.scenes : [];
  const scenes = list.slice(0, LIVE_CLIP_MAX_SCENES).map((item, index) => {
    const scene = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const heading = asText(scene.heading, 120);
    const narration = asText(scene.narration, 900);
    const body = asText(scene.body, 600);
    const formula = asText(scene.formula, 240).replace(/\$/g, "");
    return {
      id: asText(scene.id, 40) || `s${index + 1}`,
      heading,
      body: body || undefined,
      formula: formula || undefined,
      narration,
      visual: coerceVisual(scene.visual, `${heading} ${narration} ${formula}`),
    };
  });
  const quizRaw = row.quiz && typeof row.quiz === "object" ? (row.quiz as Record<string, unknown>) : {};
  const options = Array.isArray(quizRaw.options)
    ? quizRaw.options.map((option) => asText(option, 180)).filter(Boolean)
    : [];
  return {
    title: asText(row.title, 120),
    durationSec: row.durationSec,
    language,
    scenes,
    quiz: {
      question: asText(quizRaw.question, 240),
      options: [options[0] ?? "", options[1] ?? "", options[2] ?? ""],
      correctIndex: coerceCorrectIndex(quizRaw.correctIndex),
      explanation: asText(quizRaw.explanation, 400),
      skillId: asText(quizRaw.skillId, 80) || seed?.skillId || asText(row.title, 80) || "skill",
    },
  };
}

const TEMPLATE_DISTRACTORS = [
  "другое правило из соседней темы",
  "случайный факт без связи с условием",
  "случайный факт, не связанный с условием",
  "көрші тақырыптың басқа ережесі",
  "шартқа қатысы жоқ кездейсоқ факт",
];

export function isTemplateQuiz(script: Pick<LiveClipScript, "quiz">): boolean {
  const options = script.quiz.options.map((item) => item.toLowerCase());
  return TEMPLATE_DISTRACTORS.some((item) => options.includes(item));
}

export function scriptEchoesBrief(script: LiveClipScript, brief: string): boolean {
  const stem = brief.replace(/\s+/g, " ").trim();
  if (stem.length < 24) return false;
  const needle = stem.slice(0, 36).toLowerCase();
  const hay = [script.title, ...script.scenes.map((scene) => scene.heading), script.quiz.question]
    .join("\n")
    .toLowerCase();
  return hay.includes(needle);
}

/** Strict parse. Extra keys are stripped; missing/wrong shape fails. */
export function parseLiveClipScript(input: unknown, seed?: { language?: "ru" | "kk"; skillId?: string }): LiveClipParseResult {
  const result = liveClipScriptSchema.safeParse(coerceLiveClipPayload(input, seed));
  if (!result.success) {
    return { ok: false, issues: issuesOf(result.error) };
  }
  return { ok: true, script: coerceDuration(result.data) };
}

export function parseLiveClipScriptFromModel(
  raw: string | null | undefined,
  seed?: { language?: "ru" | "kk"; skillId?: string; brief?: string },
): LiveClipParseResult {
  const extracted = extractJsonObject<unknown>(raw);
  if (!extracted) {
    return { ok: false, issues: ["root: no JSON object"] };
  }
  const parsed = parseLiveClipScript(extracted, seed);
  if (!parsed.ok) return parsed;
  if (seed?.brief && scriptEchoesBrief(parsed.script, seed.brief)) {
    return { ok: false, issues: ["brief_echo: scene heading or quiz quotes the teacher brief"] };
  }
  if (isTemplateQuiz(parsed.script)) {
    return { ok: false, issues: ["quiz: template distractors"] };
  }
  return parsed;
}

export function liveClipScriptOrFallback(
  raw: string | null | undefined,
  fallback: LiveClipFallbackInput,
): { script: LiveClipScript; source: "ai" | "fallback" } {
  const parsed = parseLiveClipScriptFromModel(raw, {
    language: fallback.language,
    skillId: fallback.skillId,
    brief: fallback.prompt,
  });
  if (parsed.ok) return { script: parsed.script, source: "ai" };
  return { script: fallbackLiveClipScript(fallback), source: "fallback" };
}

export { fallbackLiveClipScript, liveClipScriptSchema as liveClipScriptZod };
