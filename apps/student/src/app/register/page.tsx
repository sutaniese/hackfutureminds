import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { TenWordmark } from "@/components/brand/TenWordmark";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте локальный аккаунт teñ. — email, пароль и роль (студент / родитель / учитель).",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8 md:py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="no-underline" aria-label="teñ. — на главную">
          <TenWordmark size="sm" presentational />
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-pathwise-muted no-underline hover:text-pathwise-ink"
        >
          ← На главную
        </Link>
      </header>
      <Suspense
        fallback={
          <section className="pw-soft-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm text-pathwise-muted">Загрузка формы…</p>
          </section>
        }
      >
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
