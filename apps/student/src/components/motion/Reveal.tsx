"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Появление блока при входе в кадр. Без JS-библиотек: IntersectionObserver
 * добавляет класс, вся анимация живёт в CSS (`.pw-inview`).
 * При `prefers-reduced-motion: reduce` содержимое видно сразу.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  once = true,
}: {
  children: ReactNode;
  /** Задержка каскада в миллисекундах. */
  delay?: number;
  as?: ElementType;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={cn("pw-inview", visible && "is-visible", className)}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
