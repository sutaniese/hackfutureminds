import type { GrantRecord } from "@/types/grants";

/** One line for cards (list + results). */
export function formatGrantAmountLine(g: GrantRecord): string {
  if (g.monthlyKzt != null && g.monthlyKzt > 0) {
    return `~${g.monthlyKzt.toLocaleString()} KZT / month (demo est.)`;
  }
  if (g.amountEur) {
    return `~${g.amountEur.toLocaleString()} EUR (see programme for terms)`;
  }
  if (g.amountUsd) {
    return `~${g.amountUsd.toLocaleString()} USD (see programme for terms)`;
  }
  if (g.amountNarrative?.trim()) {
    return g.amountNarrative;
  }
  return "Amount varies (check official call)";
}
