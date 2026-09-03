# Supabase (live demo)

One project. Same email + password on the website and in Expo Go.

## 1. Paste SQL

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Paste the entire file `supabase/SETUP.sql`.
3. Run it once. It is idempotent — safe to run again.

That creates profiles (with role), classes, membership, invite RPC, learning progress, published topics (homework), class deadlines, parent↔child links, clip events, and RLS.

## 2. Env vars

**Turn OFF Confirm email** (Authentication → Providers → Email) so Expo Go and the web demo can sign in right after register.

| Where | Name | Value |
| --- | --- | --- |
| Vercel (`apps/student`) | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| Vercel (`apps/student`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |
| Expo (`apps/mobile`) | `EXPO_PUBLIC_SUPABASE_URL` | Same Project URL |
| Expo (`apps/mobile`) | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same `anon` / publishable key |

Do not put `service_role` in Vercel `NEXT_PUBLIC_*`, Expo `EXPO_PUBLIC_*`, or any client bundle.

Redeploy Vercel after saving env vars. Restart Expo (`npx expo start`) after changing `EXPO_PUBLIC_*`.

## 3. Cross-device check

1. Register a student on the phone (same project).
2. Log in on https://buzhai.nurakhmet.info/ with that email and password.
3. Join a class, save progress, watch a clip.
4. Open the other device: class name, teacher, classmate count, homework, deadlines, progress, and clip history should match.
5. Reverse: register on the web, log in on the phone.
