"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ROLE_ENTRY_PATHS, ROLE_LABELS, roleForPath, type UserRole } from "@/lib/site-nav";
import {
  AuthFailure,
  isStrongEnoughPassword,
  isValidEmail,
  type DisabilityDocumentEvaluation,
  type DisabilityDocumentMeta,
  type DisabilitySupportType,
} from "@/lib/auth";
import { upsertStudentProfileSnapshot } from "@/lib/student-profile-store";
import { readSessionOnboarding, studentContinuePath } from "@/lib/student-progress";
import { useAuth } from "@/components/shell/useAuth";

type Mode = "login" | "register";

const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; description: string }> = [
  { value: "student", description: "Анкета, план, гранты, портфолио." },
  { value: "parent", description: "Кабинет родителя: бюджет, отчёт, профессии." },
  { value: "teacher", description: "Класс, инвайт-коды, рекомендательные письма." },
];

const SUPPORT_OPTIONS: ReadonlyArray<{
  value: DisabilitySupportType;
  label: string;
}> = [
  { value: "visual", label: "Зрение" },
  { value: "hearing", label: "Слух" },
  { value: "mobility", label: "Передвижение" },
  { value: "learning", label: "Обучение / дислексия" },
  { value: "neurodivergent", label: "Нейроотличия" },
  { value: "chronic", label: "Хроническое состояние" },
  { value: "speech", label: "Речь / коммуникация" },
  { value: "mental-health", label: "Психологическая поддержка" },
  { value: "other", label: "Другое" },
];

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать документ."));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Документ пустой или повреждён."));
    };
    reader.readAsDataURL(file);
  });
}

function safeRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  // Only allow same-origin paths.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function authErrorMessage(err: unknown): string {
  if (err instanceof AuthFailure) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const redirect = useMemo(
    () => safeRedirect(searchParams?.get("redirect")),
    [searchParams],
  );
  const initialRole = useMemo(
    () => (redirect ? roleForPath(redirect) : null) ?? "student",
    [redirect],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [hasSupportNeeds, setHasSupportNeeds] = useState(false);
  const [supportTypes, setSupportTypes] = useState<DisabilitySupportType[]>([]);
  const [supportNotes, setSupportNotes] = useState("");
  const [supportDocument, setSupportDocument] =
    useState<DisabilityDocumentMeta | null>(null);
  const [documentEvaluating, setDocumentEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  useEffect(() => {
    if (!isLogin) setRole(initialRole);
  }, [initialRole, isLogin]);

  function toggleSupportType(value: DisabilitySupportType) {
    setSupportTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function evaluateSupportDocument(
    file: File,
    meta: DisabilityDocumentMeta,
  ): Promise<DisabilityDocumentEvaluation | undefined> {
    const dataUrl = file.type.startsWith("image/") ? await readFileAsDataUrl(file) : undefined;
    const response = await fetch("/api/evaluate-disability-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supportTypes,
        notes: supportNotes,
        document: {
          ...meta,
          dataUrl,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { evaluation?: DisabilityDocumentEvaluation; error?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "AI не смог оценить документ.");
    }
    return payload?.evaluation;
  }

  async function handleSupportDocument(file: File | undefined) {
    if (!file) {
      setSupportDocument(null);
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("Документ должен быть меньше 5 MB.");
      setSupportDocument(null);
      return;
    }

    setError(null);
    const meta: DisabilityDocumentMeta = {
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      uploadedAt: Date.now(),
    };
    setSupportDocument(meta);
    setDocumentEvaluating(true);

    try {
      const evaluation = await evaluateSupportDocument(file, meta);
      setSupportDocument({
        ...meta,
        evaluation,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI не смог оценить документ.");
      setSupportDocument({
        ...meta,
        evaluation: {
          status: "needs_human_review",
          documentType: meta.type,
          summary: "Автоматическая оценка не удалась. Документ нужно проверить вручную.",
          confidence: 0,
          detectedSupportTypes: supportTypes,
          recommendedAccommodations: [
            "Проверить документ вручную перед финальным решением.",
          ],
          caveats: ["AI evaluation failed."],
          evaluatedAt: Date.now(),
        },
      });
    } finally {
      setDocumentEvaluating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Введите корректный email.");
      return;
    }
    if (!isStrongEnoughPassword(password)) {
      setError("Пароль должен содержать не меньше 6 символов.");
      return;
    }
    if (!isLogin && role === "student" && hasSupportNeeds && supportTypes.length === 0) {
      setError("Выберите хотя бы один тип поддержки или отметьте, что поддержка не нужна.");
      return;
    }

    setSubmitting(true);
    try {
      const user = isLogin
        ? await login({ email, password })
        : await register({
            email,
            password,
            role,
            name,
            accessibilitySupport:
              role === "student" && hasSupportNeeds
                ? {
                    enabled: true,
                    supportTypes,
                    notes: supportNotes,
                    document: supportDocument ?? undefined,
                  }
                : undefined,
          });

      if (user.role === "student") {
        if (!isLogin) {
          const guestAnswers = readSessionOnboarding();
          upsertStudentProfileSnapshot(user, {
            accessibilitySupport: user.accessibilitySupport,
            ...(guestAnswers ? { onboarding: guestAnswers } : {}),
          });
        }
      }

      const roleHome = user.role === "student" ? studentContinuePath() : ROLE_ENTRY_PATHS[user.role];
      const redirectIsGeneric = !redirect || redirect === "/";
      const redirectWrongRole =
        Boolean(redirect) &&
        user.role !== "student" &&
        roleForPath(redirect ?? "") === "student";
      const target =
        !isLogin && user.role === "student" && user.accessibilitySupport?.enabled
          ? "/support"
          : redirectIsGeneric || redirectWrongRole
            ? roleHome
            : (redirect ?? roleHome);
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="pw-soft-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-pathwise-accent/10 " />
      <div className="relative">
        <p className="inline-flex rounded-full bg-white px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong ring-1 ring-pathwise-line/70">
          {isLogin ? "Вход" : "Регистрация"}
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-pathwise-ink md:text-4xl">
          {isLogin ? "С возвращением" : "Создаём аккаунт"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-pathwise-muted">
          {isLogin
            ? "Войдите, чтобы открыть страницы вашей роли. Аккаунт хранится локально в браузере."
            : "Заведите локальный аккаунт. Роль выбирается один раз и заменяет текущий выбор на главной."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {!isLogin ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                Имя (необязательно)
              </span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-2xl border border-pathwise-line bg-white/85 px-4 py-3 text-sm text-pathwise-ink shadow-sm outline-none transition focus:border-pathwise-accent focus:ring-2 focus:ring-pathwise-accent/30"
                placeholder="Например, Айгерим"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-pathwise-line bg-white/85 px-4 py-3 text-sm text-pathwise-ink shadow-sm outline-none transition focus:border-pathwise-accent focus:ring-2 focus:ring-pathwise-accent/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
              Пароль
            </span>
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-pathwise-line bg-white/85 px-4 py-3 text-sm text-pathwise-ink shadow-sm outline-none transition focus:border-pathwise-accent focus:ring-2 focus:ring-pathwise-accent/30"
              placeholder="Минимум 6 символов"
            />
            {!isLogin ? (
              <span className="mt-1.5 block text-xs text-pathwise-muted">
                Пароль хранится локально, как PBKDF2-хеш с солью.
              </span>
            ) : null}
          </label>

          {!isLogin ? (
            <fieldset className="rounded-2xl border border-pathwise-line bg-white p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                Роль
              </legend>
              <p className="px-1 pb-3 text-xs text-pathwise-muted">
                Выберите, как вы будете пользоваться платформой. Роль заменит текущий выбор на главной.
              </p>
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((opt) => {
                  const active = role === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        active
                          ? "border-pathwise-accent bg-pathwise-accent-soft/70"
                          : "border-pathwise-line bg-white hover:border-pathwise-accent/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={active}
                        onChange={() => setRole(opt.value)}
                        className="mt-1 h-4 w-4 accent-pathwise-accent"
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-bold text-pathwise-ink">
                          {ROLE_LABELS[opt.value]}
                        </span>
                        <span className="mt-0.5 text-xs text-pathwise-muted">
                          {opt.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {!isLogin && role === "student" ? (
            <fieldset className="rounded-2xl border border-pathwise-line bg-white p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                Индивидуальная поддержка
              </legend>
              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-pathwise-line bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={hasSupportNeeds}
                  onChange={(event) => setHasSupportNeeds(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-pathwise-accent"
                />
                <span>
                  <span className="block text-sm font-bold text-pathwise-ink">
                    У меня есть инвалидность или особые образовательные потребности
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-pathwise-muted">
                    Можно выбрать тип поддержки и приложить подтверждающий документ:
                    справку, заключение, ИПРА, школьную записку или другой файл.
                  </span>
                </span>
              </label>

              {hasSupportNeeds ? (
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                      Что нужно учитывать?
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {SUPPORT_OPTIONS.map((option) => {
                        const active = supportTypes.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleSupportType(option.value)}
                            aria-pressed={active}
                            className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                              active
                                ? "border-pathwise-accent bg-pathwise-accent-soft text-pathwise-accent-strong"
                                : "border-pathwise-line bg-white text-pathwise-ink hover:border-pathwise-accent/60"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                      Подтверждающий документ
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(event) => handleSupportDocument(event.target.files?.[0])}
                      className="mt-1.5 block w-full rounded-2xl border border-pathwise-line bg-white px-4 py-3 text-sm text-pathwise-ink shadow-sm file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-pathwise-ink"
                    />
                    <span className="mt-1.5 block text-xs text-pathwise-muted">
                      Изображения анализируются через AI. PDF/DOCX сохраняются как
                      метаданные и помечаются для ручной проверки.
                    </span>
                    {documentEvaluating ? (
                      <span className="mt-2 block rounded-2xl bg-[#f1efff] px-3 py-2 text-xs font-bold text-[#554dd6]">
                        AI оценивает документ…
                      </span>
                    ) : null}
                    {supportDocument ? (
                      <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                        <p className="font-bold text-slate-700">{supportDocument.name}</p>
                        {supportDocument.evaluation ? (
                          <div className="mt-2 space-y-1 text-slate-600">
                            <p>
                              <span className="font-bold">AI статус:</span>{" "}
                              {supportDocument.evaluation.status === "reviewed"
                                ? "оценено"
                                : "нужна ручная проверка"}
                            </p>
                            <p>{supportDocument.evaluation.summary}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                      Комментарий для персональной страницы
                    </span>
                    <textarea
                      value={supportNotes}
                      onChange={(event) => setSupportNotes(event.target.value)}
                      rows={3}
                      className="mt-1.5 block w-full resize-none rounded-2xl border border-pathwise-line bg-white px-4 py-3 text-sm text-pathwise-ink shadow-sm outline-none transition focus:border-pathwise-accent focus:ring-2 focus:ring-pathwise-accent/30"
                      placeholder="Например: нужны материалы крупным шрифтом, больше времени на тесты, онлайн-консультации."
                    />
                  </label>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || documentEvaluating}
            className="pw-primary-btn pw-focus mt-1 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {documentEvaluating
              ? "Оцениваем документ…"
              : submitting
              ? isLogin
                ? "Входим…"
                : "Создаём…"
              : isLogin
                ? "Войти"
                : "Создать аккаунт"}
          </button>

          <p className="text-center text-xs text-pathwise-muted">
            {isLogin ? (
              <>
                Нет аккаунта?{" "}
                <Link
                  href={
                    redirect
                      ? `/register?redirect=${encodeURIComponent(redirect)}`
                      : "/register"
                  }
                  className="font-bold text-pathwise-accent-strong"
                >
                  Зарегистрироваться
                </Link>
              </>
            ) : (
              <>
                Уже зарегистрированы?{" "}
                <Link
                  href={
                    redirect
                      ? `/login?redirect=${encodeURIComponent(redirect)}`
                      : "/login"
                  }
                  className="font-bold text-pathwise-accent-strong"
                >
                  Войти
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </section>
  );
}
