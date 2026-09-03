import type { Task } from "../types";

export type ClipBeatKind = "hook" | "idea" | "example" | "check";

export type ClipBeat = {
  kind: ClipBeatKind;
  title: string;
  text: string;
  seconds: number;
};

export type LearningClip = {
  id: string;
  topicId: string;
  title: string;
  locale: "ru" | "kk";
  baked: boolean;
  beats: ClipBeat[];
  quizTaskId: string;
};

export const CLIP_BEAT_LABELS: Record<ClipBeatKind, string> = {
  hook: "Крюк",
  idea: "Идея",
  example: "Пример",
  check: "Проверка",
};

export function fallbackBeats(title: string, theory: readonly string[], locale: "ru" | "kk"): ClipBeat[] {
  const t = theory.filter(Boolean);
  if (locale === "kk") {
    return [
      { kind: "hook", title: "Неге маңызды?", text: `${title} — емтиханда жиі кездеседі. 40 секундта негізін бекітеміз.`, seconds: 8 },
      { kind: "idea", title: "Идея", text: t[0] || `${title} ережесін есте сақта.`, seconds: 14 },
      { kind: "example", title: "Мысал", text: t[1] || t[0] || "Мысалды қадаммен қара.", seconds: 14 },
      { kind: "check", title: "Тексеру", text: "Соңында бір тапсырма. Қате болса — осы дағдыны қайталаймыз.", seconds: 10 },
    ];
  }
  return [
    { kind: "hook", title: "Зачем это", text: `${title} часто всплывает на контрольной. За 40 секунд закрепим ядро.`, seconds: 8 },
    { kind: "idea", title: "Идея", text: t[0] || `Запомни правило темы «${title}».`, seconds: 14 },
    { kind: "example", title: "Пример", text: t[1] || t[0] || "Разберём один пример по шагам.", seconds: 14 },
    { kind: "check", title: "Проверка", text: "В конце — одно задание из банка. Ошибка вернёт к этому навыку.", seconds: 10 },
  ];
}

export function parseBeatsFromModel(raw: string, title: string, theory: readonly string[]): ClipBeat[] {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return fallbackBeats(title, theory, "ru");
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { beats?: Array<{ kind?: string; title?: string; text?: string; seconds?: number }> };
    const beats = (parsed.beats ?? []).filter((b) => b.text);
    if (beats.length < 4) return fallbackBeats(title, theory, "ru");
    const kinds: ClipBeatKind[] = ["hook", "idea", "example", "check"];
    return kinds.map((kind, index) => ({
      kind,
      title: beats[index]?.title || CLIP_BEAT_LABELS[kind],
      text: String(beats[index]?.text ?? ""),
      seconds: Math.min(20, Math.max(6, Number(beats[index]?.seconds) || [8, 14, 14, 10][index])),
    }));
  } catch {
    return fallbackBeats(title, theory, "ru");
  }
}

export function pickQuizTask(tasks: readonly Task[], skill?: string): Task | null {
  if (tasks.length === 0) return null;
  const bySkill = skill ? tasks.filter((task) => task.skill === skill) : tasks;
  const pool = bySkill.length > 0 ? bySkill : tasks;
  return pool[0] ?? null;
}
