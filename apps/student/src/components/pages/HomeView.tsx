"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABELS,
  type UserRole,
} from "@/lib/site-nav";
import { useSelectedRole } from "@/components/shell/useSelectedRole";
import { useAuth } from "@/components/shell/useAuth";

type EntryCard = {
  role: UserRole;
  label: string;
  title: string;
  body: string;
  badge: string;
};

const ENTRY_CARDS: ReadonlyArray<EntryCard> = [
  {
    role: "student",
    label: "Вход для студента",
    title: "Начать свой карьерный путь",
    body: "Пройти анкету, получить план, гранты и собрать портфолио.",
    badge: "Студент",
  },
  {
    role: "parent",
    label: "Вход для родителя",
    title: "Открыть семейный кабинет",
    body: "Посмотреть профиль ребёнка, бюджет, сравнение профессий и PDF-отчёт.",
    badge: "Родитель",
  },
  {
    role: "teacher",
    label: "Вход для учителя",
    title: "Перейти к классу",
    body: "Управлять учениками, инвайт-кодами, рекомендациями и выгрузками.",
    badge: "Учитель",
  },
];

export function HomeView() {
  const { t } = useI18n();
  const router = useRouter();
  const { setRole } = useSelectedRole();
  const { user, status, logout } = useAuth();
  const isAuthed = status === "authed" && Boolean(user);

  function handleEntryClick(card: EntryCard) {
    if (isAuthed && user) {
      setRole(card.role);
      router.push(ROLE_ENTRY_PATHS[card.role]);
      return;
    }
    router.push(
      `/register?redirect=${encodeURIComponent(ROLE_ENTRY_PATHS[card.role])}`,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker={t("home.kicker")}
        title={t("home.title")}
        description={t("home.body")}
        aria-label="home"
      >
        {!isAuthed ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/register" className="pw-primary-btn pw-focus px-5 text-sm">
              Создать аккаунт
            </Link>
            <Link href="/login" className="pw-secondary-btn pw-focus px-5 text-sm">
              У меня уже есть аккаунт
            </Link>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-pathwise-ink ring-1 ring-pathwise-line">
              Вы вошли как{" "}
              <span className="ml-1 text-pathwise-accent-strong">
                {user?.name?.trim() || user?.email}
              </span>
            </span>
            <span className="inline-flex items-center rounded-full bg-pathwise-accent-soft px-3 py-1 text-xs font-bold text-pathwise-accent-strong">
              Роль: {user ? ROLE_LABELS[user.role] : ""}
            </span>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ENTRY_CARDS.map((entry) => {
            const isCurrent = isAuthed && user?.role === entry.role;
            return (
              <button
                key={entry.role}
                type="button"
                onClick={() => handleEntryClick(entry)}
                className={`group rounded-2xl border bg-white/75 p-4 text-left no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-white ${
                  isCurrent
                    ? "border-pathwise-accent ring-2 ring-pathwise-accent/30"
                    : "border-pathwise-line/80 hover:border-pathwise-accent"
                }`}
                aria-label={entry.label}
                aria-current={isCurrent ? "true" : undefined}
              >
                <span className="inline-flex rounded-full bg-pathwise-accent-soft px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-pathwise-accent-strong">
                  {entry.badge}
                </span>
                <h2 className="mt-3 text-base font-black leading-tight text-pathwise-ink">
                  {entry.title}
                </h2>
                <p className="mt-2 text-xs leading-5 text-pathwise-muted">
                  {entry.body}
                </p>
                <span className="mt-4 inline-flex text-xs font-bold text-pathwise-accent-strong">
                  {isAuthed
                    ? isCurrent
                      ? "Открыть кабинет →"
                      : "Сменить роль →"
                    : "Создать аккаунт →"}
                </span>
              </button>
            );
          })}
        </div>
      </PageHero>

      <ContentCard className="bg-gradient-to-r from-pathwise-accent-soft via-pathwise-surface to-pathwise-surface">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-foreground">
            {isAuthed
              ? "Карточка с галочкой — ваша текущая роль. Нажмите на другую, чтобы переключиться: мы автоматически обновим аккаунт и навигацию."
              : "Сначала создайте аккаунт. На регистрации мы спросим роль и сразу применим её — это заменит текущий выбор на главной."}
          </p>
          {isAuthed ? (
            <button
              type="button"
              onClick={logout}
              className="pw-secondary-btn pw-focus shrink-0 px-4 text-sm"
            >
              Выйти из аккаунта
            </button>
          ) : (
            <Link href="/register" className="pw-primary-btn pw-focus shrink-0 px-4 text-sm">
              Зарегистрироваться →
            </Link>
          )}
        </div>
      </ContentCard>
    </div>
  );
}
