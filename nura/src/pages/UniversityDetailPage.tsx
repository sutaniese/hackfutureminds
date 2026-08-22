import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  findUniversity,
  getUniversityWithDefaults,
  type Intake,
  type RequiredDoc,
  type Scholarship,
  type StudyProgram,
} from '../data/universities'

const PROGRAMS_INITIAL_VISIBLE = 3

export function UniversityDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const u = findUniversity(id)

  if (!u) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm font-medium text-pathwise-ink">Университет не найден</p>
        <Link
          to="/vuzy"
          className="mt-3 inline-block text-xs font-semibold text-pathwise-accentStrong"
        >
          ← Назад к каталогу
        </Link>
      </div>
    )
  }

  const data = useMemo(() => getUniversityWithDefaults(u), [u])
  const totalPrograms = data.totalPrograms ?? data.programs?.length ?? 0
  const [showAllPrograms, setShowAllPrograms] = useState(false)
  const programs = data.programs ?? []
  const visiblePrograms = showAllPrograms
    ? programs
    : programs.slice(0, PROGRAMS_INITIAL_VISIBLE)
  const moreCount = Math.max(0, programs.length - PROGRAMS_INITIAL_VISIBLE)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-pathwise-muted">
        <Link to="/vuzy" className="hover:text-pathwise-accentStrong">
          ← Назад к университетам
        </Link>
        <span>·</span>
        <span>{data.city}</span>
      </div>

      <Hero u={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Section title="About the University">
            <p className="text-sm leading-relaxed text-slate-700">{data.description}</p>
            {data.website && (
              <a
                href={data.website}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1 rounded-full border border-pathwise-accent px-4 py-1.5 text-xs font-semibold text-pathwise-accentStrong no-underline transition-colors hover:bg-pathwise-accent hover:text-white"
              >
                Official Website ↗
              </a>
            )}
          </Section>

          <Section title={`Study Programs · ${totalPrograms}`}>
            {programs.length === 0 ? (
              <p className="text-sm text-pathwise-muted">
                Программы пока заполняются. Список появится после публикации приёмной кампанией.
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {visiblePrograms.map((p, idx) => (
                    <ProgramRow key={idx} p={p} />
                  ))}
                </ul>
                {programs.length > PROGRAMS_INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setShowAllPrograms((v) => !v)}
                    className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-pathwise-ink hover:bg-pathwise-accentSoft"
                  >
                    {showAllPrograms ? 'Show Less' : `Show More (${moreCount} more)`}
                  </button>
                )}
              </>
            )}
          </Section>

          <Section title="Intakes & Deadlines">
            <ul className="space-y-3">
              {data.intakes.map((it, i) => (
                <IntakeRow key={i} it={it} />
              ))}
            </ul>
          </Section>

          <Section title="Scholarships Available">
            <ul className="space-y-3">
              {data.scholarships.map((s, i) => (
                <ScholarshipRow key={i} s={s} />
              ))}
            </ul>
          </Section>

          <Section title="Қабылдау талаптары · Admission Requirements">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-pathwise-muted">
              Құжаттар · {data.requirements.requiredDocs.length}
            </p>
            <ul className="space-y-3">
              {data.requirements.requiredDocs.map((d, i) => (
                <DocRow key={i} d={d} />
              ))}
            </ul>
            {data.requirements.note && (
              <p className="mt-4 rounded-lg bg-pathwise-accentSoft/40 p-3 text-xs text-pathwise-muted">
                Ескерту: {data.requirements.note}
              </p>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <YourFitCard
            languageRequirement={data.requirements.languageRequirement}
            scoringSystem={data.requirements.scoringSystem}
            requiredDocs={data.requirements.requiredDocs}
          />

          <SidebarCard title="Quick Information">
            <Row label="City">{data.city}</Row>
            <Row label="Programs">{totalPrograms}</Row>
            <Row label="Type">{data.type === 'public' ? 'Public' : 'Private'}</Row>
            <Row label="Languages">{data.languages.join(', ')}</Row>
          </SidebarCard>

          {(data.contact?.address ||
            data.contact?.email ||
            data.contact?.phone ||
            data.website) && (
            <SidebarCard title="Contact Information">
              {data.website && (
                <Row label="Website">
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-pathwise-accentStrong"
                  >
                    {data.website.replace(/^https?:\/\//, '')}
                  </a>
                </Row>
              )}
              {data.contact?.email && <Row label="Email">{data.contact.email}</Row>}
              {data.contact?.phone && <Row label="Phone">{data.contact.phone}</Row>}
              {data.contact?.address && <Row label="Address">{data.contact.address}</Row>}
            </SidebarCard>
          )}
        </aside>
      </div>
    </div>
  )
}

function Hero({
  u,
}: {
  u: ReturnType<typeof getUniversityWithDefaults>
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-56 w-full overflow-hidden bg-pathwise-accentSoft">
        <img
          src={u.bannerUrl}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/10 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pathwise-ink shadow-sm">
          #{u.rank} Overall
        </span>
      </div>
      <div className="space-y-1 p-6">
        <p className="text-lg font-semibold text-pathwise-ink">{u.nameRu}</p>
        <h1 className="text-2xl font-bold tracking-tight text-pathwise-ink md:text-3xl">
          {u.nameEn}
        </h1>
        <p className="text-sm text-pathwise-muted">{u.city}</p>
      </div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-pathwise-ink">{title}</h2>
      {children}
    </section>
  )
}

function ProgramRow({ p }: { p: StudyProgram }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-pathwise-accentSoft/30 p-4">
      <p className="text-sm font-semibold text-pathwise-ink">{p.titleEn}</p>
      <p className="mt-0.5 text-xs text-pathwise-muted">{p.titleRu}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-white px-2 py-0.5 text-pathwise-ink shadow-sm">
          {p.durationYears} {p.durationYears === 1 ? 'year' : 'years'}
        </span>
        <span className="rounded-full bg-pathwise-accent px-2 py-0.5 text-white shadow-sm">
          {p.language}
        </span>
      </div>
    </li>
  )
}

function IntakeRow({ it }: { it: Intake }) {
  const date = new Date(it.deadline)
  const formatted = isNaN(date.getTime())
    ? it.deadline
    : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-pathwise-accentSoft/30 p-4">
      <div>
        <p className="text-sm font-semibold text-pathwise-ink">
          {it.season} • {it.type}
        </p>
        {it.note && <p className="mt-1 text-xs text-pathwise-muted">{it.note}</p>}
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-pathwise-muted">
          Application deadline
        </p>
        <p className="text-sm font-semibold text-pathwise-accentStrong">{formatted}</p>
      </div>
    </li>
  )
}

