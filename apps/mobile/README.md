# teñ. — Expo Go app

Native React Native / Expo Router client for the teñ. learning product. It is **not** a WebView of the Next.js site. Open it in **Expo Go on iPhone** (App Store Expo Go = SDK 54).

## 1. Install Expo Go

On iPhone, install **Expo Go** from the App Store. That store build speaks **Expo SDK 54**. This app is pinned to SDK 54 so the QR will open.

## 2. Install and start

From the monorepo root, or from this folder:

```bash
cd apps/mobile
npm install
npx expo start
```

Workspace install from the repo root also works (`npm install` then `npm run start --workspace apps/mobile`).

## 3. Scan the QR

Scan the QR with the Camera app / Expo Go. If the phone is not on the same LAN as the laptop:

```bash
npx expo start --tunnel
```

No App Store binary, no EAS production build, and no custom native code are required.

## 4. Environment variables

Copy `.env.example` to `.env` (do not commit secrets):

| Variable | Default / purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://buzhai.nurakhmet.info` — production Next.js API so a phone on cellular can reach the live backend |
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase project as the web app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon / publishable key as the web app |

- With Supabase env set: login/register uses the **same** Auth + `profiles` table as web. Protected routes (`/api/classes`, `/api/learning/class`, live board) send `Authorization: Bearer <access_token>`.
- Without Supabase env: accounts stay on this phone (local fallback, same idea as the web local-auth path). Public AI routes still hit production. Class join is saved locally and labelled as device-only — we do not invent a second backend.

There is no `/api/login` on the web app. Do not put service-role keys in this client.

## Demo script (Expo Go)

1. Teacher: web `https://buzhai.nurakhmet.info/hub/uchitelya` **or** this app → Кабинет → create a class → copy `TN-XXXXXX`.
2. Student: Expo Go → register as ученик → **Мой класс** → paste the code → join.
3. Student: **Диагностика** → class 7–12, subject, goal **Олимпиада** → 8 questions.
4. Student: **Карта** — olympiad track (not ЕНТ). **Клипы** — 3 baked clips + live generate, captions, TTS (`expo-speech`), one quiz.

## Layout

`apps/mobile` is a workspace next to `apps/student`. Learning engines (catalog, recommend, roadmap, clips) are copied TypeScript with no Next/DOM imports. Chrome strings use the same `messageTable` / `chromeMessages` keys (ru / қа / en, default ru).
