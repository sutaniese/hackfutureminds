"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRankedGrantsForOnboarding } from "@/lib/generate/deterministic";
import { formatGrantAmountLine } from "@/lib/format-grant";
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
  const t = g.eligibilityTags.map((s) => s.toLowerCase());
  const tj = t.join(" ");
  if (
    g.id === "bolashak" ||
    g.id === "nao_kz" ||
    g.id.startsWith("nu_")
  ) {
    return "kz";
  }
  if (tj.includes("uk") || /chevening|commonwealth|britain/.test(tj)) return "uk";
  if (tj.includes("usa") || /fulbright|u\.s|america/.test(tj)) return "americas";
  if (
    tj.includes("korea") ||
    tj.includes("japan") ||
    tj.includes("china") ||
    tj.includes("csc")
  ) {
    return "asia";
  }
  if (
    tj.includes("europe") ||
    tj.includes("germany") ||
    tj.includes("france") ||
    tj.includes("sweden") ||
    tj.includes("hungaricum") ||
    tj.includes("erasmus") ||
    tj.includes("daad")
  ) {
    return "eu";
  }
  if (tj.includes("turkey") || tj.includes("turk")) return "other";
  return "other";
}

const REGION_OPTIONS: { key: RegionKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "kz", label: "Казахстан" },
  { key: "eu", label: "Европа" },
  { key: "uk", label: "Великобритания" },
  { key: "americas", label: "США" },
  { key: "asia", label: "Азия" },
  { key: "other", label: "Другое" },
];

const TYPE_PILLS: { key: GrantType | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "monthly", label: "Ежемесячно" },
  { key: "full", label: "Полный или частичный" },
  { key: "lump", label: "Единовр." },
  { key: "one_time", label: "Однокр." },
];

const MATCH_PILLS: { key: MatchPill; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "high", label: "Сильное" },
  { key: "medium", label: "Средне" },
  { key: "low", label: "Мягко" },
];

function monthOrder(deadline: string): number {
  const s = deadline.toLowerCase();
  const months: [string, number][] = [
    ["january", 1],
    ["february", 2],
    ["march", 3],
    ["april", 4],
    ["may", 5],
    ["june", 6],
    ["july", 7],
    ["august", 8],
    ["september", 9],
    ["october", 10],
    ["november", 11],
    ["december", 12],
  ];
  for (const [m, n] of months) {
    if (s.includes(m) || s.includes(m.slice(0, 3))) return n;
  }
  if (/varies|rolling|открыт|ожижда|embassy/i.test(s)) return 0;
  return 6;
}

const filterPill = (on: boolean) =>
  on
    ? "bg-pw-primary text-pw-primary-foreground border border-pathwise-line/20 shadow-sm"
    : "border border-pathwise-line/90 bg-pathwise-surface text-foreground hover:bg-pathwise-accent-soft/50";

