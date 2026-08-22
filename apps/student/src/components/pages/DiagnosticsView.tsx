"use client";

import { DiagnosticsFlow } from "@/components/learning/DiagnosticsFlow";
import { PageHero } from "@/components/ui/PageHero";

export function DiagnosticsView() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker="Диагностика"
        title="Определим твой уровень за 8 вопросов"
        description="Выбери класс, предмет и цель. Дальше система задаст вопросы, подстраивая сложность под ответы, и покажет, какие темы просели."
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["8", "адаптивных вопросов"],
            ["7-12", "классы"],
            ["AI", "разбор ошибок"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-pathwise-line/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-pathwise-ink">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-pathwise-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
      </PageHero>
      <DiagnosticsFlow />
    </div>
  );
}
