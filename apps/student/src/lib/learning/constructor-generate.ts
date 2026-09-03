import { z } from "zod";
import type { Difficulty } from "./types";

export const topicNotesSchema = z.object({
  keyIdea: z.string().min(1).max(400),
  formula: z.string().max(240).optional().default(""),
  bullets: z.array(z.string().min(1).max(240)).min(3).max(5),
  example: z.string().min(1).max(400),
  mistake: z.string().min(1).max(400),
});

export type TopicNotes = z.infer<typeof topicNotesSchema>;

export const generatedTaskSchema = z.object({
  prompt: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(220)).min(2).max(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(500),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  skillId: z.string().min(1).max(80),
});

export type GeneratedTask = z.infer<typeof generatedTaskSchema>;

const generatedTasksPayload = z.object({
  tasks: z.array(generatedTaskSchema).min(2).max(6),
});

export function parseGeneratedTasks(raw: unknown): GeneratedTask[] | null {
  const parsed = generatedTasksPayload.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.tasks.map((task) => ({
    ...task,
    options: padOptions(task.options),
    answerIndex: Math.min(task.answerIndex, 3),
  }));
}

export function parseTopicNotes(raw: unknown): TopicNotes | null {
  const parsed = topicNotesSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function notesToTheory(notes: TopicNotes): string[] {
  const bullets = notes.bullets.slice(0, 3);
  return [
    notes.keyIdea.trim(),
    notes.formula?.trim() ? `Формула: ${notes.formula.trim()}` : "",
    ...bullets.map((item) => item.trim()),
    `Пример: ${notes.example.trim()}`,
    `Частая ошибка: ${notes.mistake.trim()}`,
  ].filter(Boolean);
}

export function theoryToNotes(theory: string[], title: string, goal: string): TopicNotes {
  const parts = theory.map((item) => item.trim()).filter(Boolean);
  return {
    keyIdea: parts[0] || goal || title,
    formula: parts.find((item) => /[=+\-/*]/.test(item)) || "",
    bullets: [parts[1] || title, parts[2] || goal || title, parts[3] || parts[0] || title],
    example: parts.find((item) => /пример/i.test(item)) || parts[1] || title,
    mistake: parts.find((item) => /ошибк/i.test(item)) || parts.at(-1) || title,
  };
}

function padOptions(options: string[]): string[] {
  const next = options.map((item) => item.trim()).filter(Boolean).slice(0, 4);
  while (next.length < 4) next.push(`Вариант ${next.length + 1}`);
  return next;
}

export function fallbackGeneratedTasks(title: string, skill: string): GeneratedTask[] {
  const skillId = skill.trim() || title.trim() || "skill";
  const diffs: Difficulty[] = [1, 2, 3];
  return diffs.map((difficulty, index) => ({
    prompt: `${title}: вопрос ${index + 1} (уровень ${difficulty}). Выберите верный ответ.`,
    options: ["Верный шаг решения", "Пропуск условия", "Случайное число", "Противоположный знак"],
    answerIndex: 0,
    explanation: `Разберите условие «${title}» по шагам. Правильный ответ опирается на навык «${skillId}».`,
    difficulty,
    skillId,
  }));
}

export function fallbackTopicNotes(title: string, goal: string): TopicNotes {
  const idea = goal.trim() || `Кратко: ${title}`;
  return {
    keyIdea: idea,
    formula: "",
    bullets: [
      `Главное в теме «${title}».`,
      "Сначала правило, потом пример.",
      "Проверьте знаки и единицы.",
    ],
    example: `Пример по теме «${title}»: запишите условие и решите в два шага.`,
    mistake: "Частая ошибка — пропустить условие или перепутать знак.",
  };
}