export function GrantsListClient() {
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionKey>("all");
  const [type, setType] = useState<GrantType | "all">("all");
  const [matchP, setMatchP] = useState<MatchPill>("all");
  const [sort, setSort] = useState<SortKey>("match");

  const sync = useCallback(() => {
    setOnboarding(readOnboarding());
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sync]);

  const baseRows = useMemo(
    () => getRankedGrantsForOnboarding(onboarding),
    [onboarding],
  );

  const filtered = useMemo(() => {
    let r = baseRows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter(
        ({ g }) =>
          g.name.toLowerCase().includes(s) ||
          g.kazakhstanRelevance.toLowerCase().includes(s) ||
          g.suggestedMatchBlurb.toLowerCase().includes(s) ||
          g.eligibilityTags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    if (region !== "all")
      r = r.filter(({ g }) => grantRegion(g) === region);
    if (type !== "all") r = r.filter(({ g }) => g.type === type);
    if (onboarding && matchP !== "all")
      r = r.filter((row) => row.match === matchP);
    return r;
  }, [baseRows, q, region, type, matchP, onboarding]);

  const sorted = useMemo(() => {
    const a = [...filtered];
    if (sort === "name")
      a.sort((x, y) => x.g.name.localeCompare(y.g.name, "en"));
    else if (sort === "deadline")
      a.sort(
        (x, y) => monthOrder(x.g.deadline) - monthOrder(y.g.deadline),
      );
    else if (sort === "amount")
      a.sort(
        (x, y) =>
          (y.g.coverageContributionKzt ?? 0) -
          (x.g.coverageContributionKzt ?? 0),
      );
    return a;
  }, [filtered, sort]);

  const reset = () => {
    setQ("");
    setRegion("all");
    setType("all");
    setMatchP("all");
    setSort("match");
  };

  if (!ready) {
    return (
      <div
        className="min-h-[28rem] w-full animate-pulse rounded-[2.5rem] bg-pathwise-line/30"
        aria-hidden
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 pb-2">
      {/*
        Layout matches hackhack-reference.jpg: hero, two columns (sidebar + grid),
        cards with image / badge / body / tags / CTA
      */}
      <section
        className="rounded-[2.2rem] border border-pathwise-line/80 bg-gradient-to-br from-sky-50/95 via-pathwise-surface to-pathwise-surface p-5 shadow-sm md:rounded-[2.5rem] md:p-8"
        aria-labelledby="grants-hero-title"
      >
        <p className="text-[0.7rem] font-bold uppercase leading-none tracking-[0.16em] text-sky-600/90">
          КАТАЛОГ
        </p>
        <h1
          id="grants-hero-title"
          className="mt-3 text-2xl font-bold leading-tight tracking-tight text-pathwise-ink md:text-3xl"
        >
          Стипендии и гранты
        </h1>
        <p className="mt-3 max-w-2xl text-balance text-sm text-pathwise-muted md:text-base">
          Сравнивайте программы для учёбы в Казахстане и за границей, фильтруйте
          по типу — как в витрине teñ. Данные из локального каталога, порядок
          учитывает онбординг, если вы его прошли.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Поиск</span>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pathwise-muted">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              className="w-full rounded-2xl border-2 border-pathwise-line/40 bg-pathwise-surface py-2.5 pl-11 pr-3 text-sm text-foreground shadow-sm ring-0 placeholder:text-pathwise-muted/80 focus:border-pathwise-accent focus:outline-none"
              placeholder="Поиск по названию, городу или описанию"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <p className="shrink-0 text-sm text-pathwise-muted" aria-live="polite">
            Найдено: {sorted.length}
          </p>
        </div>
        {!onboarding && (
          <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
            <strong>Идея.</strong> Пройдите{" "}
            <a className="font-semibold underline" href="/onboarding">
              онбординг
            </a>
            : подбор совпадений сильнее, фильтры &laquo;Сильное&raquo; начнут
            иметь смысл.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside
          className="lg:col-span-3"
          aria-label="Фильтры каталога"
        >
          <div className="sticky top-28 space-y-6">
            <fieldset>
              <legend className="mb-2 text-[0.7rem] font-bold uppercase leading-none tracking-[0.1em] text-pathwise-muted">
                РЕЙТИНГ
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {MATCH_PILLS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setMatchP(p.key)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${filterPill(matchP === p.key)} ${!onboarding && p.key !== "all" ? "opacity-60" : ""}`}
                    title={!onboarding && p.key !== "all" ? "Полезнее после онбординга" : undefined}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-2 text-[0.7rem] font-bold uppercase leading-none tracking-[0.1em] text-pathwise-muted">
                РЕГИОН
              </p>
              <div className="relative">
                <select
                  className="w-full cursor-pointer appearance-none rounded-xl border-2 border-pathwise-line/40 bg-pathwise-surface py-2.5 pl-3 pr-9 text-sm text-foreground focus:border-pathwise-accent focus:outline-none"
                  value={region}
                  onChange={(e) =>
                    setRegion(e.target.value as RegionKey)
                  }
                >
                  {REGION_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-pathwise-muted">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-[0.7rem] font-bold uppercase leading-none tracking-[0.1em] text-pathwise-muted">
                ТИП
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_PILLS.map((p) => (
                  <button
                    key={String(p.key)}
                    type="button"
                    onClick={() => setType(p.key)}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium sm:text-sm ${filterPill(type === p.key)}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={reset}
              className="w-full text-left text-sm font-semibold text-pw-primary underline decoration-pathwise-line underline-offset-4"
            >
              Сбросить фильтры
            </button>
          </div>
        </aside>

        <div className="min-w-0 space-y-4 lg:col-span-9">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-end">
            <p className="text-sm text-pathwise-muted" aria-live="polite">
              Показано {sorted.length} из {baseRows.length}
            </p>
            <div className="flex items-center justify-end gap-2">
              <span className="whitespace-nowrap text-sm text-pathwise-muted">Сортировка</span>
              <div className="relative">
                <select
                  className="min-w-[12rem] cursor-pointer appearance-none rounded-lg border-2 border-pathwise-line/40 bg-pathwise-surface py-2 pl-2.5 pr-8 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="match">По совпадению</option>
                  <option value="name">A–Z</option>
                  <option value="deadline">По сроку</option>
                  <option value="amount">По поддержке (KZT/мес)</option>
                </select>
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-pathwise-muted">
                  <Chevron className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="pw-card p-6 text-sm text-pathwise-muted">
              Ни одной позиции не соответствует. Сбросьте фильтры.
            </p>
          ) : (
            <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((row, idx) => (
                <li key={row.g.id} className="h-full">
                  <CatalogGrantCard
                    index={idx}
                    row={row}
                    hasOnboarding={!!onboarding}
                  />
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
  const { g, match } = row;
  const badge = !hasOnboarding
    ? "—"
    : index < 3 && hasOnboarding
      ? `#${index + 1} Overall`
      : match === "high"
        ? "Сильно"
        : match === "medium"
          ? "Средне"
          : "Мягко";
  return (
    <article className="group flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-pathwise-line/60 bg-pathwise-surface shadow-[0_2px_12px_rgb(15_23_42/0.06)] transition hover:shadow-md">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-sky-50/80">
        <Image
          src={`https://picsum.photos/seed/${encodeURIComponent(g.id)}/640/400`}
          alt=""
          width={640}
          height={400}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className="absolute left-2.5 top-2.5 rounded-full bg-pathwise-surface/95 px-2.5 py-0.5 text-xs font-bold text-pw-primary shadow-sm ring-1 ring-pathwise-line/30">
          {badge}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="line-clamp-2 text-base font-bold leading-tight text-pathwise-ink sm:text-lg">
          {g.name}
        </h2>
        <p className="mt-0.5 text-sm text-pathwise-muted">
          {formatGrantAmountLine(g)} · {g.deadline}
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-pathwise-muted">
          {g.kazakhstanRelevance}
        </p>
        {g.eligibilityTags.length > 0 && (
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            aria-label="Теги"
          >
            {g.eligibilityTags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-lg bg-sky-100/80 px-2.5 py-0.5 text-xs font-medium text-sky-900/90"
              >
                {t.replaceAll("_", " ")}
              </span>
            ))}
            {g.eligibilityTags.length > 3 && (
              <span className="px-0.5 text-xs text-pathwise-muted">
                +{g.eligibilityTags.length - 3}
              </span>
            )}
          </div>
        )}
        <a
          href={g.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-11 w-full items-center justify-center self-stretch rounded-2xl border-2 border-pathwise-line/70 bg-pathwise-surface px-3 text-sm font-semibold text-pw-primary no-underline transition hover:bg-pathwise-accent-soft/40"
        >
          View &rarr;
        </a>
      </div>
    </article>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M15.5 14h-.8l-.3-.3A6.4 6.4 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.4 6.4 0 0 0 4.2-1.6l.3.3v.8L20 20.5 22 18l-4.5-4.5zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.2 7.2a.75.75 0 0 1 1.06.02L10 11l3.7-3.7a.75.75 0 1 1 1.08 1.04l-4.2 4.2a.75.75 0 0 1-1.08 0L5.2 8.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
