"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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
type RankedGrant = { g: GrantRecord; match: "low" | "medium" | "high" };
type LiveGrant = {
  id: string;
  name: string;
  country: string;
  type: "monthly" | "full" | "one-time";
  amount_kzt: number | null;
  amount_usd: number | null;
  amount_label: string | null;
  level: "bachelor" | "master" | "phd" | "any";
  fields: string[];
  eligible: string[];
  gpa_min: number | null;
  language_req: string | null;
  deadline_month: string | null;
  deadline_label: string | null;
  url: string;
  source: string;
  last_updated: string;
};

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

function toGrantRecord(grant: LiveGrant): GrantRecord {
  const type: GrantType = grant.type === "one-time" ? "one_time" : grant.type;
  const amountKzt = grant.amount_kzt ?? (grant.amount_usd ? grant.amount_usd * 450 : null);
  const tags = [
    grant.country.toLowerCase().replace(/\s+/g, "_"),
    grant.level,
    grant.source,
    ...grant.fields,
    ...grant.eligible,
  ].filter(Boolean);

  return {
    id: grant.id,
    name: grant.name,
    type,
    monthlyKzt: grant.type === "monthly" ? amountKzt : null,
    amountUsd: grant.amount_usd,
    amountEur: null,
    amountNarrative: grant.amount_label,
    deadline: grant.deadline_label ?? grant.deadline_month ?? "Check official source",
    url: grant.url,
    eligibilityTags: Array.from(new Set(tags)),
    kazakhstanRelevance: [
      `Official source: ${grant.source}.`,
      grant.country ? `Country: ${grant.country}.` : "",
      grant.level !== "any" ? `Level: ${grant.level}.` : "Level: any.",
      grant.gpa_min ? `Minimum GPA: ${grant.gpa_min}.` : "",
      grant.language_req ? `Language: ${grant.language_req}.` : "",
    ].filter(Boolean).join(" "),
    suggestedMatchBlurb: grant.eligible.length
      ? `Eligibility: ${grant.eligible.map((item) => item.replaceAll("_", " ")).join(", ")}.`
      : "Eligibility details are available on the official source page.",
    coverageContributionKzt: amountKzt ?? 0,
  };
}

function rankLiveGrant(grant: GrantRecord, onboarding: OnboardingAnswers | null): RankedGrant {
  if (!onboarding) return { g: grant, match: "low" };
  const blob = [
    ...onboarding.subjectIds,
    onboarding.freeTime,
    onboarding.achievements,
    onboarding.budgetConstraints,
    onboarding.studyLocation ?? "",
  ].join(" ").toLowerCase();
  const haystack = `${grant.name} ${grant.eligibilityTags.join(" ")} ${grant.kazakhstanRelevance}`.toLowerCase();
  const score = blob.split(/[^a-zа-я0-9]+/).reduce((sum, word) => {
    if (word.length < 3) return sum;
    return haystack.includes(word) ? sum + 1 : sum;
  }, 0);
  return { g: grant, match: score >= 2 ? "high" : score >= 1 ? "medium" : "low" };
}

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
    ? "bg-[#6C63FF] text-white shadow-sm"
    : "border border-slate-200 bg-white text-pathwise-muted hover:border-[#6C63FF]/40 hover:bg-white hover:text-slate-900";

