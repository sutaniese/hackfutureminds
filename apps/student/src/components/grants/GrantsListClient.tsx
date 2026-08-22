"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRankedGrantsForOnboarding } from "@/lib/generate/deterministic";
import { formatGrantAmountLine } from "@/lib/format-grant";
import { useI18n } from "@/i18n/I18nProvider";
import type { GrantRecord, GrantType } from "@/types/grants";
import type { OnboardingAnswers } from "@/types/onboarding";

const ONBOARDING_KEY = "pathwise-onboarding-answers";

function readOnboarding(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as OnboardingAnswers;
  } catch {
    return null;
  }
}

type RegionKey = "all" | "kz" | "eu" | "asia" | "americas" | "uk" | "other";
type MatchPill = "all" | "high" | "medium" | "low";
type SortKey = "match" | "name" | "deadline" | "amount";

function grantRegion(g: GrantRecord): RegionKey {
  const tagList = g.eligibilityTags.map((s) => s.toLowerCase());
  const tj = tagList.join(" ");
  if (g.id === "bolashak" || g.id === "nao_kz" || g.id.startsWith("nu_")) return "kz";
  if (tj.includes("uk") || /chevening|commonwealth|britain/.test(tj)) return "uk";
  if (tj.includes("usa") || /fulbright|u\.s|america/.test(tj)) return "americas";
  if (tj.includes("korea") || tj.includes("japan") || tj.includes("china") || tj.includes("csc")) return "asia";
  if (tj.includes("europe") || tj.includes("germany") || tj.includes("france") || tj.includes("sweden") || tj.includes("hungaricum") || tj.includes("erasmus") || tj.includes("daad")) return "eu";
  if (tj.includes("turkey") || tj.includes("turk")) return "other";
  return "other";
}

const REGION_KEYS: RegionKey[] = ["all", "kz", "eu", "uk", "americas", "asia", "other"];

function regionMsgKey(k: RegionKey) {
  const m: Record<RegionKey, "grants.r.all" | "grants.r.kz" | "grants.r.eu" | "grants.r.uk" | "grants.r.am" | "grants.r.asia" | "grants.r.oth"> = {
    all: "grants.r.all", kz: "grants.r.kz", eu: "grants.r.eu", uk: "grants.r.uk",
    americas: "grants.r.am", asia: "grants.r.asia", other: "grants.r.oth",
  };
  return m[k];
}

const TYPE_KEYS: (GrantType | "all")[] = ["all", "monthly", "full", "lump", "one_time"];

function typeMsgKey(t: GrantType | "all") {
  if (t === "all") return "grants.typeAll";
  if (t === "monthly") return "grants.type.monthly";
  if (t === "full") return "grants.type.full";
  if (t === "lump") return "grants.type.lump";
  return "grants.type.onetime";
}

const MATCH_KEYS: MatchPill[] = ["all", "high", "medium", "low"];

function matchMsgKey(m: MatchPill) {
  if (m === "all") return "grants.f.mAll";
  if (m === "high") return "grants.f.strong";
  if (m === "medium") return "grants.f.mid";
  return "grants.f.light";
}

function monthOrder(deadline: string): number {
  const s = deadline.toLowerCase();
  const months: [string, number][] = [
    ["january", 1], ["february", 2], ["march", 3], ["april", 4],
    ["may", 5], ["june", 6], ["july", 7], ["august", 8],
    ["september", 9], ["october", 10], ["november", 11], ["december", 12],
  ];
  for (const [m, n] of months) {
    if (s.includes(m) || s.includes(m.slice(0, 3))) return n;
  }
  if (/varies|rolling|открыт|ожижда|embassy/i.test(s)) return 0;
  return 6;
}

const filterPill = (on: boolean) =>
  on
    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20"
    : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200";

