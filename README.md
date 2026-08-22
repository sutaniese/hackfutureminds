# PathWise (teñ)

AI-навигатор поступления и карьеры для школьников Казахстана. Один разговор —
три готовых артефакта: карьерная карта, финансовый маршрут, упакованное
портфолио. Платформа покрывает четыре пользовательских сегмента из ТЗ:
**школьник** (core), **родитель**, **учитель**, **Enterprise / ЕНТ-центр**.

## Структура монорепо

```
issa/
├─ apps/
│  └─ student/           # Единое Next.js 15 приложение (port :3000)
│                         # /, /onboarding, /results, /grants, /portfolio
│                         # /hub/agent, /hub/vuzy, /hub/roditeli,
│                         # /hub/uchitelya, /hub/enterprise
│                         # src/portal/ — бывший portal UI, теперь внутри Next
│                         # src/server/portal-plugins/ — бывшие portal API middleware
└─ packages/
   └─ shared/            # @pathwise/shared — общие типы и токены
                         #   ./brand   — название продукта, палитра
                         #   ./links   — кросс-app URL и пути
                         #   ./generate — контракт POST /api/generate
                         #   ./universities — типы каталога
                         #   ./grants  — тип GrantRecord
```

## Один проект, один origin

В разработке **всё открывается с `http://localhost:3000`**. Student и portal
теперь живут в одной папке `apps/student` и в одном Next-приложении:

- student shell: `/`, `/onboarding`, `/results`, `/grants`, `/portfolio`;
- portal hub: `/hub/agent`, `/hub/vuzy`, `/hub/uchenik`, `/hub/roditeli`,
  `/hub/uchitelya`, `/hub/enterprise`;
- portal API: `/api/career-compare`, `/api/recommendation-letter`,
  `/api/crm-sync`, `/api/agent/*`, `/api/students*`, `/api/classes*`.

Запуск одной командой из корня:

```powershell
npm install
npm run dev   # одно Next-приложение; в браузере http://localhost:3000
```

Отдельного Vite portal больше нет: все страницы `/hub/*` рендерит Next.

## Логические связи между приложениями

| Связь | Где живёт | Что делает |
|-------|-----------|------------|
| `apps/student → /results` показывает CTA в hub | `apps/student/src/components/results/CrossAppPromo.tsx` | Три карточки: Родители · Учителя · Каталог вузов (пути `/hub/…`) |
| `/hub` шапка ведёт обратно на онбординг | `apps/student/src/portal/components/AppLayout.tsx` | Кнопка «Онбординг ученика →» на тот же origin (`/onboarding`) |
| Контракт `POST /api/generate` единый для обоих | `packages/shared/src/generate-contract.ts` | Зеркалит `apps/student/src/types/generate.ts` |
| Каталог вузов из hub доступен student | `packages/shared/src/universities.ts` (типы), `apps/student/src/portal/data/universities.ts` (данные) | На страницах карьерных карт можно показать «Где учат» |
| Гранты из student доступны родителям | `packages/shared/src/grants.ts` (тип), `apps/student/api/grants.json` (данные) | Финкалькулятор в `apps/student/src/portal/components/FinancialCalculator.tsx` |
| Бренд (название, палитра) общий | `packages/shared/src/brand.ts` | Заголовки, PDF-отчёты, README |

## Запуск локально

```powershell
cd C:\Users\Alpha\Desktop\issa
npm install                # ставит зависимости всех workspace-пакетов
npm run dev                # http://localhost:3000 и /hub/…
npm run build              # сборка единого Next-приложения
```

Переменные окружения лежат в `apps/student/.env`. Опциональные переменные:

| Переменная | Где | Назначение |
|------------|-----|------------|
| `NEXT_PUBLIC_PORTAL_URL` | `apps/student/.env` | Обычно не нужен; для внешнего portal origin вместо путей `/hub/…` |
| `NEXT_PUBLIC_STUDENT_URL` | `apps/student/.env` | Обычно не нужен; для внешнего student origin |
| `GEMINI_API_KEY` | `apps/student/.env` | Ключ для AI-наставника и `/api/career-compare` |
| `GROQ_API_KEY` | `apps/student/.env` | Опционально: вместо детерминированного fallback в `/api/generate` |

## Покрытие техзадания

- §3 Школьник core → `apps/student`
- §16.1 Родители → `apps/student/src/portal/pages/ParentsPage.tsx`
- §16.2 Учителя → `apps/student/src/portal/pages/TeachersPage.tsx`
- §16.3 Enterprise / ЕНТ-центры → `apps/student/src/portal/pages/EnterprisePage.tsx`
- Каталог вузов и страница вуза → `apps/student/src/portal/pages/Universities*.tsx`
- AI-наставник (RAG над Obsidian-вольтом) → `apps/student/src/portal/pages/AgentPage.tsx`