export function GrantsListClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionKey>("all");
  const [type, setType] = useState<GrantType | "all">("all");
  const [matchP, setMatchP] = useState<MatchPill>("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [rows, setRows] = useState<GrantRecord[]>([]);
  const [source, setSource] = useState<"live" | "fallback" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(() => { setOnboarding(readOnboarding()); }, []);

  useEffect(() => {
    const query = searchParams.get("q");
    const match = searchParams.get("match");
    const grantType = searchParams.get("type");

    if (query !== null) setQ(query);
    if (match === "all" || match === "high" || match === "medium" || match === "low") {
      setMatchP(match);
    }
    if (
      grantType === "all" ||
      grantType === "monthly" ||
      grantType === "full" ||
      grantType === "lump" ||
      grantType === "one_time"
    ) {
      setType(grantType);
    }
  }, [searchParams]);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const response = await fetch("/api/v1/grants", { cache: "no-store" });
        const json = (await response.json()) as {
          data?: LiveGrant[];
          source?: "live" | "fallback";
          warning?: string;
        };
        if (!response.ok || !Array.isArray(json.data)) {
          throw new Error(json.warning || "Could not load grants.");
        }
        if (!cancelled) {
          setRows(json.data.map(toGrantRecord));
          setSource(json.source ?? "fallback");
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setSource("fallback");
          setError(err instanceof Error ? err.message : "Could not load grants.");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseRows = useMemo(
    () => rows.map((grant) => rankLiveGrant(grant, onboarding)),
    [onboarding, rows],
  );

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

  useEffect(() => {
    if (searchParams.get("openFirst") !== "1" || sorted.length === 0) return;
    const first = sorted[0]?.g.url;
    if (!first) return;
    const timer = window.setTimeout(() => {
      window.location.assign(first);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [searchParams, sorted]);

  const reset = () => { setQ(""); setRegion("all"); setType("all"); setMatchP("all"); setSort("match"); };

  if (!ready) {
    return <div className="pw-shimmer min-h-[28rem] w-full rounded-3xl bg-white" aria-hidden />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-2">
      {/* Hero */}
      <section
        className="pw-soft-panel relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10"
        aria-labelledby="grants-hero-title"
      >
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="relative z-10">
          <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-slate-700 ">
            {t("grants.kicker")}
          </p>
          <h1 id="grants-hero-title" className="mt-4 text-[2.5rem] font-black leading-none tracking-[-0.04em] md:text-5xl">
            {t("grants.title")}
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm leading-relaxed text-slate-600 md:text-base">
            {t("grants.body")}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t("grants.searchLabel")}</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                className="pw-input w-full py-3 pl-11 pr-4 text-sm"
                placeholder={t("grants.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <p className="shrink-0 text-sm text-slate-500" aria-live="polite">
              {t("grants.found", { n: sorted.length })} · {source === "live" ? "Supabase" : "Vesper fallback"}
            </p>
          </div>
        </div>
        {!onboarding && (
          <div className="relative z-10 mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 ">
            {t("grants.tip")}{" "}
            <a className="font-semibold underline" href="/onboarding">{t("grants.tipOnboard")}</a>{" "}
            {t("grants.tip2")}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar filters */}
        <aside className="lg:col-span-3" aria-label={t("grants.filterAria")}>
          <div className="pw-card sticky top-28 space-y-5 p-4">
            <fieldset>
              <legend className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-pathwise-muted">
                {t("grants.f.rank")}
              </legend>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
                {MATCH_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMatchP(k)}
                    className={`min-h-12 shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${filterPill(matchP === k)} ${!onboarding && k !== "all" ? "opacity-50" : ""}`}
                    title={!onboarding && k !== "all" ? t("grants.f.tipR") : undefined}
                  >
                    {t(matchMsgKey(k))}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-pathwise-muted">
                {t("grants.f.region")}
              </p>
              <div className="relative">
                <select
                  className="pw-input w-full cursor-pointer appearance-none py-2.5 pl-3 pr-9 text-sm"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionKey)}
                >
                  {REGION_KEYS.map((k) => (
                    <option key={k} value={k}>{t(regionMsgKey(k))}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-pathwise-muted">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-pathwise-muted">
                {t("grants.f.type")}
              </legend>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
                {TYPE_KEYS.map((k) => (
                  <button
                    key={String(k)}
                    type="button"
                    onClick={() => setType(k)}
                    className={`min-h-12 shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 ${filterPill(type === k)}`}
                  >
                    {t(typeMsgKey(k))}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-pathwise-accent-strong underline decoration-[#6C63FF]/40 underline-offset-4 transition hover:text-slate-900"
            >
              {t("grants.reset")}
            </button>
          </div>
        </aside>

        {/* Grid */}
        <div className="min-w-0 space-y-4 lg:col-span-9">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-end">
            <p className="text-sm text-pathwise-muted" aria-live="polite">
              {error ? error : t("grants.shown", { a: sorted.length, b: baseRows.length })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <span className="whitespace-nowrap text-sm text-pathwise-muted">{t("grants.sort")}</span>
              <div className="relative">
                <select
                  className="pw-input min-w-[12rem] cursor-pointer appearance-none py-2 pl-3 pr-8 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="match">{t("grants.sortMatch")}</option>
                  <option value="name">{t("grants.sortName")}</option>
                  <option value="deadline">{t("grants.sortDeadline")}</option>
                  <option value="amount">{t("grants.sortKzt")}</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pathwise-muted">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="pw-card p-8 text-center text-sm text-pathwise-muted">
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
  row: RankedGrant;
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
    ? "text-[#6C63FF]"
    : match === "medium"
      ? "text-amber-300"
      : "text-pathwise-muted";

  const pct = hasOnboarding
    ? match === "high" ? 92 : match === "medium" ? 64 : 32
    : 18;
  const stroke = match === "high" ? "#6C63FF" : match === "medium" ? "#FBBF24" : "#A9ABC7";

  return (
    <article className="group pw-card flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-50">
        <Image
          src={`https://picsum.photos/seed/${encodeURIComponent(g.id)}/640/400`}
          alt=""
          width={640}
          height={400}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-white shadow-md ">
          <MatchArc percent={pct} stroke={stroke} />
          <span className={hasOnboarding ? matchColor : "text-pathwise-muted"}>{badge}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="line-clamp-2 text-lg font-semibold leading-tight text-white">
          {g.name}
        </h2>
        <p className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-pathwise-accent-strong">
          <span>{formatGrantAmountLine(g)}</span>
          <span className="rounded-full border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-2 py-0.5 text-red-100">{g.deadline}</span>
        </p>
        <p className="mt-2.5 line-clamp-2 flex-1 text-sm leading-relaxed text-pathwise-muted">
          {g.kazakhstanRelevance}
        </p>
        {g.eligibilityTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("grants.tagsAria")}>
            {g.eligibilityTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-pathwise-muted">
                {tag.replaceAll("_", " ")}
              </span>
            ))}
            {g.eligibilityTags.length > 3 && (
              <span className="text-[11px] text-pathwise-muted">+{g.eligibilityTags.length - 3}</span>
            )}
          </div>
        )}
        <a
          href={g.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pw-btn-primary mt-4 !min-h-[2.75rem] w-full !px-4 !text-sm"
        >
          {t("grants.view")} →
        </a>
      </div>
    </article>
  );
}

function MatchArc({ percent, stroke }: { percent: number; stroke: string }) {
  const radius = 14;
  const length = 2 * Math.PI * radius;
  const offset = length * (1 - percent / 100);
  return (
    <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36" aria-hidden style={{ "--arc-length": length, "--arc-offset": offset } as CSSProperties}>
      <circle cx="18" cy="18" r={radius} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="4" />
      <circle
        className="pw-match-arc"
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth="4"
        strokeDasharray={length}
        strokeDashoffset={offset}
      />
    </svg>
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
