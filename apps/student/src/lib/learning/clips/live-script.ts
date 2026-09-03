import { z } from "zod";
import {
  LIVE_CLIP_MAX_SCENES,
  estimateDurationSec,
  fallbackLiveClipScript,
  type LiveClipFallbackInput,
  type LiveClipScript,
} from "@pathwise/shared";
import { extractJsonObject } from "@/lib/learning/groq-chat";

const visualSchema = z.enum(["formula", "bullets", "diagram", "compare"]);

const sceneSchema = z.object({
  id: z.string().min(1).max(40),
  heading: z.string().min(1).max(120),
  body: z.string().max(600).optional(),
  formula: z.string().max(240).optional(),
  narration: z.string().min(1).max(500),
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
  scenes: z.array(sceneSchema).min(1).max(LIVE_CLIP_MAX_SCENES),
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

/** Strict parse. Extra keys are stripped; missing/wrong shape fails. */
export function parseLiveClipScript(input: unknown): LiveClipParseResult {
  const result = liveClipScriptSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, issues: issuesOf(result.error) };
  }
  return { ok: true, script: coerceDuration(result.data) };
}

export function parseLiveClipScriptFromModel(raw: string | null | undefined): LiveClipParseResult {
  const extracted = extractJsonObject<unknown>(raw);
  if (!extracted) {
    return { ok: false, issues: ["root: no JSON object"] };
  }
  return parseLiveClipScript(extracted);
}

export function liveClipScriptOrFallback(
  raw: string | null | undefined,
  fallback: LiveClipFallbackInput,
): { script: LiveClipScript; source: "ai" | "fallback" } {
  const parsed = parseLiveClipScriptFromModel(raw);
  if (parsed.ok) return { script: parsed.script, source: "ai" };
  return { script: fallbackLiveClipScript(fallback), source: "fallback" };
}

export { fallbackLiveClipScript, liveClipScriptSchema as liveClipScriptZod };
