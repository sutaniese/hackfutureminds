# PathWise / teñ. — фронтенд-модули (`nura`)

Компоненты:

- `ParentDashboard.tsx` — профиль, карьерная карта и финмаршрут **только для чтения**.
- `FinancialCalculator.tsx` — бюджет семьи → gap и подсветка грантов.
- `CareerComparison.tsx` — сравнение «ваша профессия» vs выбор ребёнка через **Gemini API** (прокси в dev).
- `TeacherDashboard.tsx` — классы, **уникальный invite code**, таблица учеников, письмо через **`/api/recommendation-letter`**, **CSV-экспорт** достижений класса.
- **Enterprise**: `TenantThemeContext` + CSS variables (Tailwind `pathwise.*` → `var(--pw-*)`), `EnterpriseHub.tsx`, `EnterpriseAnalytics.tsx` (Recharts), **`POST /api/crm-sync`**, массовый **ZIP** отчётов (`jszip`).

## Бренд по умолчанию (teñ.)

- Фон (cream): `#F5F5DC`, акцент: `#5F7ADB`, текст: `#1A2E40`, вторичный: `#A2B9BC`.
- Логотип: файл **`public/logo.png`** (раздаётся как `/logo.png`).

## Запуск

```bash
cd nura
npm install
npm run dev
```

## Google Gemini API

1. Скопируйте `.env.example` → `.env`.
2. Укажите **`GEMINI_API_KEY`** (или `GOOGLE_API_KEY`). **Не коммитьте** ключ и не вставляйте его в код.
3. При необходимости задайте **`GEMINI_MODEL`** (например `gemini-2.0-flash` или `gemini-1.5-flash`).
4. Перезапустите `npm run dev`.

Запросы dev API (ключ не в клиентском бандле):

- `POST /api/career-compare` — `plugins/careerCompareMiddleware.ts` + `plugins/geminiClient.ts`
- `POST /api/recommendation-letter` — тело `{ "language": "kk"|"ru"|"en", "student": { ...профиль } }`, ответ `{ letter, source }`
- `POST /api/crm-sync` — мок CRM (`plugins/crmSyncMiddleware.ts`), тело `{ "tenant_id"?, "batch_size"? }`.

## PDF

Кнопка «Скачать PDF-отчёт» использует `html2canvas` + `jspdf` и сохраняет содержимое блока `#parent-report-root`.

## Сборка

```bash
npm run build
npm run preview
```

Для статического хостинга без Node нужен отдельный backend для API и защиты ключа Gemini.
