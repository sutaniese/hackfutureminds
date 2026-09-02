"use client";

import { DiagnosticsFlow } from "@/components/learning/DiagnosticsFlow";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function DiagnosticsView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker={t("diag.kicker")} title={t("diag.title")} description={t("diag.desc")}>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["8", t("diag.stat.q")],
            ["7-12", t("diag.stat.g")],
            ["AI", t("diag.stat.ai")],
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
