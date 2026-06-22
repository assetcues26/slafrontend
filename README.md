# SLA Frontend

Next.js dashboard for Assetcues Support — SLA tracking, breach alerts, and Supabase auth (email/password + OTP signup, Google).

**Frontend only.** The backend API lives in a separate repo: https://github.com/assetcues26/slabackenmd

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase and API URLs
```

## Environment variables (Vercel)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL ending in `/v1` |

## Deploy on Vercel

1. Import https://github.com/assetcues26/slafrontend
2. **Root Directory:** `apps/web`
3. Install/build commands are in `apps/web/vercel.json` (runs from monorepo root)
4. Add the three `NEXT_PUBLIC_*` env vars
5. In Supabase → Auth → URL Configuration, add:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

## Auth (Supabase)

- **Sign up:** full name, username, email, password → email OTP verification
- **Sign in:** email + password or Google OAuth
- User profiles are stored in Supabase `profiles` table (username, full name, email)

Enable **Email** provider in Supabase → Authentication → Providers. Confirm email / OTP must be enabled for signup verification.

## Routes

- `/` — Landing + sign in / sign up
- `/login` — Same auth page
- `/dashboard` — SLA overview
- `/dashboard/tickets` — All tickets
- `/dashboard/breaches` — SLA breaches
- `/auth/callback` — OAuth / email confirmation callback
