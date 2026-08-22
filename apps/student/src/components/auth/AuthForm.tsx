"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ROLE_ENTRY_PATHS, ROLE_LABELS, type UserRole } from "@/lib/site-nav";
import { AuthFailure, isStrongEnoughPassword, isValidEmail } from "@/lib/auth";
import { useAuth } from "@/components/shell/useAuth";

type Mode = "login" | "register";

const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; description: string }> = [
  { value: "student", description: "Анкета, план, гранты, портфолио." },
  { value: "parent", description: "Кабинет родителя: бюджет, отчёт, профессии." },
  { value: "teacher", description: "Класс, инвайт-коды, рекомендательные письма." },
];

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

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

    setSubmitting(true);
    try {
      const user = isLogin
        ? await login({ email, password })
        : await register({ email, password, role, name });

      const target = redirect ?? ROLE_ENTRY_PATHS[user.role];
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
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-pathwise-accent/10 blur-3xl" />
      <div className="relative">
        <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong ring-1 ring-pathwise-line/70">
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
            <fieldset className="rounded-2xl border border-pathwise-line bg-white/70 p-4">
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
                          : "border-pathwise-line bg-white/80 hover:border-pathwise-accent/60"
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

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="pw-primary-btn pw-focus mt-1 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
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
