"use client";

import Link from "next/link";
import { LearningDashboard } from "@/components/learning/LearningDashboard";
import { PageHero } from "@/components/ui/PageHero";

export function LearningView() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker="Обучение"
        title="Личный кабинет ученика"
        description="Прогресс по темам, слабые места, ближайшие дедлайны и план подготовки, который пересобирается после каждого решённого задания."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/learning/diagnostics" className="pw-btn-primary text-sm">
            Пройти диагностику
          </Link>
          <Link href="/roadmap" className="pw-btn-secondary text-sm">
            Карьерная дорожная карта
          </Link>
        </div>
      </PageHero>
      <LearningDashboard />
    </div>
  );
}
