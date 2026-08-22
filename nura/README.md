# ten — фронтенд-модули (`nura`)

Полнофункциональный MVP: онбординг учеников, родительский/учительский/Enterprise-модули
и **персональный AI-наставник на Gemini с памятью в Obsidian-vault**.

## Маршруты

- `/agent` — AI-наставник (чат + заметки) ⟵ **главная**
- `/uchenik` — онбординг и редактирование учеников
- `/roditeli` — родительский модуль (read-only + PDF)
- `/uchitelya` — учительский модуль (классы, invite, рек. письма, CSV)
- `/enterprise` — B2B / ЕНТ-центры (white-label, аналитика, CRM, bulk-отчёты)

## Деплой (Vercel) и 404

Это **Vite + React Router (SPA)**. В продакшене на Vercel без rewrites путь вроде `/agent` не соответствует физическому файлу в `dist/`, и сервер отдаёт **404**. В корне модуля есть `vercel.json` с `rewrites` на `index.html` (как в [доке Vercel](https://vercel.com/docs/rewrites) / SPA-гайдах). В **Project Settings** укажите **Root directory** = `nura` (папка с `package.json` **относительно** репозитория, без `C:\` и без `\package.json`).

`plugins/*` (REST `/api/...`) работают **только в `npm run dev`**. Статичный `vite build` на Vercel не поднимает этот middleware: запросы к `/api/*` в production не к хосту-разработчика приведут к 404, если нет отдельного backend.

## Архитектура

```
nura/
├─ ten-vault/                       ← persistent store + Obsidian-vault (gitignored)
│  ├─ db.json                       ← students/classes/conversations
│  ├─ students/<id>/profile.md      ← Obsidian-страница ученика (память агента)
│  ├─ students/<id>/notes/*.md      ← writable заметки
│  └─ classes/<id>.md               ← обзор класса
├─ plugins/                         ← Vite-middleware (dev backend)
│  ├─ vaultStore.ts                 ← JSON+MD persistence
│  ├─ studentsApiMiddleware.ts      ← REST CRUD
│  ├─ agentMiddleware.ts            ← Gemini chat (RAG по vault)
│  ├─ careerCompareMiddleware.ts    ← /api/career-compare
│  ├─ recommendationLetterMiddleware.ts
│  ├─ crmSyncMiddleware.ts          ← /api/crm-sync (мок)
│  └─ geminiClient.ts
└─ src/                             ← React + Vite + TS
```

## REST API (dev)

| Метод+путь | Что делает |
|---|---|
| `GET /api/health` | живость |
| `GET /api/students` | список учеников |
| `POST /api/students` | upsert |
| `GET/PUT/DELETE /api/students/:id` | по одному |
| `GET/POST /api/students/:id/notes` | список/создание заметки (Obsidian) |
| `GET/DELETE /api/students/:id/notes/:fileName` | чтение/удаление заметки |
| `GET/POST/DELETE /api/classes[/:id]` | классы |
| `POST /api/classes/join` | привязка ученика к классу по invite-коду |
| `POST /api/agent/chat` | сообщение агенту (RAG по vault) |
| `GET /api/agent/history?studentId=…` | история чата |
| `POST /api/agent/clear` | очистить чат |
| `POST /api/career-compare` | сравнение профессий |
| `POST /api/recommendation-letter` | рек. письмо |
| `POST /api/crm-sync` | мок CRM sync |

## AI-агент (Gemini + Obsidian)

- Каждое сообщение ученика разогревается **системным промптом + profile.md + всеми
  заметками из `notes/`** этого ученика → отправляется в **Gemini**
  (модель `gemini-3-flash-preview`, переопределяется `GEMINI_MODEL`).
- Агент умеет «запоминать» по команде: если ответ содержит блок
  `<<SAVE_NOTE title="…">>…<<END_NOTE>>`, бэкенд автоматически сохраняет заметку
  в `students/<id>/notes/`. На фронте в чате появится `🗒 Сохранено в …`.
- История диалога per-student хранится в `db.json` и переживает перезагрузку.
- Без `GEMINI_API_KEY` агент работает в `fallback`-режиме (не падает).

Vault можно **открыть в Obsidian**: указать `nura/ten-vault` как vault
(или сделать симлинк) — graph и backlinks сразу подхватятся.

## Бренд по умолчанию

- Фон `#F5F5DC`, акцент `#5F7ADB`, текст `#1A2E40`, вторичный `#A2B9BC`.
- Логотип: `public/logo.png` → `/logo.png`.
- White-label: `src/enterprise/tenantConfig.ts` + CSS-переменные.

## Запуск

```bash
cd nura
npm install
cp .env.example .env  # вставить GEMINI_API_KEY
npm run dev           # http://localhost:5173 (или 5174)
```

При первом старте создастся `ten-vault/` с двумя демо-учениками и одним классом.

## Сборка

```bash
npm run build
npm run preview
```
