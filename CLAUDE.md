# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build     # Production build
npm run start     # Run production build
```

No test runner or linter is configured.

## Git Workflow

After every meaningful change, commit and push to GitHub immediately — never let working changes sit uncommitted.

```bash
git add <specific-files>
git commit -m "feat|fix|refactor: short description of what changed and why"
git push origin master
```

Commit message conventions:
- `feat:` — new feature or capability
- `fix:` — bug fix
- `refactor:` — code restructure without behavior change
- `chore:` — config, deps, tooling

One logical change per commit. Never batch unrelated changes into one commit. This ensures every version in git history is a clean, recoverable snapshot.

## Environment Setup

Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_ADMIN_SECRET=your-secret
```

Run `supabase/schema.sql` in the Supabase SQL editor once to create tables and enable Realtime.

Access admin mode via `/?admin=YOUR_SECRET`.

## Architecture

Single-page Next.js 16 app (`app/page.tsx`) — no routing beyond the root. All data mutations go through API routes; the client never calls Supabase directly.

**Data flow:**
- `app/page.tsx` — dashboard, subscribes to Supabase Realtime for live updates on `classes` and `registrations` tables
- `app/api/classes/route.ts` — GET (future classes + confirmed counts), POST (overlap check in app layer), DELETE
- `app/api/registrations/route.ts` — GET by phone, POST (capacity check, re-activation of cancelled rows), DELETE (soft-delete → sets `status='cancelled'`)
- `app/api/export/route.ts` — CSV download; `?history=true` returns all-time registrations, otherwise only upcoming

**Key design decisions:**
- Supabase client is lazy (`lib/supabase.ts`) — never instantiated at module level to avoid Next.js SSR prerender crashes when env vars are missing
- API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS); browser client uses anon key with permissive RLS policies
- "Delete" registration is a soft delete (`status='cancelled'`); re-registering the same phone reactivates the row
- Overlap detection for new classes is done in application code in the POST handler
- User identity is phone number only, stored in `localStorage` under `zenflow_phone`

**Components:**
- `ClassCard` — displays a single class with capacity bar, low-attendance warning (< `min_threshold` with ≤12 h until start), and register/cancel actions
- `RegistrationModal` — join form, pre-fills name/phone from localStorage
- `CreateClassForm` — admin-only form to create classes

## Styling

Tailwind v4 — configured exclusively via `@theme inline` in `app/globals.css`. There is no `tailwind.config.ts`. Custom tokens: `--color-mint`, `--color-slate`, `--color-cream`, etc.

## CSV Export

`lib/export.ts` exports `generateCSV(registrations, timezone, includeClassDetails)`. When `includeClassDetails=true` (history export), the CSV gains `Class_Name` and `Instructor` columns. All exports prepend a UTF-8 BOM (`0xEF 0xBB 0xBF`) for Hebrew compatibility in Excel.
