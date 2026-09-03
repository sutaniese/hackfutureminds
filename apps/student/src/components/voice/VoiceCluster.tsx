"use client";

import { useState } from "react";
import { VoiceCoach } from "./VoiceCoach";
import { VoiceControl } from "./VoiceControl";
import { useI18n } from "@/i18n/I18nProvider";

/** One docked sheet: mentor + hands-free control. Never two competing FABs. */
export function VoiceCluster() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"coach" | "control">("coach");

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--pw-nav,4.5rem)+0.75rem)] right-4 z-[60] flex max-w-[min(24rem,calc(100vw-1.5rem))] flex-col items-end gap-2">
      {open ? (
        <div className="pointer-events-auto w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 p-2">
            <button
              type="button"
              onClick={() => setTab("coach")}
              className={`min-h-12 flex-1 rounded-full text-sm font-bold ${tab === "coach" ? "bg-[#6C63FF] text-white" : "bg-slate-50"}`}
            >
              {t("voiceDock.coach")}
            </button>
            <button
              type="button"
              onClick={() => setTab("control")}
              className={`min-h-12 flex-1 rounded-full text-sm font-bold ${tab === "control" ? "bg-[#0F766E] text-white" : "bg-slate-50"}`}
            >
              {t("voiceDock.control")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold"
              aria-label={t("voiceCoach.close")}
            >
              ×
            </button>
          </div>
          <div className={tab === "coach" ? "block" : "hidden"}>
            <VoiceCoach embedded />
          </div>
          <div className={tab === "control" ? "block" : "hidden"}>
            <VoiceControl embedded />
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#6C63FF] text-white shadow-lg"
        aria-expanded={open}
        aria-label={t("voiceCoach.studentTitle")}
      >
        🎙
      </button>
    </div>
  );
}
