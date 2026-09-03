"use client";

import type { VoiceWaveMode } from "@/lib/voice/meter";

export function SoundWaves({
  points,
  mode,
  label,
}: {
  points: number[];
  mode: VoiceWaveMode;
  label: string;
}) {
  if (mode === "off") return null;
  if (mode === "static") {
    return (
      <div
        className="flex min-h-11 items-center justify-center rounded-full bg-[#F1EFFF] px-3 text-sm font-bold text-[#6C63FF]"
        role="status"
      >
        {label}
      </div>
    );
  }

  const w = 280;
  const h = 56;
  const dim = mode === "idle";
  const frozen = mode === "frozen";
  const values = mode === "idle" ? points.map(() => 0.5) : points.length ? points : [0.5, 0.5];
  const d = values
    .map((y, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const py = 4 + (1 - y) * (h - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-14 w-full ${dim ? "opacity-40" : "opacity-100"} ${frozen ? "opacity-70" : ""}`}
      aria-hidden
    >
      <path d={d} fill="none" stroke={dim ? "#94A3B8" : "#6C63FF"} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
