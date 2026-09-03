'use client'

/**
 * Grant ROI tracker. Invented 524 / 128.4M ₸ aggregates were removed —
 * this block stays empty until a live class has real grant data.
 */
export function EnterpriseAnalytics() {
  return (
    <section
      className="space-y-4 rounded-2xl border border-pathwise-line bg-white p-6 shadow-sm"
      aria-labelledby="enterprise-analytics-title"
    >
      <header>
        <h2 id="enterprise-analytics-title" className="text-lg font-semibold text-pathwise-ink">
          Грантовый ROI-трекер
        </h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Сводка по грантам и поступлению появится из данных живого класса. Пока в потоке нет
          подтверждённых учеников и выплат — цифр нет.
        </p>
      </header>
    </section>
  )
}
