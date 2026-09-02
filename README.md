# PathWise (teñ.)

Публичный бренд — **teñ.** Пакет `@pathwise/shared` не переименовывали. Живой сайт: https://buzhai.nurakhmet.info/

Архитектура (Supabase / Groq / Gemini / движок / клипы / env): **[ARCHITECTURE.md](./ARCHITECTURE.md)**. Цитаты для питча не выдумывать: [docs/QUOTES.md](./docs/QUOTES.md).

AI-платформа персонализированного обучения для школьников Казахстана 7–12
классов. Ученик проходит короткую диагностику, получает подобранные под свой
уровень темы и задания с разбором от AI, а учитель видит прогресс класса и
может добавлять свои материалы. Поверх учебного ядра работает карьерный слой:
карьерная карта, финансовый маршрут и упакованное портфолио.

## Структура монорепо

```
issa/
├─ apps/
│  └─ student/           # Единое Next.js 15 приложение (port :3000)
│                         # /, /learning, /onboarding, /results, /grants, /portfolio
│                         # /hub/agent, /hub/vuzy, /hub/roditeli,
│                         # /hub/uchitelya, /hub/obuchenie, /hub/enterprise
│                         # src/lib/learning/ — учебное ядро (каталог, стор, персонализация)
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

## Учебное ядро

Основной пользовательский путь: **диагностика → рекомендации → задания с
обратной связью → прогресс → панель учителя**.

| Экран | Путь | Что делает |
|-------|------|------------|
| Главная | `/` | Ценностное предложение и CTA «Начать обучение» / «Пройти диагностику» |
| Диагностика | `/learning/diagnostics` | Профиль (класс 7–12, предмет, цели, дата экзамена, минуты в день) и 8 адаптивных вопросов |
| Кабинет ученика | `/learning` | Прогресс по темам, слабые места, дедлайны, план подготовки |
| Тема | `/learning/topic/[topicId]` | Конспект, материалы, адаптивные задания с разбором, AI-репетитор |
| Панель учителя | `/hub/obuchenie` | Свод по классу, проблемные темы, CSV-выгрузка, конструктор тем и заданий |

### Как устроена персонализация

- `src/lib/learning/catalog/` — контент MVP: 7 предметов, 17 тем, 85 заданий
  трёх уровней сложности. У каждой темы есть конспект, материалы и список
  микро-навыков; каждое задание содержит разбор.
- `src/lib/learning/recommend.ts` — детерминированный движок: адаптивный подбор
  вопросов диагностики, расчёт уровня с весом сложности, ранжирование тем по
  пробелам / классу / цели, поиск слабых навыков и сборка плана подготовки.
- `src/lib/learning/store.ts` — прогресс в `localStorage`: профиль, результат
  диагностики, состояние тем (решённые задания, текущая сложность, серия
  верных ответов), лента попыток, темы учителя и журнал класса.
- Адаптивная сложность: два верных ответа подряд повышают уровень темы,
  ошибка — понижает. Диагностика двигает сложность после каждого вопроса.

### Дополнительные функции

- **Интервальное повторение.** `reviewQueue` возвращает темы, к которым давно
  не возвращались: слабую тему — через 3 дня, освоенную — через 7. Результат
  показывается баннером напоминаний в кабинете.
- **Напоминания о дедлайне.** За 30 дней до даты цели в кабинете появляется
  countdown, за 14 дней тон меняется на срочный.
- **Геймификация.** Учебные значки поверх существующей системы XP:
  «Уровень определён» (диагностика), «Тема закрыта» (100% по теме),
  «Марафон» (10 решённых заданий), «Пробел закрыт» (навык вышел из слабых мест).
  XP за задание зависит от его сложности.
- **Озвучка (TTS).** Кнопки «Прослушать конспект» и «Прослушать задание» на
  странице темы — Web Speech API, язык берётся из текущей локали
  (`src/lib/speech.ts`, общий помощник с голосовым ассистентом).
- **Мультиязычный интерфейс.** Навигация и общие строки — RU / KK / EN
  (`src/i18n/messageTable.ts`); учебный контент MVP на русском.
- **Адаптивная вёрстка.** Нижняя навигация и все учебные экраны проверены на
  ширине 375px без горизонтального скролла.

### AI-слой

| Маршрут | Назначение |
|---------|------------|
| `POST /api/learning/feedback` | Персональный разбор ответа на задание |
| `POST /api/learning/plan` | Текст плана подготовки поверх локального расчёта |
| `POST /api/learning/tutor` | AI-репетитор в контексте конспекта темы |

Все три маршрута работают через Groq (`GROQ_API_KEY`) и **никогда не падают**:
без ключа, при таймауте или ошибке сети они возвращают детерминированный
fallback. Интерфейс честно помечает источник ответа — «Разбор от AI» или
«Разбор из базы». Демонстрация полностью работает без ключа.

### Тестовые данные

- Каталог тем и заданий — статичный контент в репозитории.
- Журнал класса в панели учителя содержит 6 демо-учеников (`DEMO_ROSTER`),
  чтобы статистика была осмысленной до входа реальных аккаунтов. Реальные
  ученики этого браузера добавляются в таблицу после диагностики и помечаются
  отдельно от демо-строк.
- Аккаунты и прогресс хранятся в `localStorage` — backend появится позже,
  контракт функций стора при этом не меняется.

## Один проект, один origin

В разработке **всё открывается с `http://localhost:3000`**. Student и portal
теперь живут в одной папке `apps/student` и в одном Next-приложении:

- student shell: `/`, `/learning`, `/onboarding`, `/results`, `/grants`, `/portfolio`;
- portal hub: `/hub/agent`, `/hub/vuzy`, `/hub/uchenik`, `/hub/roditeli`,
  `/hub/uchitelya`, `/hub/obuchenie`, `/hub/enterprise`;
- portal API: `/api/career-compare`, `/api/recommendation-letter`,
  `/api/crm-sync`, `/api/agent/*`, `/api/students*`, `/api/classes*`;
- учебное API: `/api/learning/feedback`, `/api/learning/plan`,
  `/api/learning/tutor`.

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
| `GROQ_API_KEY` | `apps/student/.env` | Опционально: вместо детерминированного fallback в `/api/generate` и `/api/learning/*` |

## Покрытие техзадания

- Учебное ядро (диагностика, персонализация, задания, кабинет) →
  `apps/student/src/lib/learning`, `apps/student/src/components/learning`
- Панель учителя по обучению → `apps/student/src/portal/pages/LearningAdminPage.tsx`
- §3 Школьник core → `apps/student`
- §16.1 Родители → `apps/student/src/portal/pages/ParentsPage.tsx`
- §16.2 Учителя → `apps/student/src/portal/pages/TeachersPage.tsx`
- §16.3 Enterprise / ЕНТ-центры → `apps/student/src/portal/pages/EnterprisePage.tsx`
- Каталог вузов и страница вуза → `apps/student/src/portal/pages/Universities*.tsx`
- AI-наставник (RAG над Obsidian-вольтом) → `apps/student/src/portal/pages/AgentPage.tsx`
