# ClipFlow — Setup Guide

This document walks you through provisioning every dependency and deploying ClipFlow from scratch using the installed CLIs.

---

## Prerequisites
- `node` ≥ 18, `npm` ≥ 9
- `supabase` CLI — `npm i -g supabase`
- `vercel` CLI — `npm i -g vercel`
- `gh` CLI (GitHub) — already authenticated (`gh auth status`)

---

## 1. GitHub — create remote repo

```bash
cd /path/to/clipflow
gh repo create clipflow --private --source=. --remote=origin --push
```

---

## 2. Supabase — create project + apply schema

### 2a. Login and create project

```bash
supabase login
supabase projects create clipflow --org-id YOUR_ORG_ID --db-password YOUR_DB_PASS --region us-east-1
# Note the project ref from the output, e.g. abcdefghijklmnop
```

> Find your org-id: `supabase orgs list`

### 2b. Link and push schema

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies `supabase/migrations/001_initial.sql` — creates all tables, RLS policies, and the auto-workspace trigger.

### 2c. Create the clip-files storage bucket

In the Supabase dashboard → **Storage** → **New bucket**:
- Name: `clip-files`
- Public: **off**
- Run this RLS policy (SQL editor):

```sql
-- Allow workspace members to upload to their own folder
create policy "workspace members can upload clips"
  on storage.objects for insert
  with check (
    bucket_id = 'clip-files'
    and auth.role() = 'authenticated'
  );

create policy "workspace members can read clips"
  on storage.objects for select
  using (
    bucket_id = 'clip-files'
    and auth.role() = 'authenticated'
  );
```

### 2d. Configure Auth

In the Supabase dashboard → **Authentication** → **URL Configuration**:
- **Site URL**: your Vercel production URL (e.g. `https://clipflow.vercel.app`)
- **Redirect URLs**: add `https://clipflow.vercel.app/auth/callback`
  - Also add `http://localhost:3000/auth/callback` for local dev

### 2e. Get your keys

Dashboard → **Settings** → **API**:
- Copy `URL`, `anon key`, and `service_role key`

---

## 3. Local dev setup

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Set NEXT_PUBLIC_SITE_URL=http://localhost:3000

npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.
Sign in with magic link; your workspace is auto-created on first login.

---

## 4. Vercel — deploy

### 4a. Link project

```bash
vercel link
# Follow prompts: create a new project named "clipflow"
```

### 4b. Set environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SITE_URL
# Enter your Vercel deployment URL when prompted, e.g. https://clipflow.vercel.app
```

### 4c. Deploy

```bash
vercel --prod
```

After deploy, update **Supabase Auth → Site URL** to your Vercel production URL.

---

## 5. Stripe setup (Phase 4 only)

Skip this until you're ready to gate features behind a paid plan.

```bash
# In Stripe dashboard: create a Product "ClipFlow Pro"
# Add a recurring price (e.g. $29/month) and note the price ID

vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_PRO_PRICE_ID

# Create webhook endpoint in Stripe dashboard pointing to:
# https://YOUR_VERCEL_URL/api/webhooks/stripe
# Events to listen: customer.subscription.created, customer.subscription.updated,
#                   customer.subscription.deleted, checkout.session.completed

vercel env add STRIPE_WEBHOOK_SECRET
```

---

## 6. CI/CD

Vercel auto-deploys on every push to `main` (preview for branches, production for main).
No additional CI config needed.

---

## Phase 1 demo loop

Once deployed:
1. Sign up at `/login`
2. Go to **Clients** → **Add client** — enter name, posting accounts (@handle + followers), rate
3. Copy the **Agreement link** from the client card
4. Open the link in a private/incognito tab — client fills in their name and checks the box
5. Back in the dashboard, the client is now **Active**
6. Go to **Clips** → **Add clip** — assign to the active client
7. Drag or move the clip card through the kanban columns
8. On the "Ready" card, click ⋮ → **Log post…** — enter the posting account and URL
9. Clip moves to **Posted** and the post is recorded in the log