function ScholarshipRow({ s }: { s: Scholarship }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-pathwise-accentSoft/30 p-4">
      <p className="text-sm font-semibold text-pathwise-ink">{s.title}</p>
      <p className="mt-1 text-xs text-pathwise-muted">{s.description}</p>
      {s.note && <p className="mt-1 text-[11px] text-pathwise-muted">{s.note}</p>}
    </li>
  )
}

function DocRow({ d }: { d: RequiredDoc }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-pathwise-accentSoft/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-pathwise-ink">{d.titleKz}</p>
        {d.required && (
          <span className="rounded-full bg-pathwise-accent px-2 py-0.5 text-[10px] font-semibold text-white">
            Міндетті
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-pathwise-muted">{d.noteKz}</p>
      <p className="mt-2 text-xs italic text-slate-500">{d.noteEn}</p>
    </li>
  )
}

function YourFitCard({
  languageRequirement,
  scoringSystem,
  requiredDocs,
}: {
  languageRequirement: string
  scoringSystem: string
  requiredDocs: RequiredDoc[]
}) {
  return (
    <div className="rounded-2xl border border-pathwise-accent bg-gradient-to-br from-pathwise-accentSoft via-white to-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-pathwise-ink">Your Fit</h3>
      <p className="mt-1 text-xs text-pathwise-muted">Sign in to see your eligibility</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-pathwise-muted">
            Language Requirement
          </dt>
          <dd className="mt-0.5 text-sm text-pathwise-ink">{languageRequirement}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-pathwise-muted">
            Scoring System
          </dt>
          <dd className="mt-0.5 text-sm text-pathwise-ink">{scoringSystem}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-pathwise-muted">
            Your Score
          </dt>
          <dd className="mt-0.5 text-sm text-pathwise-muted">—</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-pathwise-muted">
            Required Subjects
          </dt>
          <dd className="mt-1 space-y-1">
            {requiredDocs.slice(0, 5).map((d, i) => (
              <p key={i} className="text-xs text-pathwise-ink">
                • {d.titleEn}
              </p>
            ))}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-4 w-full rounded-full bg-pathwise-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pathwise-accentStrong"
      >
        Get Started
      </button>
    </div>
  )
}

function SidebarCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-pathwise-ink">{title}</h3>
      <dl className="space-y-2.5 text-sm">{children}</dl>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs text-pathwise-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-pathwise-ink">{children}</dd>
    </div>
  )
}
