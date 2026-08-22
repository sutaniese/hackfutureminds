import type { ReactNode } from 'react'

type Stat = {
  label: string
  value: string
}

export function PortalPageHero({
  kicker,
  title,
  description,
  stats = [],
  action,
}: {
  kicker: string
  title: string
  description: string
  stats?: Stat[]
  action?: ReactNode
}) {
  return (
    <section className="pw-soft-panel relative overflow-hidden rounded-[2rem] p-6 md:rounded-[2.5rem] md:p-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-pathwise-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-5 right-8 hidden h-20 w-20 rotate-12 rounded-[1.6rem] border border-white/80 bg-white/35 md:block" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-[0.16em] text-pathwise-accentStrong ring-1 ring-pathwise-line/70">
            {kicker}
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-pathwise-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-pathwise-muted md:text-base md:leading-7">
            {description}
          </p>
        </div>

        {action ? <div className="flex lg:justify-end">{action}</div> : null}
      </div>

      {stats.length > 0 && (
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className="rounded-2xl border border-pathwise-line/80 bg-white/70 p-4 shadow-sm"
            >
              <p className="text-2xl font-black tabular-nums text-pathwise-ink">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-pathwise-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
