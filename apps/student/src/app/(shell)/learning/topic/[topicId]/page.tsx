"use client";

import { useParams } from "next/navigation";
import { TopicPractice } from "@/components/learning/TopicPractice";
import { PageHero } from "@/components/ui/PageHero";

export default function LearningTopicPage() {
  const params = useParams();
  const raw = params?.topicId;
  const topicId = Array.isArray(raw) ? (raw[0] ?? "") : typeof raw === "string" ? raw : "";

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker="Тема"
        title="Задания и обратная связь"
        description="Конспект, адаптивные задания и AI-репетитор в одном месте. После каждого ответа система объясняет ошибку и подбирает следующий уровень сложности."
      />
      <TopicPractice topicId={topicId} />
    </div>
  );
}
