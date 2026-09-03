"use client";

import type { LiveClipScene } from "@pathwise/shared";

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function compareSides(scene: LiveClipScene): { left: string; right: string } {
  const lines = splitLines(scene.body);
  if (lines.length >= 2) return { left: lines[0], right: lines[1] };
  const parts = (scene.body || scene.narration).split(/\s+[—–\-:/]\s+/);
  return {
    left: parts[0] || scene.heading,
    right: parts[1] || scene.formula || scene.narration,
  };
}

export function FormulaVisual({ scene }: { scene: LiveClipScene }) {
  return (
    <div className="live-clip-enter rounded-3xl border-l-8 border-[#6C63FF] bg-[#100E1C] px-5 py-6">
      <p className="font-mono text-2xl font-bold leading-snug tracking-tight text-[#F7F6FF]">
        {scene.formula || scene.body || scene.heading}
      </p>
      {scene.body && scene.formula ? (
        <p className="mt-3 text-sm leading-6 text-[#C7C3E0]">{scene.body}</p>
      ) : null}
    </div>
  );
}

export function BulletsVisual({ scene }: { scene: LiveClipScene }) {
  const items = splitLines(scene.body || scene.narration);
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={item}
          className="live-clip-enter flex items-start gap-3 rounded-2xl border border-[#2A2550] bg-[#161326] px-4 py-3"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] text-xs font-black text-white">
            {index + 1}
          </span>
          <span className="text-base font-semibold leading-6 text-[#F7F6FF]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DiagramVisual({ scene }: { scene: LiveClipScene }) {
  const items = splitLines(scene.body || scene.narration);
  const nodes = (items.length >= 2 ? items : [scene.heading, scene.body || scene.narration]).slice(0, 3);
  return (
    <div className="flex flex-col items-stretch gap-3">
      {nodes.map((item, index) => (
        <div key={`${item}-${index}`} className="live-clip-enter" style={{ animationDelay: `${index * 110}ms` }}>
          <div className="rounded-2xl border border-[#2A2550] bg-[#161326] px-4 py-3 text-center text-sm font-bold text-[#F7F6FF]">
            {item}
          </div>
          {index < nodes.length - 1 ? (
            <div className="mx-auto my-1 h-5 w-px bg-[#6C63FF]" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CompareVisual({ scene }: { scene: LiveClipScene }) {
  const { left, right } = compareSides(scene);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="live-clip-enter rounded-2xl border border-[#2A2550] bg-[#161326] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A99CFF]">A</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#F7F6FF]">{left}</p>
      </div>
      <div className="live-clip-enter rounded-2xl border border-[#2A2550] bg-[#161326] p-4" style={{ animationDelay: "100ms" }}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#43D19E]">B</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#F7F6FF]">{right}</p>
      </div>
    </div>
  );
}

export function SceneVisual({ scene }: { scene: LiveClipScene }) {
  if (scene.visual === "formula") return <FormulaVisual scene={scene} />;
  if (scene.visual === "bullets") return <BulletsVisual scene={scene} />;
  if (scene.visual === "compare") return <CompareVisual scene={scene} />;
  return <DiagramVisual scene={scene} />;
}