export function GrantsListClient() {
  const { t } = useI18n();
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionKey>("all");
  const [type, setType] = useState<GrantType | "all">("all");
  const [matchP, setMatchP] = useState<MatchPill>("all");
  const [sort, setSort] = useState<SortKey>("match");

  const sync = useCallback(() => { setOnboarding(readOnboarding()); }, []);

  useEffect(() => {
    sync();
    setReady(true);
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sync]);

  const baseRows = useMemo(() => getRankedGrantsForOnboarding(onboarding), [onboarding]);

  const filtered = useMemo(() => {
    let r = baseRows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter(({ g }) =>
        g.name.toLowerCase().includes(s) ||
        g.kazakhstanRelevance.toLowerCase().includes(s) ||
        g.suggestedMatchBlurb.toLowerCase().includes(s) ||
        g.eligibilityTags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    if (region !== "all") r = r.filter(({ g }) => grantRegion(g) === region);
    if (type !== "all") r = r.filter(({ g }) => g.type === type);
    if (onboarding && matchP !== "all") r = r.filter((row) => row.match === matchP);
    return r;
  }, [baseRows, q, region, type, matchP, onboarding]);

  const sorted = useMemo(() => {
    const a = [...filtered];
    if (sort === "name") a.sort((x, y) => x.g.name.localeCompare(y.g.name, "en"));
    else if (sort === "deadline") a.sort((x, y) => monthOrder(x.g.deadline) - monthOrder(y.g.deadline));
    else if (sort === "amount") a.sort((x, y) => (y.g.coverageContributionKzt ?? 0) - (x.g.coverageContributionKzt ?? 0));
    return a;
  }, [filtered, sort]);

  const reset = () => { setQ(""); setRegion("all"); setType("all"); setMatchP("all"); setSort("match"); };

  if (!ready) {
    return <div className="min-h-[28rem] w-full animate-pulse rounded-3xl bg-slate-100" aria-hidden />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-2">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-6 text-white shadow-xl shadow-indigo-500/15 md:p-10"
        aria-labelledby="grants-hero-title"
      >
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="relative z-10">
          <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
            {t("grants.kicker")}
          </p>
          <h1 id="grants-hero-title" className="mt-4 text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {t("grants.title")}
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm leading-relaxed text-white/80 md:text-base">
            {t("grants.body")}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t("grants.searchLabel")}</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-11 pr-4 text-sm text-white shadow-sm backdrop-blur-sm placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus:outline-none"
                placeholder={t("grants.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <p className="shrink-0 text-sm text-white/70" aria-live="polite">
              {t("grants.found", { n: sorted.length })}
            </p>
          </div>
        </div>
        {!onboarding && (
          <div className="relative z-10 mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white/90 backdrop-blur-sm">
            {t("grants.tip")}{" "}
            <a className="font-semibold underline" href="/onboarding">{t("grants.tipOnboard")}</a>{" "}
            {t("grants.tip2")}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar filters */}
        <aside className="lg:col-span-3" aria-label={t("grants.filterAria")}>
          <div className="sticky top-28 space-y-5">
            <fieldset>
              <legend className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-400">
                {t("grants.f.rank")}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {MATCH_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMatchP(k)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${filterPill(matchP === k)} ${!onboarding && k !== "all" ? "opacity-50" : ""}`}
                    title={!onboarding && k !== "all" ? t("grants.f.tipR") : undefined}
                  >
                    {t(matchMsgKey(k))}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-400">
                {t("grants.f.region")}
              </p>
              <div className="relative">
                <select
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-foreground shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionKey)}
                >
                  {REGION_KEYS.map((k) => (
                    <option key={k} value={k}>{t(regionMsgKey(k))}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-400">
                {t("grants.f.type")}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={String(k)}
                    type="button"
                    onClick={() => setType(k)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${filterPill(type === k)}`}
                  >
                    {t(typeMsgKey(k))}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-indigo-500 underline decoration-indigo-200 underline-offset-4 transition hover:text-indigo-700"
            >
              {t("grants.reset")}
            </button>
          </div>
        </aside>

        {/* Grid */}
        <div className="min-w-0 space-y-4 lg:col-span-9">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-end">
            <p className="text-sm text-slate-500" aria-live="polite">
              {t("grants.shown", { a: sorted.length, b: baseRows.length })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <span className="whitespace-nowrap text-sm text-slate-400">{t("grants.sort")}</span>
              <div className="relative">
                <select
                  className="min-w-[12rem] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="match">{t("grants.sortMatch")}</option>
                  <option value="name">{t("grants.sortName")}</option>
                  <option value="deadline">{t("grants.sortDeadline")}</option>
                  <option value="amount">{t("grants.sortKzt")}</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="pw-card p-8 text-center text-sm text-slate-400">
              {t("grants.empty")}
            </p>
          ) : (
            <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((row, idx) => (
                <li key={row.g.id} className="h-full pw-slide-up" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}>
                  <CatalogGrantCard index={idx} row={row} hasOnboarding={!!onboarding} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogGrantCard({
  row,
  index,
  hasOnboarding,
}: {
  row: { g: GrantRecord; match: "low" | "medium" | "high" };
  index: number;
  hasOnboarding: boolean;
}) {
  const { t } = useI18n();
  const { g, match } = row;
  const badge = !hasOnboarding
    ? t("grants.badge0")
    : index < 3 && hasOnboarding
      ? t("grants.badgeIndex", { n: index + 1 })
      : match === "high"
        ? t("grants.badge2")
        : match === "medium"
          ? t("grants.badge3")
          : t("grants.badge4");

  const matchColor = match === "high"
    ? "from-emerald-400 to-emerald-500 text-white"
    : match === "medium"
      ? "from-amber-400 to-orange-400 text-white"
      : "from-slate-300 to-slate-400 text-white";

  return (
    <article className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/8 hover:-translate-y-1">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
        <Image
          src={`https://picsum.photos/seed/${encodeURIComponent(g.id)}/640/400`}
          alt=""
          width={640}
          height={400}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className={`absolute left-3 top-3 rounded-lg bg-gradient-to-r ${hasOnboarding ? matchColor : "from-slate-400 to-slate-500 text-white"} px-2.5 py-1 text-[11px] font-bold shadow-md`}>
          {badge}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="line-clamp-2 text-base font-bold leading-tight text-slate-900">
          {g.name}
        </h2>
        <p className="mt-1 text-xs font-medium text-indigo-500">
          {formatGrantAmountLine(g)} · {g.deadline}
        </p>
        <p className="mt-2.5 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500">
          {g.kazakhstanRelevance}
        </p>
        {g.eligibilityTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("grants.tagsAria")}>
            {g.eligibilityTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                {tag.replaceAll("_", " ")}
              </span>
            ))}
            {g.eligibilityTags.length > 3 && (
              <span className="text-[11px] text-slate-400">+{g.eligibilityTags.length - 3}</span>
            )}
          </div>
        )}
        <a
          href={g.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pw-btn-primary mt-4 !min-h-[2.75rem] w-full !px-4 !text-sm"
        >
          {t("grants.view")}
        </a>
      </div>
    </article>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M5.2 7.2a.75.75 0 0 1 1.06.02L10 11l3.7-3.7a.75.75 0 1 1 1.08 1.04l-4.2 4.2a.75.75 0 0 1-1.08 0L5.2 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}
