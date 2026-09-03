import { BAKED_CLIPS } from "./baked";
import { fallbackBeats, type LearningClip } from "./types";
import { BASE_TOPICS, findTopic } from "../catalog";
import { localizeTopic } from "../kk-overlay";

export function bakedClipFor(topicId: string, locale: "ru" | "kk"): LearningClip | null {
  if (locale === "kk") {
    return BAKED_CLIPS.find((clip) => clip.topicId === topicId && clip.locale === "kk")
      ?? BAKED_CLIPS.find((clip) => clip.topicId === topicId) ?? null;
  }
  return BAKED_CLIPS.find((clip) => clip.topicId === topicId && clip.locale === "ru") ?? null;
}

export function localClipForTopic(topicId: string, locale: "ru" | "kk"): LearningClip {
  const baked = bakedClipFor(topicId, locale);
  if (baked) return baked;
  const topic = findTopic(BASE_TOPICS, topicId);
  const localized = topic ? localizeTopic(topic, locale) : null;
  return {
    id: `live-${topicId}`,
    topicId,
    title: localized?.title ?? topicId,
    locale,
    baked: false,
    quizTaskId: localized?.tasks[0]?.id ?? "",
    beats: fallbackBeats(localized?.title ?? topicId, localized?.theory ?? [], locale),
  };
}

export { BAKED_CLIPS };
