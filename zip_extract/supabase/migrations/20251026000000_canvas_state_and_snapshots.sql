-- Canvas state and snapshots tables
create table if not exists public.canvas_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text null,
  page_id text null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint canvas_states_user_project_page_unique unique (user_id, project_id, page_id)
);

alter table public.canvas_states enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_states' and policyname = 'canvas_states_select_own'
  ) then
    create policy canvas_states_select_own on public.canvas_states for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_states' and policyname = 'canvas_states_insert_own'
  ) then
    create policy canvas_states_insert_own on public.canvas_states for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_states' and policyname = 'canvas_states_update_own'
  ) then
    create policy canvas_states_update_own on public.canvas_states for update using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_states' and policyname = 'canvas_states_delete_own'
  ) then
    create policy canvas_states_delete_own on public.canvas_states for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Snapshots
create table if not exists public.canvas_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text null,
  page_id text null,
  title text null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists canvas_snapshots_user_project_page_created_idx on public.canvas_snapshots(user_id, project_id, page_id, created_at desc);

alter table public.canvas_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_snapshots' and policyname = 'canvas_snapshots_select_own'
  ) then
    create policy canvas_snapshots_select_own on public.canvas_snapshots for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_snapshots' and policyname = 'canvas_snapshots_insert_own'
  ) then
    create policy canvas_snapshots_insert_own on public.canvas_snapshots for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'canvas_snapshots' and policyname = 'canvas_snapshots_delete_own'
  ) then
    create policy canvas_snapshots_delete_own on public.canvas_snapshots for delete using (auth.uid() = user_id);
  end if;
end $$;

