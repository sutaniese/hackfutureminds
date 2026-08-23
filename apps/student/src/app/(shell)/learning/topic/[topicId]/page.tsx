"use client";

import { useParams } from "next/navigation";
import { TopicPractice } from "@/components/learning/TopicPractice";
import { PageHero } from "@/components/ui/PageHero";

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

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        compact
        kicker="Тема"
        title="Задания и обратная связь"
        description="Конспект, адаптивные задания и AI-репетитор. После каждого ответа система объясняет ошибку и подбирает следующий уровень."
      />
      <TopicPractice topicId={topicId} />
    </div>
  );
}
