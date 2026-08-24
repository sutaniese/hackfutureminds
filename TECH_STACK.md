# Технологический стек PathWise (teñ)

## Для слайда

**Стек**

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- AI: Groq, Google Gemini
- Данные: localStorage, Supabase
- Mobile: Capacitor (Android)
- Deploy: Vercel

---

Документ ниже — расширенная версия по репозиторию. Источник правды —
`package.json`, конфиги и код, а не внешние планы.

## Обзор

| Слой | Технологии |
|------|------------|
| Язык / runtime | TypeScript 5, Node.js ≥ 20 |
| Монорепо | npm workspaces (`apps/student`, `packages/*`) |
| Веб-приложение | Next.js 15.5 (App Router), React 18.3 |
| Стили | Tailwind CSS 4 (`@import "tailwindcss"`), PostCSS (`@tailwindcss/postcss`) |
| Шрифты | `next/font/google`: Inter, Plus Jakarta Sans, Lora |
| Мобильная оболочка | Capacitor 6 (Android, `com.pathwise.student`) |
| Хостинг | Vercel (`vercel.json`, framework `nextjs`) |
| Данные в браузере | `localStorage` / `sessionStorage` (аккаунты, прогресс, сессии) |
| Данные грантов | Supabase (Postgres REST) + JSON-fallback в репозитории |
| AI | Groq (чат + транскрипция), Google Gemini (портал), Anthropic Claude (офлайн-очистка грантов) |
| Локальная «память» агента | Файловый vault в стиле Obsidian (`ten-vault/`) |

Отдельного production-backend (Nest, Django и т.п.) нет: серверная логика —
Route Handlers Next.js. Учётные записи и учебный прогресс живут в браузере до
появления удалённого API.

## Структура репозитория

```
pathwise/
├─ apps/student/          # единственное пользовательское приложение
├─ packages/shared/       # @pathwise/shared — типы, бренд, контракты
└─ sutaniese/             # пайплайн каталога грантов (не npm workspace)
```

Корневые скрипты (`npm run dev` / `build`) делегируют в workspace
`apps/student`. Пакет `sutaniese` в workspaces не входит: это набор Node-скриптов
рядом с приложением.

## Frontend

- **Next.js 15.5.15**, App Router (`src/app`), Route Handlers (`src/app/api`).
- **React 18.3.1** + **React DOM 18.3.1**.
- **TypeScript** (`strict: true`, `moduleResolution: bundler`, JSX preserve).
- Алиасы: `@/*` → `src/*`, пакет `@pathwise/shared` через workspace и `paths`.
- **Tailwind CSS 4** с CSS-переменными бренда в `src/app/globals.css`.
- Локализация интерфейса **RU / KK / EN** (`src/i18n`), без i18next: таблица
  строк + `localStorage`.
- Графики: **Recharts** (аналитика Enterprise).
- PDF/ZIP: **html2canvas**, **jsPDF**, **JSZip** (отчёты для родителей).
- TTS в учебном контуре: **Web Speech API** (`src/lib/speech.ts`).
- Состояние: React Context + локальные сторы; глобального Redux/Zustand нет.

Страницы студента и B2B-хаба (`/hub/*`) — одно origin-приложение
(`http://localhost:3000`). Отдельного Vite-портала больше нет.

## Backend (внутри Next.js)

Все HTTP-эндпоинты — App Router + Node.js runtime. Ключевые группы:

| Префикс | Назначение |
|---------|------------|
| `/api/learning/*` | разбор задания, план, AI-репетитор |
| `/api/generate` | карьерная карта / финмаршрут / портфолио |
| `/api/voice-*` | транскрипция и голосовые команды |
| `/api/v1/grants` | живой каталог грантов (Supabase REST) |
| `/api/agent`, `/api/students`, `/api/classes` | RAG-агент и CRM-подобные сущности |
| `/api/career-compare`, `/api/recommendation-letter` | Gemini-сценарии хаба |

Плагины портала (`src/server/portal-plugins/`) вызываются из Route Handlers.
`next.config.ts` задаёт `outputFileTracingRoot` на корень монорепо и
`transpilePackages: ["@pathwise/shared"]` для деплоя с Root Directory
`apps/student`.

