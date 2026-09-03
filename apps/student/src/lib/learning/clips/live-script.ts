import { z } from "zod";
import {
  LIVE_CLIP_MAX_SCENES,
  LIVE_CLIP_VISUALS,
  fallbackLiveClip,
  parseLiveClipScript,
  type LiveClipScript,
} from "@pathwise/shared";

const sceneSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().optional(),
  formula: z.string().optional(),
  narration: z.string().min(1),
  visual: z.enum(LIVE_CLIP_VISUALS),
});

const quizSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  explanation: z.string().min(1),
  skillId: z.string().min(1),
});

export const liveClipScriptSchema = z.object({
  title: z.string().min(1),
  durationSec: z.number().int().min(30).max(90),
  language: z.enum(["ru", "kk"]),
  scenes: z.array(sceneSchema).min(1).max(LIVE_CLIP_MAX_SCENES),
  quiz: quizSchema,
});

export type LiveClipParseSource = "schema" | "normalized" | "fallback";

export function extractJsonCandidate(raw: string): unknown | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export function coerceLiveClipScript(
  raw: unknown,
  fallbackInput: { title: string; prompt: string; language: "ru" | "kk"; skillId?: string },
): { script: LiveClipScript; source: LiveClipParseSource } {
  const schemaHit = liveClipScriptSchema.safeParse(raw);
  if (schemaHit.success) {
    return { script: schemaHit.data, source: "schema" };
  }
  const normalized = parseLiveClipScript(raw, fallbackInput);
  if (normalized) {
    const again = liveClipScriptSchema.safeParse(normalized);
    if (again.success) return { script: again.data, source: "normalized" };
    return { script: normalized, source: "normalized" };
  }
  return { script: fallbackLiveClip(fallbackInput), source: "fallback" };
}

export function liveClipFromModelText(
  raw: string | null | undefined,
  fallbackInput: { title: string; prompt: string; language: "ru" | "kk"; skillId?: string },
): { script: LiveClipScript; source: LiveClipParseSource } {
  const candidate = raw ? extractJsonCandidate(raw) : null;
  return coerceLiveClipScript(candidate, fallbackInput);
}
