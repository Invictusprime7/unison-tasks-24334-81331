create table if not exists public.design_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  root_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_components_user_updated_idx on public.design_components(user_id, updated_at desc);

alter table public.design_components enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'design_components' and policyname = 'design_components_select_own'
  ) then
    create policy design_components_select_own on public.design_components for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'design_components' and policyname = 'design_components_insert_own'
  ) then
    create policy design_components_insert_own on public.design_components for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'design_components' and policyname = 'design_components_update_own'
  ) then
    create policy design_components_update_own on public.design_components for update using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'design_components' and policyname = 'design_components_delete_own'
  ) then
    create policy design_components_delete_own on public.design_components for delete using (auth.uid() = user_id);
  end if;
end $$;

