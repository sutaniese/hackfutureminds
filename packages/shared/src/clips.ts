/** Baked 40–60s topic videos served from `/clips/{file}` (same files on web and Expo). */

export type ClipLocale = "ru" | "kk";

export type CatalogVideoClip = {
  topicId: string;
  locale: ClipLocale;
  file: string;
  quizTaskId: string;
};

export const CATALOG_VIDEO_CLIPS: readonly CatalogVideoClip[] = [
  { topicId: "math-quadratic", locale: "ru", file: "math-quadratic.mp4", quizTaskId: "math-quadratic-1" },
  { topicId: "math-quadratic", locale: "kk", file: "math-quadratic-kk.mp4", quizTaskId: "math-quadratic-1" },
  { topicId: "math-progression", locale: "ru", file: "math-progression.mp4", quizTaskId: "math-progression-1" },
  { topicId: "math-probability", locale: "ru", file: "math-probability.mp4", quizTaskId: "math-probability-1" },
  { topicId: "phys-kinematics", locale: "ru", file: "phys-kinematics.mp4", quizTaskId: "phys-kinematics-1" },
  { topicId: "phys-newton", locale: "ru", file: "phys-newton.mp4", quizTaskId: "phys-newton-1" },
  { topicId: "phys-current", locale: "ru", file: "phys-current.mp4", quizTaskId: "phys-current-1" },
  { topicId: "inf-algorithms", locale: "ru", file: "inf-algorithms.mp4", quizTaskId: "inf-algorithms-1" },
  { topicId: "inf-python", locale: "ru", file: "inf-python.mp4", quizTaskId: "inf-python-2" },
  { topicId: "inf-data", locale: "ru", file: "inf-data.mp4", quizTaskId: "inf-data-1" },
  { topicId: "chem-atom", locale: "ru", file: "chem-atom.mp4", quizTaskId: "chem-atom-1" },
  { topicId: "chem-reactions", locale: "ru", file: "chem-reactions.mp4", quizTaskId: "chem-reactions-1" },
  { topicId: "bio-cell", locale: "ru", file: "bio-cell.mp4", quizTaskId: "bio-cell-1" },
  { topicId: "bio-genetics", locale: "ru", file: "bio-genetics.mp4", quizTaskId: "bio-genetics-1" },
  { topicId: "hist-khanate", locale: "ru", file: "hist-khanate.mp4", quizTaskId: "hist-khanate-1" },
  { topicId: "hist-modern", locale: "ru", file: "hist-modern.mp4", quizTaskId: "hist-modern-1" },
  { topicId: "eng-tenses", locale: "ru", file: "eng-tenses.mp4", quizTaskId: "eng-tenses-1" },
  { topicId: "eng-reading", locale: "ru", file: "eng-reading.mp4", quizTaskId: "eng-reading-1" },
] as const;

export const DEMO_BUNDLED_CLIP_TOPICS = ["math-quadratic", "phys-newton", "inf-python"] as const;

export function videoClipFor(topicId: string, locale: ClipLocale): CatalogVideoClip | null {
  if (locale === "kk") {
    return (
      CATALOG_VIDEO_CLIPS.find((clip) => clip.topicId === topicId && clip.locale === "kk") ??
      CATALOG_VIDEO_CLIPS.find((clip) => clip.topicId === topicId && clip.locale === "ru") ??
      null
    );
  }
  return CATALOG_VIDEO_CLIPS.find((clip) => clip.topicId === topicId && clip.locale === "ru") ?? null;
}

export function clipPublicPath(topicId: string, locale: ClipLocale): string | null {
  const clip = videoClipFor(topicId, locale);
  return clip ? `/clips/${clip.file}` : null;
}

export function clipProductionUrl(topicId: string, locale: ClipLocale, origin = "https://buzhai.nurakhmet.info"): string | null {
  const path = clipPublicPath(topicId, locale);
  return path ? `${origin.replace(/\/$/, "")}${path}` : null;
}

export function catalogTopicIdsWithVideo(): string[] {
  return [...new Set(CATALOG_VIDEO_CLIPS.filter((clip) => clip.locale === "ru").map((clip) => clip.topicId))];
}
