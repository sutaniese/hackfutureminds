"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { useI18n } from "@/i18n/I18nProvider";

const NOTES_KEY = "pathwise-portfolio-notes";
const UPLOADS_KEY = "pathwise-portfolio-files";

const MAX_FILES = 6;
const MAX_BYTES = 1_200_000;

export type StoredFileItem = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  addedAt: number;
};

function loadNotes(): string {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem(NOTES_KEY) ?? ""; } catch { return ""; }
}

function loadUploads(): StoredFileItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(UPLOADS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x) => x && typeof x === "object" && "id" in x && "name" in x && "dataUrl" in x) as StoredFileItem[];
  } catch { return []; }
}

function saveUploads(list: StoredFileItem[]) {
  try { sessionStorage.setItem(UPLOADS_KEY, JSON.stringify(list)); } catch { /* */ }
}

function saveNotes(s: string) {
  try { sessionStorage.setItem(NOTES_KEY, s); } catch { /* */ }
}

function byteLabel(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function randomId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function PortfolioUploadClient() {
  const { t } = useI18n();
  const { setProfileCompletion } = useUserProgress();
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<StoredFileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => { setNotes(loadNotes()); setFiles(loadUploads()); }, []);

  const onNotes = (v: string) => {
    setNotes(v);
    saveNotes(v);
    if (v.trim().length > 0) setProfileCompletion(files.length > 0 ? 100 : 95);
  };

  const totalSize = useCallback(
    (list: StoredFileItem[], extra: number) => list.reduce((a, f) => a + f.dataUrl.length, 0) + extra,
    []
  );

  const addFile = (file: File) => {
    if (file.size > MAX_BYTES) {
      setError(t("portfolio.errFileBig", { name: file.name, max: byteLabel(MAX_BYTES) }));
      return;
    }
    setError(null);
    setBusy(true);
    const r = new FileReader();
    r.onerror = () => { setBusy(false); setError(t("portfolio.errRead")); };
    r.onload = () => {
      setBusy(false);
      const dataUrl = typeof r.result === "string" ? r.result : "";
      if (!dataUrl) { setError(t("portfolio.errEmpty")); return; }
      if (dataUrl.length > 2_500_000) { setError(t("portfolio.errStillBig")); return; }
      setFiles((prev) => {
        if (prev.length >= MAX_FILES) { setError(t("portfolio.errMany", { n: MAX_FILES })); return prev; }
        const nextSize = totalSize(prev, dataUrl.length);
        if (nextSize > 4_500_000) { setError(t("portfolio.errQuota")); return prev; }
        const item: StoredFileItem = { id: randomId(), name: file.name, mime: file.type || "application/octet-stream", size: file.size, dataUrl, addedAt: Date.now() };
        const n = [...prev, item];
        saveUploads(n);
        setProfileCompletion(notes.trim().length > 0 ? 100 : 95);
        return n;
      });
    };
    r.readAsDataURL(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    for (const f of Array.from(list)) addFile(f);
    e.target.value = "";
  };

  const remove = (id: string) => {
    setError(null);
    setFiles((prev) => { const n = prev.filter((f) => f.id !== id); saveUploads(n); return n; });
  };

  const clearAll = () => {
    setError(null);
    setFiles([]);
    try { sessionStorage.removeItem(UPLOADS_KEY); } catch { /* */ }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <label className="block text-sm font-bold text-foreground" htmlFor="portfolio-notes">
          {t("portfolio.about")}
        </label>
        <textarea
          id="portfolio-notes"
          className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-[#6C63FF] focus:bg-white focus:outline-none focus:ring-2 focus:shadow-[var(--focus-ring)]"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={4}
          placeholder={t("portfolio.phNotes")}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-bold text-foreground" htmlFor={inputId}>
          {t("portfolio.uploads")}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          onChange={onPick}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="pw-btn-primary w-full disabled:opacity-50 sm:max-w-xs"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("portfolio.load")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {t("portfolio.choose")}
              </span>
            )}
          </button>
          <span className="text-xs text-pathwise-muted">
            {t("portfolio.limits", { b: byteLabel(MAX_BYTES), n: MAX_FILES })}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">{t("portfolio.added")}</h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-semibold text-red-500 underline decoration-red-200 underline-offset-4 transition hover:text-red-100"
            >
              {t("portfolio.removeAll")}
            </button>
          </div>
          <ul className="flex list-none flex-col gap-2.5 p-0" aria-label={t("portfolio.added")}>
            {files.map((f) => {
              const isImage = f.mime.startsWith("image/");
              return (
                <li key={f.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6C63FF]/10 text-pathwise-accent-strong">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">{f.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-pathwise-muted">{byteLabel(f.size)}</span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF6B6B]/30 text-red-500 transition hover:bg-[#FF6B6B]/10"
                        onClick={() => remove(f.id)}
                        aria-label={t("portfolio.removeFile", { n: f.name })}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isImage && (
                    <img src={f.dataUrl} alt="" className="max-h-48 w-full max-w-sm rounded-lg border border-slate-200 object-contain" />
                  )}
                  {!isImage && (
                    <a
                      className="pw-btn-secondary self-start !min-h-[2.25rem] !px-4 !text-sm"
                      href={f.dataUrl}
                      download={f.name}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1.5 h-4 w-4">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {t("portfolio.dl")}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
