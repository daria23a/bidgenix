-- BidGenix — initial schema (Supabase / Postgres + pgvector)
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists vector;

-- ---- Workspaces & membership -----------------------------------------------
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'trial',            -- trial | starter | pro | scale
  stripe_customer_id text,
  rfp_count_this_period int not null default 0,
  period_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',           -- owner | member
  primary key (workspace_id, user_id)
);

-- ---- Answer library (the compounding moat) ---------------------------------
create table if not exists answer_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  topic text not null,
  content text not null,
  embedding vector(1536),                        -- text-embedding-3-small
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists answer_library_ws_idx on answer_library(workspace_id);
-- Approximate nearest-neighbour index (cosine). ivfflat needs data before ANALYZE.
create index if not exists answer_library_embedding_idx
  on answer_library using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---- RFPs, questions, drafted answers --------------------------------------
create table if not exists rfps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null default 'Untitled RFP',
  source_text text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists rfp_questions (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references rfps(id) on delete cascade,
  ref text,                                      -- e.g. "3.1"
  requirement text not null,
  topic_keywords text[] default '{}',
  draft_answer text,
  gaps text,
  approved boolean not null default false,
  sort_order int not null default 0
);

-- ---- Billing snapshot ------------------------------------------------------
create table if not exists subscriptions (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  stripe_subscription_id text,
  status text,
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ---- Semantic search RPC ---------------------------------------------------
-- Returns the closest library entries for a workspace by cosine similarity.
create or replace function match_library(
  p_workspace uuid,
  query_embedding vector(1536),
  match_count int default 3
)
returns table (id uuid, topic text, content text, similarity float)
language sql stable
as $$
  select l.id, l.topic, l.content,
         1 - (l.embedding <=> query_embedding) as similarity
  from answer_library l
  where l.workspace_id = p_workspace
    and l.embedding is not null
  order by l.embedding <=> query_embedding
  limit match_count;
$$;

-- ---- Row Level Security ----------------------------------------------------
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table answer_library    enable row level security;
alter table rfps              enable row level security;
alter table rfp_questions     enable row level security;
alter table subscriptions     enable row level security;

-- Helper: is the current user a member of a workspace?
create or replace function is_member(ws uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

drop policy if exists "members read workspace" on workspaces;
create policy "members read workspace" on workspaces
  for select using (is_member(id));
drop policy if exists "owner updates workspace" on workspaces;
create policy "owner updates workspace" on workspaces
  for update using (owner_id = auth.uid());

drop policy if exists "members read membership" on workspace_members;
create policy "members read membership" on workspace_members
  for select using (user_id = auth.uid() or is_member(workspace_id));

drop policy if exists "members rw library" on answer_library;
create policy "members rw library" on answer_library
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));

drop policy if exists "members rw rfps" on rfps;
create policy "members rw rfps" on rfps
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));

drop policy if exists "members rw questions" on rfp_questions;
create policy "members rw questions" on rfp_questions
  for all using (
    exists (select 1 from rfps r where r.id = rfp_id and is_member(r.workspace_id))
  ) with check (
    exists (select 1 from rfps r where r.id = rfp_id and is_member(r.workspace_id))
  );

drop policy if exists "members read subscription" on subscriptions;
create policy "members read subscription" on subscriptions
  for select using (is_member(workspace_id));

-- ---- New-user bootstrap: create a workspace + membership -------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare ws_id uuid;
begin
  insert into workspaces (name, owner_id)
  values (coalesce(new.email, 'My') || '''s workspace', new.id)
  returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
