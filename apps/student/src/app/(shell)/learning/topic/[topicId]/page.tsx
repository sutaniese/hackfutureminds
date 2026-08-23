"use client";

import { useParams } from "next/navigation";
import { TopicPractice } from "@/components/learning/TopicPractice";

/** `useParams` отдаёт сегмент в том виде, в каком он стоит в URL, — декодируем. */
function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function LearningTopicPage() {
  const params = useParams();
  const raw = params?.topicId;
  const value = Array.isArray(raw) ? (raw[0] ?? "") : typeof raw === "string" ? raw : "";
  const topicId = decodeSegment(value);

  // Шапка страницы не нужна: карточка темы ниже сама работает заголовком,
  // а задание оказывается выше сгиба.
  return <TopicPractice topicId={topicId} />;
}
