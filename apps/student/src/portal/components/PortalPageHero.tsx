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
    <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#6C63FF]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-slate-200" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="inline-flex rounded-full bg-[#f6f5ff] px-3 py-1 text-[0.68rem] font-black uppercase leading-none tracking-[0.16em] text-[#554dd6] ring-1 ring-[#dedbff]">
            {kicker}
          </p>
          <h1 className="mt-4 max-w-5xl text-3xl font-black leading-[1.03] tracking-[-0.045em] text-pathwise-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-pathwise-muted md:text-base md:leading-7">
            {description}
          </p>
        </div>

        {action ? <div className="flex lg:justify-end">{action}</div> : null}
      </div>

      {stats.length > 0 && (
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-4 shadow-sm"
            >
              <p className="text-2xl font-black tabular-nums tracking-[-0.03em] text-pathwise-ink">{stat.value}</p>
              <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-pathwise-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
