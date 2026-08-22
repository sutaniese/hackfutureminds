"use client";

import { PORTAL_PATHS, portalHref } from "@pathwise/shared/links";

/**
 * Bridge from the student core to the B2B hub inside the same Next.js app.
 * Renders three CTA cards: parents dashboard, teachers room, universities catalog.
 *
 * By default the portal is same-origin under `/hub` (see root README). Set
 * `NEXT_PUBLIC_PORTAL_URL` to an absolute URL only for a split deployment.
 */
export function CrossAppPromo() {
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || undefined;
  const items: Array<{ href: string; emoji: string; title: string; sub: string }> = [
    {
      href: portalHref(PORTAL_PATHS.parents, portalBase),
      emoji: "👨‍👩‍👧",
      title: "Родители",
      sub: "Финкалькулятор, сравнение профессий и PDF-отчёт о ребёнке.",
    },
    {
      href: portalHref(PORTAL_PATHS.teachers, portalBase),
      emoji: "🧑‍🏫",
      title: "Учителя",
      sub: "Класс с инвайт-кодом, сводный дашборд и письма-рекомендации.",
    },
    {
      href: portalHref(PORTAL_PATHS.universities, portalBase),
      emoji: "🎓",
      title: "Каталог вузов",
      sub: "30+ университетов Казахстана с программами, дедлайнами и грантами.",
    },
  ];

  return (
    <section
      className="pw-card p-4 pw-artifact-appear"
      style={{ animationDelay: "0.3s" }}
      aria-labelledby="pw-cross-promo"
    >
      <h2
        id="pw-cross-promo"
        className="flex min-h-12 items-center gap-2 text-base font-bold"
      >
        <span className="text-2xl" aria-hidden>
          🤝
        </span>
        Семья и школа
      </h2>
      <p className="text-xs text-pathwise-muted">
        Открой портал PathWise — родителям и учителям, чтобы поддержать твой план.
      </p>

      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <li key={it.href}>
            <a
              href={it.href}
              className="group block h-full rounded-2xl border-2 border-pathwise-line bg-background/50 p-3 transition-colors hover:border-pw-primary"
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl" aria-hidden>
                  {it.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{it.title}</div>
                  <p className="mt-1 text-xs leading-snug text-pathwise-muted">
                    {it.sub}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold text-pw-primary">
                Открыть →
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
