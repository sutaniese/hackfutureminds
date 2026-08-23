"use client";

import { AnimatedNumber } from "./AnimatedNumber";

/**
 * Кольцо прогресса: главный визуальный акцент кабинета.
 * Дуга рисуется анимацией `pw-ring`, число добегает счётчиком.
 */
export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  color = "#6C63FF",
  label,
  caption,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  caption?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${label ?? "Прогресс"}: ${safe}%`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(15 23 42 / 0.07)"
            strokeWidth={stroke}
          />
          <circle
            className="pw-ring"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={
              {
                "--ring-circumference": circumference,
                "--ring-offset": offset,
              } as React.CSSProperties
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tracking-tight text-pathwise-ink">
            <AnimatedNumber value={safe} suffix="%" delay={150} duration={1100} />
          </span>
          {label ? (
            <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-pathwise-muted">
              {label}
            </span>
          ) : null}
        </div>
      </div>
      {caption ? (
        <p className="mt-3 text-center text-xs font-semibold leading-5 text-pathwise-muted">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
