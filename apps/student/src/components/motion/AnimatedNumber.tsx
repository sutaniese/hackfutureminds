"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Плавный выход из 0 — ощущается «живее» статичной цифры на демо. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Счётчик, который добегает до значения за `duration`.
 * Пересчитывается при смене `value`, уважает reduced-motion.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  delay = 0,
  suffix = "",
  prefix = "",
}: {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const run = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (to - from) * easeOutCubic(progress);
      setDisplay(Math.round(next));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(run);
      } else {
        fromRef.current = to;
      }
    };

    timeoutRef.current = window.setTimeout(() => {
      frameRef.current = requestAnimationFrame(run);
    }, delay);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      fromRef.current = value;
    };
  }, [delay, duration, value]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
