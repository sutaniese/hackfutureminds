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
│  └─ portal/            # Vite + React 18 — B2B портал (dev :5174, base `/hub/`)
│                        # В «одном сайте» открывается как http://localhost:3000/hub/…
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

## Один сайт (один origin)

В разработке **всё открывается с `http://localhost:3000`**: Next.js — основной
хост, портал Vite смонтирован под префиксом **`/hub`** (например
`/hub/agent`, `/hub/vuzy`). Next проксирует:

- `GET /hub/*` → Vite (`PORTAL_PROXY_URL`, по умолчанию `http://127.0.0.1:5174`)
- `POST/GET …` портальных API (`/api/career-compare`, `/api/recommendation-letter`,
  `/api/crm-sync`, `/api/agent/*`, `/api/students*`, `/api/classes*`) → тот же Vite

Студенческие маршруты Next (`/`, `/onboarding`, `/api/generate`, `/api/health`)
не пересекаются с портальными API.

Запуск одной командой из корня:

```powershell
npm install   # один раз, подтянет concurrently
npm run dev   # параллельно student + portal; в браузере только :3000
```

Прямой заход на `http://localhost:5174/hub/…` по-прежнему возможен для отладки
Vite (HMR WebSocket идёт на `:5174`).

**Раздельный деплой:** задайте `NEXT_PUBLIC_PORTAL_URL` (абсолютный URL портала)
в student и `VITE_STUDENT_URL` в portal — тогда ссылки в `@pathwise/shared/links`
ведут на разные origin’ы.

## Логические связи между приложениями

| Связь | Где живёт | Что делает |
|-------|-----------|------------|
| `apps/student → /results` показывает CTA в `apps/portal` | `apps/student/src/components/results/CrossAppPromo.tsx` | Три карточки: Родители · Учителя · Каталог вузов (по умолчанию пути `/hub/…`) |
| `apps/portal` шапка ведёт обратно на онбординг | `apps/portal/src/components/AppLayout.tsx` | Кнопка «Онбординг ученика →» на тот же origin (`/onboarding`) |
| Контракт `POST /api/generate` единый для обоих | `packages/shared/src/generate-contract.ts` | Зеркалит `apps/student/src/types/generate.ts` |
| Каталог вузов из portal доступен student | `packages/shared/src/universities.ts` (типы), `apps/portal/src/data/universities.ts` (данные) | На страницах карьерных карт можно показать «Где учат» |
| Гранты из student доступны родителям | `packages/shared/src/grants.ts` (тип), `apps/student/api/grants.json` (данные) | Финкалькулятор в `apps/portal/src/components/FinancialCalculator.tsx` |
| Бренд (название, палитра) общий | `packages/shared/src/brand.ts` | Заголовки, PDF-отчёты, README |

## Запуск локально

```powershell
cd C:\Users\Alpha\Desktop\issa
npm install                # ставит зависимости всех workspace-пакетов
npm run dev                # рекомендуется: оба процесса; в браузере http://localhost:3000 и /hub/…
# либо по отдельности:
npm run dev:student        # http://localhost:3000  (Next.js + прокси на portal)
npm run dev:portal         # http://localhost:5174  (Vite; портал под /hub/)
npm run build              # build:student && build:portal
```

В каждом приложении свой `.env`. См. `apps/student/.env.example` и
`apps/portal/.env.example`. Опциональные переменные:

| Переменная | Где | Назначение |
|------------|-----|------------|
| `PORTAL_PROXY_URL` | `apps/student/.env` (или env процесса) | Куда Next проксирует `/hub` и портальные `/api/*` (по умолчанию `http://127.0.0.1:5174`) |
| `NEXT_PUBLIC_PORTAL_URL` | `apps/student/.env` | Только для **раздельного** деплоя: абсолютный URL портала вместо путей `/hub/…` |
| `VITE_STUDENT_URL` | `apps/portal/.env` | Только если student на другом origin; иначе ссылки относительные (`/onboarding`) |
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
