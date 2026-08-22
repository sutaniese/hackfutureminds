"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_EVENT, getCurrentUser, getPublicUserByEmail, isValidEmail } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { ONBOARDING_SUBJECT_OPTIONS } from "@/lib/onboarding-constants";
import { emailToProfileSlug, profileSlugToEmail } from "@/lib/profile-slug";
import { readStudentProfiles } from "@/lib/student-profile-store";
import type { UserRole } from "@/lib/site-nav";

function subjectLabels(ids: string[]): string {
  return ids
    .map((id) => ONBOARDING_SUBJECT_OPTIONS.find((x) => x.id === id)?.label ?? id)
    .join(", ");
}

function studyLocationLabel(
  t: (k: string) => string,
  loc: "kazakhstan" | "abroad" | null,
): string {
  if (loc === "abroad") return t("profile.locAbroad");
  if (loc === "kazakhstan") return t("profile.locKz");
  return "—";
}

export function ProfilePageClient({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [authEpoch, setAuthEpoch] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onAuth = () => setAuthEpoch((e) => e + 1);
    window.addEventListener(AUTH_EVENT, onAuth as EventListener);
    return () => window.removeEventListener(AUTH_EVENT, onAuth as EventListener);
  }, []);

  const resolved = useMemo(() => {
    const email = profileSlugToEmail(slug);
    if (!email || !isValidEmail(email)) {
      return { kind: "bad_slug" as const };
    }
    const account = getPublicUserByEmail(email);
    if (!account) {
      return { kind: "missing" as const, email };
    }
    const snapshot = readStudentProfiles()[email] ?? null;
    return { kind: "ok" as const, email, account, snapshot };
  }, [slug, authEpoch]);

  const profilePath = useMemo(() => {
    if (resolved.kind !== "ok") return "";
    return `/profile/${emailToProfileSlug(resolved.email)}`;
  }, [resolved]);

  const displayUrl =
    mounted && profilePath && typeof window !== "undefined"
      ? `${window.location.origin}${profilePath}`
      : profilePath;

  const copyUrl = useCallback(async () => {
    if (!profilePath || typeof window === "undefined") return;
    const full = `${window.location.origin}${profilePath}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  }, [profilePath]);

  const current = getCurrentUser();
  const isSelf = resolved.kind === "ok" && current?.email === resolved.email;

  if (resolved.kind === "bad_slug") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-pathwise-ink">{t("profile.badSlug")}</h1>
        <p className="text-sm leading-relaxed text-pathwise-muted">{t("profile.badSlugHint")}</p>
        <Link href="/" className="pw-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
          {t("profile.home")}
        </Link>
      </div>
    );
  }

  if (resolved.kind === "missing") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-pathwise-ink">{t("profile.notFound")}</h1>
        <p className="text-sm leading-relaxed text-pathwise-muted">{t("profile.notFoundHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/register" className="pw-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
            {t("profile.register")}
          </Link>
          <Link href="/" className="pw-secondary-btn inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
            {t("profile.home")}
          </Link>
        </div>
      </div>
    );
  }

  const { account, snapshot } = resolved;
  const role = account.role as UserRole;
  const roleLabel = t(`home.entry.${role}.badge` as "home.entry.student.badge");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pathwise-accent-strong">{t("profile.kicker")}</p>
        <h1 className="text-3xl font-black tracking-tight text-pathwise-ink">{t("profile.title")}</h1>
        {isSelf ? (
          <p className="inline-flex rounded-full bg-[#6C63FF]/15 px-3 py-1 text-xs font-bold text-[#554dd6]" role="status">
            {t("profile.isSelf")}
          </p>
        ) : null}
      </header>

      <section className="pw-card space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-black text-pathwise-ink">{account.name?.trim() || account.email}</p>
          <p className="text-sm text-pathwise-muted">{account.email}</p>
          <p className="text-sm text-pathwise-muted">
            <span className="font-semibold text-pathwise-ink">{t("profile.role")}</span> {roleLabel}
          </p>
          <p className="text-sm text-pathwise-muted">
            <span className="font-semibold text-pathwise-ink">{t("profile.since")}</span>{" "}
            {new Date(account.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">{t("profile.urlLabel")}</p>
          <p className="mt-2 break-all font-mono text-xs text-pathwise-ink">{displayUrl}</p>
          <p className="mt-2 text-xs leading-5 text-pathwise-muted">{t("profile.urlHint")}</p>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-pathwise-ink transition hover:border-[#6C63FF]/40"
          >
            {copyState === "copied" ? t("profile.copied") : t("profile.copyUrl")}
          </button>
        </div>

        <p className="text-xs leading-5 text-pathwise-muted">{t("profile.localOnly")}</p>
      </section>

      {snapshot?.onboarding ? (
        <section className="pw-card space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="profile-onboard">
          <h2 id="profile-onboard" className="text-lg font-black text-pathwise-ink">
            {t("profile.onboarding")}
          </h2>
          <ul className="space-y-2 text-sm text-pathwise-muted">
            <li>
              <span className="font-semibold text-pathwise-ink">{t("profile.subjects")}</span>{" "}
              {snapshot.onboarding.subjectIds.length
                ? subjectLabels(snapshot.onboarding.subjectIds)
                : "—"}
            </li>
            <li>
              <span className="font-semibold text-pathwise-ink">{t("profile.city")}</span>{" "}
              {snapshot.onboarding.city?.trim() || "—"}
            </li>
            <li>
              <span className="font-semibold text-pathwise-ink">{t("profile.studyLoc")}</span>{" "}
              {studyLocationLabel(t, snapshot.onboarding.studyLocation)}
            </li>
          </ul>
        </section>
      ) : (
        <p className="text-sm text-pathwise-muted">{t("profile.noSnapshot")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {role === "student" ? (
          <>
            <Link href="/results" className="pw-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
              {t("profile.toResults")}
            </Link>
            <Link href="/onboarding" className="pw-secondary-btn inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
              {t("profile.toOnboarding")}
            </Link>
          </>
        ) : (
          <Link href="/" className="pw-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline">
            {t("profile.home")}
          </Link>
        )}
      </div>
    </div>
  );
}
