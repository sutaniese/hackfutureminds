export type ParentReportGrant = {
  name?: string;
  amountLabel?: string;
  deadline?: string;
  amountMonthlyKzt?: number;
};

export type ParentReportCareer = {
  title?: string;
  salary?: string;
  path?: string;
  vacancies?: string[];
};

export type ParentReportChild = {
  id: string;
  displayName?: string;
  name?: string;
  age?: number;
  city?: string;
  language?: string;
  target_university?: string;
  interests?: string[];
  achievements?: string[];
  primaryCareerTitle?: string;
  portfolio_block?: string;
  career_map?: ParentReportCareer[];
  financial_route?: {
    monthly_cost?: number;
    coverage_percent?: number;
    gap?: number;
    grants?: ParentReportGrant[];
  };
  snapshot?: { mastery?: number; accuracy?: number; grade?: number; weakTopics?: string[] };
};

export type ParentReportLabels = {
  brand: string;
  title: string;
  readonly: string;
  profile: string;
  personal: string;
  name: string;
  age: string;
  city: string;
  language: string;
  university: string;
  interests: string;
  achievements: string;
  portfolio: string;
  progress: string;
  mastery: string;
  accuracy: string;
  weak: string;
  career: string;
  finance: string;
  cost: string;
  coverage: string;
  gap: string;
  grants: string;
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dash(value: unknown): string {
  if (value == null || value === "") return "—";
  return esc(value);
}

function money(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("ru-RU")} ₸`;
}

export function childDisplayName(child: ParentReportChild): string {
  return child.displayName || child.name || child.id;
}

export function buildParentReportHtml(child: ParentReportChild, labels: ParentReportLabels): string {
  const name = childDisplayName(child);
  const interests = (child.interests ?? []).map((item) => `<span class="chip">${esc(item)}</span>`).join(" ");
  const achievements = (child.achievements ?? [])
    .map((item) => `<li>${esc(item)}</li>`)
    .join("");
  const weak = (child.snapshot?.weakTopics ?? []).join(", ");
  const careers = (child.career_map ?? [])
    .map(
      (item) => `
        <div class="card">
          <p class="h">${dash(item.title)}</p>
          <p class="muted">${dash(item.salary)}</p>
          <p>${dash(item.path)}</p>
        </div>`,
    )
    .join("");
  const grants = (child.financial_route?.grants ?? [])
    .map(
      (item) => `
        <li>
          <strong>${dash(item.name)}</strong>
          <span>${dash(item.amountLabel)}</span>
          <span>${dash(item.deadline)}</span>
        </li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(labels.brand)} — ${esc(name)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; color: #111827; background: #FAFAFF; margin: 0; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    .kicker { color: #6C63FF; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    .muted { color: #64748B; font-size: 13px; }
    .grid { display: flex; gap: 12px; flex-wrap: wrap; }
    .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 14px; flex: 1; min-width: 180px; }
    .h { font-weight: 800; margin: 0 0 6px; }
    dl { margin: 0; }
    dt { color: #64748B; font-size: 12px; }
    dd { margin: 0 0 8px; font-weight: 700; }
    .chip { display: inline-block; border: 1px solid #E5E7EB; border-radius: 999px; padding: 4px 10px; font-size: 12px; margin: 0 6px 6px 0; }
    .quote { border-left: 4px solid #6C63FF; padding-left: 10px; background: #F1EFFF; border-radius: 0 12px 12px 0; }
    ul { padding-left: 18px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <p class="kicker">${esc(labels.brand)} · ${esc(labels.readonly)}</p>
  <h1>${esc(labels.title)}</h1>
  <p class="muted">${esc(name)}</p>

  <h2>${esc(labels.profile)}</h2>
  <div class="grid">
    <div class="card">
      <p class="h">${esc(labels.personal)}</p>
      <dl>
        <dt>${esc(labels.name)}</dt><dd>${dash(name)}</dd>
        <dt>${esc(labels.age)}</dt><dd>${dash(child.age)}</dd>
        <dt>${esc(labels.city)}</dt><dd>${dash(child.city)}</dd>
        <dt>${esc(labels.language)}</dt><dd>${dash(child.language ? String(child.language).toUpperCase() : "")}</dd>
        <dt>${esc(labels.university)}</dt><dd>${dash(child.target_university)}</dd>
      </dl>
      <p class="muted">${esc(labels.interests)}</p>
      <div>${interests || "—"}</div>
      <p class="muted">${esc(labels.achievements)}</p>
      <ul>${achievements || "<li>—</li>"}</ul>
    </div>
    <div class="card">
      <p class="h">${esc(labels.portfolio)}</p>
      <div class="quote">${dash(child.portfolio_block)}</div>
    </div>
  </div>

  <h2>${esc(labels.progress)}</h2>
  <div class="card">
    <p>${esc(labels.mastery)}: ${dash(child.snapshot?.mastery)}% · ${esc(labels.accuracy)}: ${dash(child.snapshot?.accuracy)}%</p>
    <p>${esc(labels.weak)}: ${dash(weak)}</p>
  </div>

  <h2>${esc(labels.career)}</h2>
  <p>${dash(child.primaryCareerTitle)}</p>
  <div class="grid">${careers || `<div class="card">—</div>`}</div>

  <h2>${esc(labels.finance)}</h2>
  <div class="grid">
    <div class="card"><p class="muted">${esc(labels.cost)}</p><p class="h">${money(child.financial_route?.monthly_cost)}</p></div>
    <div class="card"><p class="muted">${esc(labels.coverage)}</p><p class="h">${dash(child.financial_route?.coverage_percent)}%</p></div>
    <div class="card"><p class="muted">${esc(labels.gap)}</p><p class="h">${money(child.financial_route?.gap)}</p></div>
  </div>
  <p class="muted">${esc(labels.grants)}</p>
  <ul>${grants || "<li>—</li>"}</ul>
</body>
</html>`;
}
