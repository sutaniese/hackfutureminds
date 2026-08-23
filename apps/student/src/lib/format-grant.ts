import type { GrantRecord } from "@/types/grants";

/** Сумма гранта одной строкой — для карточек каталога и результатов. */
export function formatGrantAmountLine(g: GrantRecord): string {
  if (g.monthlyKzt != null && g.monthlyKzt > 0) {
    return `≈ ${g.monthlyKzt.toLocaleString("ru-RU")} ₸ в месяц`;
  }
  if (g.amountEur) {
    return `≈ ${g.amountEur.toLocaleString("ru-RU")} € — условия у программы`;
  }
  if (g.amountUsd) {
    return `≈ ${g.amountUsd.toLocaleString("ru-RU")} $ — условия у программы`;
  }
  if (g.amountNarrative?.trim()) {
    return g.amountNarrative;
  }
  return "Сумма зависит от конкурса";
}

const MONTHS_RU: Record<string, string> = {
  january: "январь", february: "февраль", march: "март", april: "апрель",
  may: "май", june: "июнь", july: "июль", august: "август",
  september: "сентябрь", october: "октябрь", november: "ноябрь", december: "декабрь",
};

/** Дедлайны в источниках записаны по-английски — показываем их по-русски. */
export function formatDeadlineRu(deadline: string): string {
  if (!deadline.trim()) return "Уточните на сайте";

  let out = deadline;
  for (const [en, ru] of Object.entries(MONTHS_RU)) {
    out = out.replace(new RegExp(en, "gi"), ru);
  }
  out = out
    .replace(/annually/gi, "ежегодно")
    .replace(/rolling/gi, "приём круглый год")
    .replace(/varies/gi, "зависит от программы")
    .replace(/check official source/gi, "уточните на сайте")
    .replace(/s*-s*/g, " – ");

  return out.charAt(0).toUpperCase() + out.slice(1);
}
