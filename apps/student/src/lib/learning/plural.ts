/** Русские числительные: 1 попытка, 2 попытки, 5 попыток. */
export function plural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function withPlural(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`;
}

export const attemptsLabel = (count: number) => withPlural(count, "попытка", "попытки", "попыток");
export const tasksLabel = (count: number) => withPlural(count, "задание", "задания", "заданий");
/** Родительный падеж после «из N»: из 1 задания, из 5 заданий. */
export const ofTasksLabel = (count: number) =>
  `${count} ${count % 10 === 1 && count % 100 !== 11 ? "задания" : "заданий"}`;
export const topicsLabel = (count: number) => withPlural(count, "тема", "темы", "тем");
export const studentsLabel = (count: number) => withPlural(count, "ученик", "ученика", "учеников");
export const daysLabel = (count: number) => withPlural(count, "день", "дня", "дней");
