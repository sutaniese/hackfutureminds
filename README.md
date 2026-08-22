# PathWise (teñ)

AI-навигатор поступления и карьеры для школьников Казахстана. Один разговор —
три готовых артефакта: карьерная карта, финансовый маршрут, упакованное
портфолио. Платформа покрывает четыре пользовательских сегмента из ТЗ:
**школьник** (core), **родитель**, **учитель**, **Enterprise / ЕНТ-центр**.

## Структура монорепо

```
issa/
├─ apps/
│  ├─ student/           # Next.js 15 + Tailwind v4 — student core (port :3000)
│  │                      # /onboarding (7 шагов) → /api/generate → /results
│  │                      # /grants, /portfolio, /accessibility
│  │                      # См. apps/student/README.md и student_dev_EN.md
│  └─ portal/            # Vite + React 18 — B2B портал (port :5174)
│                        # /agent (AI-наставник на Gemini + Obsidian-вольт)
│                        # /vuzy + /vuzy/:id (каталог 30+ вузов)
│                        # /uchenik (CRUD карточек учеников)
│                        # /roditeli (дашборд + финкалькулятор + сравнение профессий)
│                        # /uchitelya (классы + рекомендательные письма)
│                        # /enterprise (white-label + ROI-трекер + CRM-sync)
│                        # См. apps/portal/README.md
└─ packages/
   └─ shared/            # @pathwise/shared — общие типы и токены
                         #   ./brand   — название продукта, палитра
                         #   ./links   — кросс-app URL и пути
                         #   ./generate — контракт POST /api/generate
                         #   ./universities — типы каталога
                         #   ./grants  — тип GrantRecord
```

## Логические связи между приложениями

| Связь | Где живёт | Что делает |
|-------|-----------|------------|
| `apps/student → /results` показывает CTA в `apps/portal` | `apps/student/src/components/results/CrossAppPromo.tsx` | Три карточки: Родители · Учителя · Каталог вузов |
| `apps/portal` шапка ведёт обратно на онбординг | `apps/portal/src/components/AppLayout.tsx` | Кнопка «Онбординг ученика →» |
| Контракт `POST /api/generate` единый для обоих | `packages/shared/src/generate-contract.ts` | Зеркалит `apps/student/src/types/generate.ts` |
| Каталог вузов из portal доступен student | `packages/shared/src/universities.ts` (типы), `apps/portal/src/data/universities.ts` (данные) | На страницах карьерных карт можно показать «Где учат» |
| Гранты из student доступны родителям | `packages/shared/src/grants.ts` (тип), `apps/student/api/grants.json` (данные) | Финкалькулятор в `apps/portal/src/components/FinancialCalculator.tsx` |
| Бренд (название, палитра) общий | `packages/shared/src/brand.ts` | Заголовки, PDF-отчёты, README |

## Запуск локально

```powershell
cd C:\Users\Alpha\Desktop\issa
npm install                # ставит зависимости всех workspace-пакетов
npm run dev:student        # http://localhost:3000  (Next.js)
npm run dev:portal         # http://localhost:5174  (Vite)
npm run build              # build:student && build:portal
```

В каждом приложении свой `.env`. См. `apps/student/.env.example` и
`apps/portal/.env.example`. Опциональные переменные:

| Переменная | Где | Назначение |
|------------|-----|------------|
| `NEXT_PUBLIC_PORTAL_URL` | `apps/student/.env` | Базовый URL portal для CTA на `/results` |
| `VITE_STUDENT_URL` | `apps/portal/.env` | Базовый URL student для кнопки «Онбординг» |
| `GEMINI_API_KEY` | `apps/portal/.env` | Ключ для AI-наставника и `/api/career-compare` |
| `GROQ_API_KEY` | `apps/student/.env` | Опционально: вместо детерминированного fallback в `/api/generate` |

## Покрытие техзадания (`apps/portal/technical_task.md`)

- §3 Школьник core → `apps/student`
- §16.1 Родители → `apps/portal/src/pages/ParentsPage.tsx`
- §16.2 Учителя → `apps/portal/src/pages/TeachersPage.tsx`
- §16.3 Enterprise / ЕНТ-центры → `apps/portal/src/pages/EnterprisePage.tsx`
- Каталог вузов и страница вуза → `apps/portal/src/pages/Universities*.tsx`
- AI-наставник (RAG над Obsidian-вольтом) → `apps/portal/src/pages/AgentPage.tsx`

## Известные ограничения

`apps/student` в текущем состоянии падает на `next build` при prerender
страниц `/404`/`/500` с минифицированной React-ошибкой #31 (объект как нода).
Ошибка пришла с upstream-обновлением `sutaniese` и не связана с миграцией в
монорепо. На dev-сервере и в runtime приложение работает корректно. Полный
билд `apps/portal` проходит успешно. Чинить нужно в client-компонентах
`A11yTopBar`, `MobileAppShell` или конфигурации `next/font` (требует отдельной
итерации).