## AI-слой

| Провайдер | Как вызывается | Где используется | Модель по умолчанию |
|-----------|----------------|------------------|---------------------|
| **Groq** | OpenAI-совместимый HTTP (`/openai/v1/chat/completions`, `/audio/transcriptions`) | обучение, `/api/generate`, голос, документы | `llama-3.3-70b-versatile`; аудио — Whisper-семейство (`GROQ_AUDIO_MODEL`) |
| **Google Gemini** | Generative Language REST (`v1beta/...:generateContent`) | сравнение карьер, рекомендательные письма, агент хаба | `gemini-3-flash-preview` (`GEMINI_MODEL`) |
| **Anthropic Claude** | Messages API | скрипт очистки сырых грантов `sutaniese/scripts/clean-grants-with-claude.js` | не часть runtime приложения |

Учебные маршруты Groq **не падают** без ключа: таймаут/сеть/отсутствие
`GROQ_API_KEY` → детерминированный fallback в коде. Интерфейс помечает источник
(«Разбор от AI» vs «Разбор из базы»).

Переменные: `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_AUDIO_MODEL`, `GEMINI_API_KEY`
или `GOOGLE_API_KEY`.

## Данные и хранение

**Клиент (MVP)**

- Аккаунты: `localStorage`, пароль не хранится — **PBKDF2-SHA256** (Web Crypto,
  200k итераций). Это не серверная аутентификация.
- Учебный прогресс, геймификация, локаль, тема — `localStorage`.
- Онбординг и последний `/api/generate` — `sessionStorage`.
- Учебный каталог (предметы, темы, задания) — статический TypeScript в
  `src/lib/learning/catalog/`.

**Сервер / внешние сервисы**

- **Supabase Postgres** через REST (`/rest/v1/grants`) в `grants-live-query.ts`.
  Клиент `@supabase/supabase-js` стоит в `sutaniese`, не в `apps/student`.
- Fallback грантов: `apps/student/api/grants.json`.
- Vault агента: каталог `ten-vault/` (JSON + Markdown в духе Obsidian) —
  локально на диске dev-сервера, не облачная БД.

## Мобильное приложение

- **Capacitor 6.2** (`@capacitor/core`, CLI, `@capacitor/android`).
- Android: `minSdk 22`, `compileSdk` / `targetSdk 34`, applicationId
  `com.pathwise.student`.
- `webDir: www`; опционально live-reload через `CAPACITOR_SERVER_URL`.
- Сборка debug APK: `npm run android:build-apk-desktop` в `apps/student`.
- Нативного iOS-проекта в репозитории нет.

## Инфраструктура и качество

- **Vercel**: `installCommand` из корня монорепо (`npm install --legacy-peer-deps`),
  увеличенный `maxDuration` для голосовых маршрутов (30–60 с).
- **ESLint 9** + `eslint-config-next` 15.5 (flat config, Core Web Vitals).
- Typecheck: `tsc --noEmit`.
- Автотестов приложения (Jest/Vitest/Playwright) нет; есть шаблонные JUnit /
  Espresso-классы в Android-проекте Capacitor.
- CI в `.github/` отсутствует.

## Вспомогательный пакет `@pathwise/shared`

Чистый TypeScript без runtime-зависимостей:

- бренд и палитра;
- кросс-маршрутные URL (`/hub`, student paths);
- контракт `POST /api/generate`;
- типы вузов и грантов.

## Пайплайн грантов (`sutaniese/`)

Независимый Node-пакет `sutaniese-grants-pipeline`:

| Скрипт | Роль |
|--------|------|
| `clean` | нормализация сырых записей через Anthropic |
| `seed` | загрузка в таблицу `grants` (Supabase service role) |
| `refresh` | обновление каталога |

SQL: `sutaniese/scripts/create-grants-table.sql`.

## Что сознательно не используется

Нет отдельного ORM, Redis, очередей, GraphQL, Redux, i18next, Prisma, Clerk.
Нет Python/Go-сервисов. Учебная персонализация — детерминированный TypeScript
(`recommend.ts`), AI только поверх расчёта и в чате/разборе.
