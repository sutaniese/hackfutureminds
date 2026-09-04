import { z } from "zod";
import { canAccessUniversityLayer, type GradeLike } from "@pathwise/shared";
import type { UserRole } from "@/lib/site-nav";

export const VOICE_NAV_TARGETS = [
  "home",
  "cabinet",
  "learning",
  "diagnostics",
  "topic",
  "clips",
  "class",
  "students",
  "teacher_hub",
  "mentor",
  "universities",
  "grants",
  "onboarding",
  "results",
  "roadmap",
  "portfolio",
  "support",
  "accessibility",
] as const;

export type VoiceNavTarget = (typeof VOICE_NAV_TARGETS)[number];

const speak = z.string().min(1).max(280);

export const voiceControlCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("navigate"),
    target: z.enum(VOICE_NAV_TARGETS),
    subjectId: z.string().max(40).optional(),
    topicQuery: z.string().max(80).optional(),
    speak,
  }),
  z.object({
    action: z.literal("diagnostic"),
    verb: z.enum(["start", "skip", "dont_know"]),
    subjectId: z.string().max(40).optional(),
    speak,
  }),
  z.object({
    action: z.literal("clip"),
    verb: z.enum(["play", "pause", "replay", "open"]),
    topicQuery: z.string().max(80).optional(),
    speak,
  }),
  z.object({
    action: z.literal("join_class"),
    inviteCode: z.string().min(3).max(24),
    speak,
  }),
  z.object({
    action: z.literal("language"),
    locale: z.enum(["ru", "kk", "en"]),
    speak,
  }),
  z.object({
    action: z.literal("role"),
    role: z.enum(["student", "teacher", "parent"]),
    speak,
  }),
  z.object({ action: z.literal("back"), speak }),
  z.object({ action: z.literal("open_more"), speak }),
  z.object({
    action: z.literal("logout"),
    confirm: z.boolean().optional(),
    speak,
  }),
  z.object({ action: z.literal("read_screen"), speak }),
  z.object({ action: z.literal("noop"), speak }),
]);

export type VoiceControlCommand = z.infer<typeof voiceControlCommandSchema>;

export const TEACHER_ONLY_TARGETS: VoiceNavTarget[] = ["students", "teacher_hub"];
export const UNIVERSITY_TARGETS: VoiceNavTarget[] = ["universities", "grants"];

const SUBJECT_ALIASES: Record<string, string> = {
  math: "math",
  математик: "math",
  математика: "math",
  phys: "physics",
  физик: "physics",
  физика: "physics",
  inf: "informatics",
  информатик: "informatics",
};

export function normalizeSubjectId(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (!key) return undefined;
  if (SUBJECT_ALIASES[key]) return SUBJECT_ALIASES[key];
  const hit = Object.entries(SUBJECT_ALIASES).find(([alias]) => key.includes(alias));
  return hit?.[1];
}

export function resolveVoicePath(
  command: VoiceControlCommand,
  ctx: { role: UserRole | null; grade: GradeLike; userRole?: UserRole | null },
): { path?: string; blocked?: string } {
  if (command.action !== "navigate") return {};
  const role = ctx.userRole ?? ctx.role;
  if (TEACHER_ONLY_TARGETS.includes(command.target) && role !== "teacher") {
    return { blocked: "Этот раздел только для учителя." };
  }
  if (UNIVERSITY_TARGETS.includes(command.target) && !canAccessUniversityLayer(ctx.grade)) {
    return { blocked: "Вузы и гранты открываются с 10 класса." };
  }

  const subject = normalizeSubjectId(command.subjectId);
  const topic = command.topicQuery?.trim();

  switch (command.target) {
    case "home":
      return { path: "/" };
    case "cabinet":
      if (role === "teacher") return { path: "/hub/uchitelya" };
      if (role === "parent") return { path: "/hub/roditeli" };
      return { path: "/" };
    case "learning":
      return { path: role === "teacher" ? "/hub/obuchenie" : "/learning" };
    case "diagnostics":
      return {
        path: subject ? `/learning/diagnostics?subject=${encodeURIComponent(subject)}` : "/learning/diagnostics",
      };
    case "topic":
      return { path: topic ? `/learning?q=${encodeURIComponent(topic)}` : "/learning" };
    case "clips":
      if (role === "teacher") return { path: "/hub/obuchenie" };
      return { path: topic ? `/learning/clips?q=${encodeURIComponent(topic)}` : "/learning/clips" };
    case "class":
      return { path: "/learning/class" };
    case "students":
      return { path: "/hub/uchenik" };
    case "teacher_hub":
      return { path: "/hub/uchitelya" };
    case "mentor":
      return { path: "/hub/agent" };
    case "universities":
      return { path: "/hub/vuzy" };
    case "grants":
      return { path: "/grants" };
    case "onboarding":
      return { path: "/onboarding" };
    case "results":
      return { path: "/results" };
    case "roadmap":
      return { path: "/roadmap" };
    case "portfolio":
      return { path: "/portfolio" };
    case "support":
      return { path: "/support" };
    case "accessibility":
      return { path: "/accessibility" };
    default:
      return { blocked: "Команда не в списке." };
  }
}

export function parseVoiceControlCommand(raw: unknown): VoiceControlCommand | null {
  const parsed = voiceControlCommandSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const NAV_PLAIN: Record<VoiceNavTarget, string> = {
  home: "Открываю главную",
  cabinet: "Открываю кабинет",
  learning: "Открываю обучение",
  diagnostics: "Открываю диагностику",
  topic: "Открываю тему",
  clips: "Открываю клипы",
  class: "Открываю класс",
  students: "Открываю учеников",
  teacher_hub: "Открываю кабинет учителя",
  mentor: "Открываю наставника",
  universities: "Открываю вузы",
  grants: "Открываю гранты",
  onboarding: "Открываю анкету",
  results: "Открываю результаты",
  roadmap: "Открываю маршрут",
  portfolio: "Открываю портфолио",
  support: "Открываю поддержку",
  accessibility: "Открываю доступность",
};

/** Plain-language line for the control tab (what the app will do). */
export function commandPlainLanguage(command: VoiceControlCommand): string {
  if (command.speak.trim()) return command.speak;
  if (command.action === "navigate") return NAV_PLAIN[command.target];
  if (command.action === "logout") return "Выхожу из аккаунта";
  if (command.action === "back") return "Возвращаюсь назад";
  return command.speak;
}
