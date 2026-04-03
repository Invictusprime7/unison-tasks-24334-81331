create table if not exists public.brand_kits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.brand_kits enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kits' and policyname = 'brand_kits_select_own'
  ) then
    create policy brand_kits_select_own on public.brand_kits for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_kits' and policyname = 'brand_kits_upsert_own'
  ) then
    create policy brand_kits_upsert_own on public.brand_kits for insert with check (auth.uid() = user_id);
    create policy brand_kits_update_own on public.brand_kits for update using (auth.uid() = user_id);
    create policy brand_kits_delete_own on public.brand_kits for delete using (auth.uid() = user_id);
  end if;
end $$;

