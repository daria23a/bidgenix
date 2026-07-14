# BidGenix

Turn an RFP into a source-grounded, drafted response in minutes.

**Flow:** upload/paste RFP → extract every requirement → retrieve matching
answers from your library (**pgvector semantic search**) → draft grounded
answers that flag gaps → review/approve → export to Word. Approved answers are
embedded back into the library — the compounding moat.

## Stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Supabase** (Postgres + **pgvector**, Auth, RLS multi-tenant workspaces)
- **OpenAI** (drafting + `text-embedding-3-small`)
- **Stripe** (Starter/Pro/Scale subscriptions, webhook-driven plan + quotas)
- **unpdf** (PDF) + **mammoth** (DOCX) for file parsing

## Quick start
```bash
npm install
cp .env.example .env.local     # all vars optional — empty = demo mode
npm run dev                    # http://localhost:3000
```
The app runs with **zero config** in demo mode (JSON library, no auth, no
billing) so you can try the whole flow immediately. To enable production
integrations, see **[SETUP.md](./SETUP.md)**.

## Routes
| Route | What |
|---|---|
| `/` | Marketing landing |
| `/app` | The tool (protected when Supabase is on) |
| `/pricing` | Plans + Stripe checkout |
| `/login` | Magic-link sign-in |
| `/api/extract` · `/api/draft` | RFP → requirements → grounded drafts |
| `/api/upload` | PDF/DOCX/TXT → text |
| `/api/library` | Persist + embed approved answers |
| `/api/checkout` · `/api/portal` · `/api/stripe/webhook` | Billing |

## Database
`supabase/migrations/0001_init.sql` — schema, the `match_library` cosine-search
function, RLS policies, and a new-user → workspace bootstrap trigger.

## Project layout
```
src/
  app/            landing, /app, /pricing, /login, api routes
  lib/            config, supabase clients, embeddings, library retrieval,
                  stripe, plan/quota, workspace
  middleware.ts   session refresh + /app guard
supabase/migrations/0001_init.sql
data/library.json  seed answer library (demo mode)
```

See **[SETUP.md](./SETUP.md)** for the full production checklist.

