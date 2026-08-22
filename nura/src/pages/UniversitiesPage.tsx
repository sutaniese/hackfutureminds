import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ALL_LANGUAGES,
  ALL_RANKING_CATEGORIES,
  ALL_REGIONS,
  UNIVERSITIES,
  type University,
  type UniLanguage,
  type UniRanking,
} from '../data/universities'

type Sort = 'rank-asc' | 'name-asc' | 'name-desc'
type TypeFilter = 'all' | 'public' | 'private'
type ProfileFilter = 'all' | 'medical' | 'non-medical'
type BranchFilter = 'all' | 'foreign-branch' | 'local'

export function UniversitiesPage() {
  const [ranking, setRanking] = useState<UniRanking>('Overall')
  const [region, setRegion] = useState<string | 'all'>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [profile, setProfile] = useState<ProfileFilter>('all')
  const [branch, setBranch] = useState<BranchFilter>('all')
  const [languages, setLanguages] = useState<UniLanguage[]>([])
  const [sort, setSort] = useState<Sort>('rank-asc')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = UNIVERSITIES.filter((u) => u.rankingCategories.includes(ranking))
    if (region !== 'all') list = list.filter((u) => u.city === region)
    if (type !== 'all') list = list.filter((u) => u.type === type)
    if (profile !== 'all') list = list.filter((u) => u.profile === profile)
    if (branch !== 'all') list = list.filter((u) => u.branchStatus === branch)
    if (languages.length > 0) {
      list = list.filter((u) => languages.every((lang) => u.languages.includes(lang)))
    }
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.description.toLowerCase().includes(q),
      )
    }
    const arr = [...list]
    if (sort === 'rank-asc') arr.sort((a, b) => a.rank - b.rank)
    else if (sort === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'name-desc') arr.sort((a, b) => b.name.localeCompare(a.name))
    return arr
  }, [ranking, region, type, profile, branch, languages, search, sort])

  function reset() {
    setRanking('Overall')
    setRegion('all')
    setType('all')
    setProfile('all')
    setBranch('all')
    setLanguages([])
    setSearch('')
    setSort('rank-asc')
  }

  function toggleLanguage(lang: UniLanguage) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang],
    )
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-pathwise-accentSoft bg-gradient-to-br from-pathwise-accentSoft via-white to-white p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-pathwise-accent">
          Каталог
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-pathwise-ink md:text-4xl">
          Университеты Казахстана
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-pathwise-muted md:text-base">
          Изучай лучшие университеты страны, фильтруй по направлению, региону и языку обучения.
          Откликнись на программу, к которой ученик готов поступать в этом году.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, городу или описанию"
            className="min-h-[44px] w-full max-w-md rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-pathwise-accent"
            aria-label="Поиск университета"
          />
          <span className="text-xs font-medium text-pathwise-muted">
            {filtered.length} результат{plural(filtered.length)}
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <FilterGroup label="Ranking">
            <RadioPills
              value={ranking}
              onChange={(v) => setRanking(v as UniRanking)}
              options={ALL_RANKING_CATEGORIES.map((r) => ({ value: r, label: r }))}
            />
          </FilterGroup>

          <FilterGroup label="Region">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
            >
              <option value="all">All regions</option>
              {ALL_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="University Type">
            <SegPills
              value={type}
              onChange={(v) => setType(v as TypeFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'public', label: 'Public only' },
                { value: 'private', label: 'Private only' },
              ]}
            />
          </FilterGroup>

          <FilterGroup label="University Profile">
            <SegPills
              value={profile}
              onChange={(v) => setProfile(v as ProfileFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'medical', label: 'Medical only' },
                { value: 'non-medical', label: 'Non-medical only' },
              ]}
            />
          </FilterGroup>

          <FilterGroup label="Branch Status">
            <SegPills
              value={branch}
              onChange={(v) => setBranch(v as BranchFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'foreign-branch', label: 'Foreign branch only' },
                { value: 'local', label: 'Local only' },
              ]}
            />
          </FilterGroup>

          <FilterGroup label="Languages of study">
            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const active = languages.includes(lang)
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-pathwise-accent bg-pathwise-accentSoft text-pathwise-ink'
                        : 'border-slate-200 bg-white text-pathwise-muted hover:bg-slate-50'
                    }`}
                  >
                    {lang}
                  </button>
                )
              })}
            </div>
          </FilterGroup>

          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-pathwise-muted hover:bg-slate-50"
          >
            Сбросить фильтры
          </button>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-pathwise-ink">
              {filtered.length} результат{plural(filtered.length)}
            </p>
            <label className="inline-flex items-center gap-2 text-xs text-pathwise-muted">
              Sort by:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                <option value="rank-asc">Rankings (high to low) · {ranking}</option>
                <option value="name-asc">Alphabetical (A–Z)</option>
                <option value="name-desc">Alphabetical (Z–A)</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-medium text-pathwise-ink">Ничего не найдено</p>
              <p className="mt-1 text-xs text-pathwise-muted">Попробуйте сбросить фильтры.</p>
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((u) => (
                <UniCard key={u.id} u={u} ranking={ranking} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function plural(n: number) {
  const m = n % 100
  if (m >= 11 && m <= 14) return 'ов'
  const last = n % 10
  if (last === 1) return ''
  if (last >= 2 && last <= 4) return 'а'
  return 'ов'
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pathwise-muted">
        {label}
      </h3>
      {children}
    </div>
  )
}

function RadioPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-pathwise-accent bg-pathwise-accent text-white'
                : 'border-slate-200 bg-white text-pathwise-ink hover:bg-pathwise-accentSoft'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SegPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-pathwise-accent bg-pathwise-accentSoft text-pathwise-ink'
                : 'border-slate-200 bg-white text-pathwise-muted hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function UniCard({ u, ranking }: { u: University; ranking: UniRanking }) {
  return (
    <li>
      <Link
        to={`/vuzy/${u.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm no-underline transition-all hover:-translate-y-0.5 hover:border-pathwise-accent hover:shadow-md"
      >
        <div
          className="relative h-40 w-full overflow-hidden bg-pathwise-accentSoft"
          aria-hidden
        >
          <img
            src={u.bannerUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-pathwise-ink shadow-sm">
            #{u.rank} {ranking}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold leading-snug text-pathwise-ink">
            {u.nameEn}
          </h3>
          <p className="mt-1 text-xs text-pathwise-muted">{u.city}</p>
          <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600">{u.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {u.languages.map((l) => (
              <span
                key={l}
                className="rounded-full bg-pathwise-accentSoft px-2 py-0.5 text-[10px] font-semibold text-pathwise-accentStrong"
              >
                {l}
              </span>
            ))}
          </div>
          <span className="mt-5 inline-flex items-center gap-1 self-start rounded-full border border-pathwise-accent px-4 py-1.5 text-xs font-semibold text-pathwise-accentStrong transition-colors group-hover:bg-pathwise-accent group-hover:text-white">
            View →
          </span>
        </div>
      </Link>
    </li>
  )
}
