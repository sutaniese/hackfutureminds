"use client";

import { useCallback, useState } from "react";
import type { LiveClipScript } from "@pathwise/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { SUBJECTS } from "@/lib/learning/catalog";
import { LiveClipPlayer } from "@/components/learning/live-clip/LiveClipPlayer";
import type { Grade } from "@/lib/learning/types";

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];

export function ClipBuilderPanel({
  defaultSubjectId,
  defaultGrade,
  defaultTitle,
  script,
  onScript,
}: {
  defaultSubjectId: string;
  defaultGrade: Grade;
  defaultTitle: string;
  script: LiveClipScript | null;
  onScript: (script: LiveClipScript | null) => void;
}) {
  const { t, locale } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [grade, setGrade] = useState<Grade>(defaultGrade);
  const [language, setLanguage] = useState<"ru" | "kk">(locale === "kk" ? "kk" : "ru");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);

  const generate = useCallback(async () => {
    const text = prompt.trim();
    if (!text) {
      setError(t("builder.clipNeedPrompt"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/clips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          prompt: text,
          title: defaultTitle.trim() || text.slice(0, 80),
          subject: subjectId,
          grade,
          locale: language,
        }),
      });
      const data = (await response.json()) as { script?: LiveClipScript; source?: "ai" | "fallback"; error?: string };
      if (!data.script) {
        setError(data.error || t("builder.clipFail"));
        return;
      }
      onScript(data.script);
      setSource(data.source ?? "fallback");
    } catch {
      setError(t("builder.clipFail"));
    } finally {
      setBusy(false);
    }
  }, [defaultTitle, grade, language, onScript, prompt, subjectId, t]);

  const updateNarration = (sceneId: string, narration: string) => {
    if (!script) return;
    onScript({
      ...script,
      scenes: script.scenes.map((scene) => (scene.id === sceneId ? { ...scene, narration } : scene)),
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-pathwise-ink">{t("builder.clipTitle")}</h3>
        <p className="mt-1 text-xs text-pathwise-muted">{t("builder.clipHint")}</p>
      </div>

      <div>
        <label htmlFor="clip-prompt" className="text-sm font-semibold text-pathwise-ink">
          {t("builder.clipPrompt")}
        </label>
        <textarea
          id="clip-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          placeholder={t("builder.clipPromptPh")}
          className="pw-input mt-2 w-full px-3 py-3 text-sm"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="clip-subject" className="text-xs font-semibold text-pathwise-muted">
            {t("builder.subject")}
          </label>
          <select
            id="clip-subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
          >
            {SUBJECTS.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="clip-grade" className="text-xs font-semibold text-pathwise-muted">
            {t("builder.grades")}
          </label>
          <select
            id="clip-grade"
            value={grade}
            onChange={(event) => setGrade(Number(event.target.value) as Grade)}
            className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
          >
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="clip-lang" className="text-xs font-semibold text-pathwise-muted">
            {t("builder.clipLang")}
          </label>
          <select
            id="clip-lang"
            value={language}
            onChange={(event) => setLanguage(event.target.value === "kk" ? "kk" : "ru")}
            className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
          >
            <option value="ru">{t("builder.clipRu")}</option>
            <option value="kk">{t("builder.clipKk")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6C63FF] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("builder.clipBuilding") : script ? t("builder.clipRegen") : t("builder.clipBuild")}
        </button>
        {script ? (
          <button
            type="button"
            onClick={() => {
              onScript(null);
              setSource(null);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold"
          >
            {t("builder.remove")}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm font-semibold text-[#E75555]">{error}</p> : null}
      {source ? (
        <p className="text-xs text-pathwise-muted">
          {source === "ai" ? t("builder.clipSourceAi") : t("builder.clipSourceFallback")}
        </p>
      ) : null}

      {script ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,390px)_1fr]">
          <LiveClipPlayer script={script} topicId="preview-live-clip" preview />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-pathwise-ink">{t("builder.clipNarration")}</p>
            {script.scenes.map((scene, index) => (
              <div key={scene.id}>
                <label htmlFor={`narr-${scene.id}`} className="text-xs font-semibold text-pathwise-muted">
                  {index + 1}. {scene.heading}
                </label>
                <textarea
                  id={`narr-${scene.id}`}
                  value={scene.narration}
                  onChange={(event) => updateNarration(scene.id, event.target.value)}
                  rows={2}
                  className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
