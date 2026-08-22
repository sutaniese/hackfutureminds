import type { StudentProfile } from '../types/pathwise'

type Props = {
  student: StudentProfile | null
  /** Для PDF и семантики */
  reportSection?: boolean
}

/**
 * Родительский дашборд: только чтение — профиль, карьерная карта, финмаршрут.
 * Данные передаются снаружи (по ID загружены в родителе).
 */
export function ParentDashboard({ student, reportSection = true }: Props) {
  if (!student) {
    return (
      <section
        className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm"
        aria-labelledby="parent-dash-empty"
      >
        <h2 id="parent-dash-empty" className="text-lg font-semibold text-pathwise-ink">
          Профиль ученика
        </h2>
        <p className="mt-2 text-pathwise-muted">Выберите ученика по ID — данные появятся здесь.</p>
      </section>
    )
  }

  const labelId = 'parent-dashboard-title'

  return (
    <section
      className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm"
      aria-labelledby={labelId}
      {...(reportSection ? { 'data-report-section': 'dashboard' } : {})}
    >
      <header className="border-b border-pathwise-line pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-pathwise-accent">
          Только просмотр
        </p>
        <h2 id={labelId} className="mt-1 text-xl font-semibold text-pathwise-ink">
          Профиль ученика
        </h2>
        <p className="text-sm text-pathwise-muted">
          Родитель видит выбор ребёнка без возможности редактирования.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-pathwise-surface p-4" role="group" aria-label="Карточка ученика">
          <h3 className="text-sm font-semibold text-pathwise-ink">Личные данные</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-pathwise-muted">Имя</dt>
              <dd className="font-medium text-pathwise-ink">{student.displayName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pathwise-muted">Возраст</dt>
              <dd className="font-medium">{student.age}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pathwise-muted">Город</dt>
              <dd className="font-medium">{student.city}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pathwise-muted">Язык</dt>
              <dd className="font-medium">{student.language.toUpperCase()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pathwise-muted">Целевой вуз</dt>
              <dd className="max-w-[60%] text-right font-medium">{student.target_university}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-pathwise-muted">Интересы</h4>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Интересы">
              {student.interests.map((i) => (
                <li
                  key={i}
                  className="rounded-full bg-pathwise-surface px-3 py-1 text-xs font-medium text-pathwise-ink ring-1 ring-pathwise-line"
                >
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-pathwise-muted">Достижения</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-pathwise-ink">
              {student.achievements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="rounded-xl border border-pathwise-accentSoft bg-teal-50/40 p-4"
          role="group"
          aria-label="Упаковка достижений"
        >
          <h3 className="text-sm font-semibold text-pathwise-ink">Портфолио-блок (как видит вуз)</h3>
          <blockquote className="mt-3 border-l-4 border-pathwise-accent pl-3 text-sm leading-relaxed text-pathwise-ink">
            {student.portfolio_block}
          </blockquote>
          <p className="mt-3 text-xs text-pathwise-muted">
            Текст сформирован в модуле ребёнка. Родитель не может изменить формулировки.
          </p>
        </div>
      </div>

      <div className="mt-8" role="region" aria-label="Карьерная карта" data-report-section="career">
        <h3 className="text-lg font-semibold text-pathwise-ink">Карьерная карта</h3>
        <p className="text-sm text-pathwise-muted">
          Основной выбор ребёнка:{' '}
          <span className="font-semibold text-pathwise-ink">{student.primaryCareerTitle}</span>
        </p>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {student.career_map.map((c) => (
            <li
              key={c.title}
              className="flex flex-col rounded-xl border border-pathwise-line bg-pathwise-surface p-4"
            >
              <span className="text-sm font-semibold text-pathwise-ink">{c.title}</span>
              <span className="mt-2 text-xs text-pathwise-accent">{c.salary}</span>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-pathwise-muted">{c.path}</p>
              {c.vacancies && c.vacancies.length > 0 && (
                <div className="mt-3 border-t border-pathwise-line pt-2">
                  <span className="text-[10px] font-semibold uppercase text-pathwise-muted">
                    Примеры ролей
                  </span>
                  <ul className="mt-1 space-y-1 text-[11px] text-pathwise-ink">
                    {c.vacancies.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8" role="region" aria-label="Финансовый маршрут" data-report-section="finance">
        <h3 className="text-lg font-semibold text-pathwise-ink">Финансовый маршрут (оценка)</h3>
        <div className="mt-3 flex flex-wrap items-end gap-6 rounded-xl bg-slate-900 px-4 py-4 text-white">
          <div>
            <p className="text-xs text-slate-400">Месячная стоимость (ориентир)</p>
            <p className="text-2xl font-bold tabular-nums">
              {student.financial_route.monthly_cost.toLocaleString('ru-RU')} ₸
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Покрытие грантами (план)</p>
            <p className="text-2xl font-bold tabular-nums">{student.financial_route.coverage_percent}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Разрыв до полного покрытия</p>
            <p className="text-2xl font-bold tabular-nums text-amber-300">
              {student.financial_route.gap.toLocaleString('ru-RU')} ₸
            </p>
          </div>
        </div>
        <h4 className="mt-4 text-sm font-semibold text-pathwise-ink">Подобранные гранты</h4>
        <ul className="mt-2 divide-y divide-pathwise-line rounded-xl border border-pathwise-line">
          {student.financial_route.grants.map((g) => (
            <li key={g.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium text-pathwise-ink">{g.name}</span>
              <span className="text-pathwise-muted">{g.amountLabel}</span>
              <span className="rounded-full bg-pathwise-accentSoft px-2 py-0.5 text-xs text-pathwise-muted">
                дедлайн: {g.deadline}
              </span>
              <span className="text-xs text-pathwise-muted">
                ~{g.amountMonthlyKzt.toLocaleString('ru-RU')} ₸/мес (экв.)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
