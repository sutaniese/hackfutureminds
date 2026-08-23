"use client";

import { DiagnosticsFlow } from "@/components/learning/DiagnosticsFlow";
import { PageHero } from "@/components/ui/PageHero";

export function DiagnosticsView() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        compact
        kicker="Диагностика"
        title="Определим твой уровень за 8 вопросов"
        description="Выбери класс, предмет и цель. Дальше система задаст вопросы, подстраивая сложность под ответы, и покажет, какие темы просели."
      >
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["8", "адаптивных вопросов"],
            ["7-12", "классы"],
            ["AI", "разбор ошибок"],
          ].map(([value, label], index) => (
            <span
              key={label}
              style={{ "--d": `${index * 90 + 120}ms` } as React.CSSProperties}
              className="pw-reveal inline-flex items-center gap-2 rounded-full border border-pathwise-line/80 bg-white px-3.5 py-2 shadow-sm"
            >
              <span className="text-sm font-black text-pathwise-accent-strong">{value}</span>
              <span className="text-xs font-semibold text-pathwise-muted">{label}</span>
            </span>
          ))}
        </div>
      </PageHero>
      <DiagnosticsFlow />
    </div>
  );
}
