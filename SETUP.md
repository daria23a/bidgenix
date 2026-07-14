# BidGenix — production setup guide

BidGenix runs in **demo mode with zero setup** (JSON library, no auth, no
billing). Follow the steps below to turn on the production integrations. Each is
independent — add them in any order.

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Routes: `/` landing · `/app` the tool · `/pricing` plans · `/login` sign-in.

---

## 1. OpenAI (real drafting + embeddings)
Add to `.env.local`:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
```
Without it, the app uses a deterministic mock so you can still demo the flow.

## 2. Supabase (Postgres + pgvector, auth, storage)
1. Create a project at supabase.com.
2. **SQL Editor → run** `supabase/migrations/0001_init.sql`. This creates the
   schema, the `match_library` vector-search function, RLS policies, and a
   trigger that gives every new user their own workspace.
3. Settings → API, copy into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # server only — keep secret
```
4. Authentication → Providers: enable **Email** (magic link is used by default).
   Add your site URL + `…/auth/callback` to the allowed redirect URLs.

Once set: `/login` sends magic links, `/app` is protected, the answer library
lives in Postgres, and retrieval uses **pgvector semantic search** (with a
keyword fallback if anything is missing).

### Seeding the library with embeddings
Approved answers are embedded and stored automatically. To bulk-import existing
content, insert rows into `answer_library` and set `embedding` via the OpenAI
embeddings API (a small import script is a good next addition).

## 3. Stripe (billing)
1. Create 3 recurring Prices (Starter/Pro/Scale) in the Stripe dashboard.
2. Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_live_...            (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_SCALE=price_...
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```
3. Add a webhook endpoint pointing to `/api/stripe/webhook` for events:
   `checkout.session.completed`, `customer.subscription.created|updated|deleted`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

The `/pricing` page starts Checkout; the webhook writes the plan back to the
workspace; quotas are then enforced in `/api/extract`.

---

## Deploy
- **Vercel** is the easiest host (Next.js native). Push the repo, set the same
  env vars in the project settings, deploy.
- Point your domain (bidgenix.com) at it, set `NEXT_PUBLIC_SITE_URL` to the live
  URL, and update Supabase + Stripe redirect/webhook URLs to match.

## Architecture at a glance
```
Browser ── /app ── /api/extract ─► LLM extract ─► retrieveLibrary()
                                           │            ├─ semantic: embed + match_library RPC (pgvector)
                                           │            └─ fallback: keyword over seed JSON
                    /api/draft   ─► LLM draft (grounded, flags gaps)
                    /api/upload  ─► unpdf (PDF) / mammoth (DOCX) / text
                    /api/library ─► embed + insert approved answer  (compounding moat)
        /pricing ── /api/checkout ─► Stripe Checkout ─► webhook ─► workspace.plan
        Supabase Auth (magic link) + RLS-scoped multi-tenant workspaces
```
