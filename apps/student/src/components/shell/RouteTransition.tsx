"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Анимация перехода между страницами.
 *
 * `<main>` живёт в layout и при клиентской навигации не перемонтируется,
 * поэтому CSS-анимация на нём отыгрывала только при первой загрузке.
 * Ключ по пути заставляет React пересоздать обёртку на каждом переходе —
 * и анимация входа запускается снова.
 *
 * При `prefers-reduced-motion: reduce` длительность обнуляется глобально
 * в globals.css, содержимое остаётся на месте.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="pw-route-in">
      {children}
    </div>
  );
}
