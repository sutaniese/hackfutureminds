"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

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
  try {
    return sessionStorage.getItem(NOTES_KEY) ?? "";
  } catch {
    return "";
  }
}

function loadUploads(): StoredFileItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(UPLOADS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .filter(
        (x) =>
          x &&
          typeof x === "object" &&
          "id" in x &&
          "name" in x &&
          "dataUrl" in x
      ) as StoredFileItem[];
  } catch {
    return [];
  }
}

function saveUploads(list: StoredFileItem[]) {
  try {
    sessionStorage.setItem(UPLOADS_KEY, JSON.stringify(list));
  } catch {
    // quota or private mode
  }
}

function saveNotes(s: string) {
  try {
    sessionStorage.setItem(NOTES_KEY, s);
  } catch {
    /* */
  }
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
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<StoredFileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    setNotes(loadNotes());
    setFiles(loadUploads());
  }, []);

  const onNotes = (v: string) => {
    setNotes(v);
    saveNotes(v);
  };

  const totalSize = useCallback(
    (list: StoredFileItem[], extra: number) =>
      list.reduce((a, f) => a + f.dataUrl.length, 0) + extra,
    []
  );

  const addFile = (file: File) => {
    if (file.size > MAX_BYTES) {
      setError(
        `“${file.name}” is too large for a demo in-browser keep (max ${byteLabel(MAX_BYTES)}). Try a shorter PDF or smaller images.`
      );
      return;
    }
    setError(null);
    setBusy(true);
    const r = new FileReader();
    r.onerror = () => {
      setBusy(false);
      setError("Could not read that file. Try again.");
    };
    r.onload = () => {
      setBusy(false);
      const dataUrl = typeof r.result === "string" ? r.result : "";
      if (!dataUrl) {
        setError("Empty file — pick another one.");
        return;
      }
      if (dataUrl.length > 2_500_000) {
        setError("That file is still too big after reading. Use a smaller export.");
        return;
      }
      setFiles((prev) => {
        if (prev.length >= MAX_FILES) {
          setError(`You can add up to ${MAX_FILES} files. Remove one first.`);
          return prev;
        }
        const nextSize = totalSize(prev, dataUrl.length);
        if (nextSize > 4_500_000) {
          setError("Session storage is almost full. Remove a file or shorten notes.");
          return prev;
        }
        const item: StoredFileItem = {
          id: randomId(),
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          addedAt: Date.now(),
        };
        const n = [...prev, item];
        saveUploads(n);
        return n;
      });
    };
    r.readAsDataURL(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      addFile(f);
    }
    e.target.value = "";
  };

  const remove = (id: string) => {
    setError(null);
    setFiles((prev) => {
      const n = prev.filter((f) => f.id !== id);
      saveUploads(n);
      return n;
    });
  };

  const clearAll = () => {
    setError(null);
    setFiles([]);
    try {
      sessionStorage.removeItem(UPLOADS_KEY);
    } catch {
      /* */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--pw-muted)]">
        Add a short free-text summary and files you already have (CV, project PDFs, certificates, screenshots). Everything stays in this
        tab&apos;s <strong>session</strong> — cleared when the browser session ends, not sent to a server in this demo.
      </p>

      <div className="space-y-2">
        <label
          className="block text-sm font-semibold text-foreground"
          htmlFor="portfolio-notes"
        >
          About your portfolio
        </label>
        <textarea
          id="portfolio-notes"
          className="min-h-32 w-full rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 py-3 text-sm text-foreground"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={4}
          placeholder="Projects, competition wins, volunteering, language levels…"
        />
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-semibold text-foreground"
          htmlFor={inputId}
        >
          Upload files
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="pw-tap min-h-12 w-full min-w-0 rounded-full bg-[var(--pw-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:max-w-xs"
          >
            {busy ? "Loading…" : "Choose files"}
          </button>
          <span className="text-xs text-[var(--pw-muted)]">
            PDF, images, Word. Max {byteLabel(MAX_BYTES)} each, up to {MAX_FILES} files.
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Added files</h2>
            <button
              type="button"
              onClick={clearAll}
              className="min-h-12 min-w-[3rem] rounded-lg px-2 text-sm font-semibold text-[var(--pw-muted)] underline"
            >
              Remove all
            </button>
          </div>
          <ul className="flex list-none flex-col gap-2 p-0" aria-label="Uploaded files">
            {files.map((f) => {
              const isImage = f.mime.startsWith("image/");
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] p-3"
                >
                  <div className="flex min-h-12 items-center justify-between gap-2">
                    <span className="min-w-0 break-words font-medium text-foreground">
                      {f.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-[var(--pw-muted)]">
                        {byteLabel(f.size)}
                      </span>
                      <button
                        type="button"
                        className="pw-tap min-h-12 min-w-12 rounded-full border-2 border-red-200 px-2 text-sm font-bold text-red-800"
                        onClick={() => remove(f.id)}
                        aria-label={`Remove ${f.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {isImage && (
                    <img
                      src={f.dataUrl}
                      alt=""
                      className="max-h-48 w-full max-w-sm rounded-lg border border-[var(--pw-border)] object-contain"
                    />
                  )}
                  {!isImage && (
                    <a
                      className="flex min-h-12 w-fit min-w-12 max-w-full items-center self-start rounded-lg border-2 border-[var(--pw-primary)] px-3 text-sm font-semibold text-[var(--pw-primary)]"
                      href={f.dataUrl}
                      download={f.name}
                    >
                      Download / open copy
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
