# SLA Frontend

Next.js dashboard for Jira SLA tracking — live ticket board, breach alerts, and Supabase auth.

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

## Routes

- `/` — Landing + sign in
- `/dashboard` — SLA overview
- `/dashboard/tickets` — All tickets
- `/dashboard/breaches` — SLA breaches
- `/auth/callback` — OAuth callback
