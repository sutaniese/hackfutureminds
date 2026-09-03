import { canAccessUniversityLayer, type GradeLike } from "@pathwise/shared";
import { ROLE_ENTRY_PATHS, type UserRole } from "./site-nav";

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

export type VoiceCommand = {
  action?: string;
  target?: string;
  subjectId?: string;
  topicQuery?: string;
  inviteCode?: string;
  locale?: string;
  role?: string;
  verb?: string;
  confirm?: boolean;
  speak?: string;
};

const TEACHER_ONLY = new Set(["students", "teacher_hub"]);
const UNI = new Set(["universities", "grants"]);

export function commandPlainLanguage(command: VoiceCommand): string {
  if (command.speak?.trim()) return command.speak;
  if (command.action === "navigate" && command.target === "learning") return "Открываю обучение";
  return command.speak?.trim() || "";
}

export function resolveVoicePath(
  command: VoiceCommand,
  ctx: { role: UserRole | null; grade: GradeLike; userRole?: UserRole | null },
): { path?: string; blocked?: string } {
  if (command.action !== "navigate" || !command.target) return {};
  const role = ctx.userRole ?? ctx.role;
  const target = command.target as VoiceNavTarget;
  if (TEACHER_ONLY.has(target) && role !== "teacher") {
    return { blocked: "Этот раздел только для учителя." };
  }
  if (UNI.has(target) && !canAccessUniversityLayer(ctx.grade)) {
    return { blocked: "Вузы и гранты открываются с 10 класса." };
  }
  const subject = command.subjectId?.trim();
  const topic = command.topicQuery?.trim();
  switch (target) {
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

export function roleEntry(role: UserRole): string {
  return ROLE_ENTRY_PATHS[role];
}
