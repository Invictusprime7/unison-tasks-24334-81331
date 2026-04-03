-- Production installer foundation (tables + RLS). One-shot migration.

-- 0) business_id columns needed for multi-tenant ownership
alter table public.products add column if not exists business_id uuid;
create index if not exists products_business_id_idx on public.products (business_id);

alter table public.orders add column if not exists business_id uuid;
create index if not exists orders_business_id_idx on public.orders (business_id);

-- 1) Businesses
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null default 'New Business',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- 2) Members
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;
create index if not exists business_members_business_id_idx on public.business_members (business_id);
create index if not exists business_members_user_id_idx on public.business_members (user_id);

-- 3) Membership helper
create or replace function public.is_business_member(_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.business_members bm
    where bm.business_id = _business_id
      and bm.user_id = auth.uid()
  );
$$;

-- 4) Packs + installs registry
create table if not exists public.system_packs (
  id text primary key,
  name text not null,
  version text not null default '1.0.0',
  required_intents text[] not null default array[]::text[],
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.system_packs enable row level security;

create table if not exists public.business_installs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  system_type text not null,
  packs text[] not null default array[]::text[],
  status text not null default 'installed',
  installed_at timestamptz not null default now(),
  installed_by uuid
);

alter table public.business_installs enable row level security;
create index if not exists business_installs_business_id_idx on public.business_installs (business_id);

create table if not exists public.intent_bindings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  intent text not null,
  handler text not null,
  payload_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);

alter table public.intent_bindings enable row level security;
create index if not exists intent_bindings_business_intent_idx on public.intent_bindings (business_id, intent);

-- 5) Policies (created conditionally)

do $$
begin
  -- businesses
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='businesses_select_owner') then
    execute 'create policy "businesses_select_owner" on public.businesses for select using (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='businesses_insert_owner') then
    execute 'create policy "businesses_insert_owner" on public.businesses for insert with check (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='businesses_update_owner') then
    execute 'create policy "businesses_update_owner" on public.businesses for update using (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='businesses_delete_owner') then
    execute 'create policy "businesses_delete_owner" on public.businesses for delete using (owner_id = auth.uid())';
  end if;

  -- business_members
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_members' and policyname='business_members_select_own') then
    execute 'create policy "business_members_select_own" on public.business_members for select using (user_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_members' and policyname='business_members_manage_owner') then
    execute 'create policy "business_members_manage_owner" on public.business_members for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))';
  end if;

  -- system_packs
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='system_packs' and policyname='system_packs_select_authenticated') then
    execute 'create policy "system_packs_select_authenticated" on public.system_packs for select using (auth.uid() is not null)';
  end if;

  -- business_installs
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_installs' and policyname='business_installs_select_member') then
    execute 'create policy "business_installs_select_member" on public.business_installs for select using (public.is_business_member(business_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_installs' and policyname='business_installs_insert_member') then
    execute 'create policy "business_installs_insert_member" on public.business_installs for insert with check (public.is_business_member(business_id))';
  end if;

  -- intent_bindings
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='intent_bindings' and policyname='intent_bindings_select_member') then
    execute 'create policy "intent_bindings_select_member" on public.intent_bindings for select using (public.is_business_member(business_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='intent_bindings' and policyname='intent_bindings_manage_member') then
    execute 'create policy "intent_bindings_manage_member" on public.intent_bindings for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))';
  end if;

  -- products
  execute 'alter table public.products enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_select_member_or_public') then
    execute 'create policy "products_select_member_or_public" on public.products for select using (public.is_business_member(business_id) or is_active = true or business_id is null)';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_manage_member') then
    execute 'create policy "products_manage_member" on public.products for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))';
  end if;

  -- orders
  execute 'alter table public.orders enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_select_member') then
    execute 'create policy "orders_select_member" on public.orders for select using (public.is_business_member(business_id) or user_id = auth.uid() or session_id is not null or business_id is null)';
  end if;
end $$;

-- 6) updated_at trigger for businesses (guarded)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'businesses_set_updated_at') then
    execute 'create trigger businesses_set_updated_at before update on public.businesses for each row execute function public.update_updated_at_column()';
  end if;
end $$;
