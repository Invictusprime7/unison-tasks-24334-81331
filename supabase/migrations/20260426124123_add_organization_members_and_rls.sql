-- Add organization_members for Cloud team features with RLS.
-- Safe to run multiple times.

create table if not exists public.organizations (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	slug text unique,
	description text,
	logo text,
	website text,
	industry text,
	size text,
	owner_id uuid,
	status text not null default 'active',
	billing jsonb not null default '{"plan":"free"}'::jsonb,
	member_count integer not null default 0,
	project_count integer not null default 0,
	storage_used bigint not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

do $$
begin
	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'owner_id'
	) then
		alter table public.organizations add column owner_id uuid;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'slug'
	) then
		alter table public.organizations add column slug text;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'billing'
	) then
		alter table public.organizations add column billing jsonb not null default '{"plan":"free"}'::jsonb;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'member_count'
	) then
		alter table public.organizations add column member_count integer not null default 0;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'project_count'
	) then
		alter table public.organizations add column project_count integer not null default 0;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'storage_used'
	) then
		alter table public.organizations add column storage_used bigint not null default 0;
	end if;

	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'organizations' and column_name = 'updated_at'
	) then
		alter table public.organizations add column updated_at timestamptz not null default now();
	end if;

	if not exists (
		select 1
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where c.relkind = 'i'
			and n.nspname = 'public'
			and c.relname = 'organizations_slug_idx'
	) then
		create unique index organizations_slug_idx on public.organizations(slug) where slug is not null;
	end if;
end
$$;

alter table public.organizations enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organizations'
			and policyname = 'organizations_owner_full_access'
	) then
		execute $policy$
			create policy "organizations_owner_full_access"
			on public.organizations
			for all
			using (owner_id = auth.uid())
			with check (owner_id = auth.uid())
		$policy$;
	end if;

end
$$;

grant select, insert, update, delete on table public.organizations to authenticated;

create table if not exists public.organization_members (
	id uuid primary key default gen_random_uuid(),
	organization_id uuid not null references public.organizations(id) on delete cascade,
	user_id uuid not null,
	role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'member', 'viewer', 'billing')),
	title text,
	department text,
	is_active boolean not null default true,
	joined_at timestamptz not null default now(),
	invited_by uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (organization_id, user_id)
);

create index if not exists organization_members_org_id_idx
	on public.organization_members (organization_id);

create index if not exists organization_members_user_id_idx
	on public.organization_members (user_id);

create index if not exists organization_members_org_active_idx
	on public.organization_members (organization_id, is_active);

alter table public.organization_members enable row level security;

do $$
begin
	-- Backfill owner memberships for organizations that predate this table.
	insert into public.organization_members (organization_id, user_id, role, is_active, joined_at)
	select o.id, o.owner_id, 'owner', true, now()
	from public.organizations o
	where o.owner_id is not null
	on conflict (organization_id, user_id) do update
		set role = excluded.role,
				is_active = true,
				updated_at = now();

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organization_members'
			and policyname = 'organization_members_select_member_or_owner'
	) then
		execute $policy$
			create policy "organization_members_select_member_or_owner"
			on public.organization_members
			for select
			using (
				exists (
					select 1
					from public.organization_members om
					where om.organization_id = organization_members.organization_id
						and om.user_id = auth.uid()
						and om.is_active = true
				)
				or exists (
					select 1
					from public.organizations o
					where o.id = organization_members.organization_id
						and o.owner_id = auth.uid()
				)
			)
		$policy$;
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organization_members'
			and policyname = 'organization_members_insert_admin_or_owner'
	) then
		execute $policy$
			create policy "organization_members_insert_admin_or_owner"
			on public.organization_members
			for insert
			with check (
				exists (
					select 1
					from public.organization_members om
					where om.organization_id = organization_members.organization_id
						and om.user_id = auth.uid()
						and om.is_active = true
						and om.role in ('owner', 'admin')
				)
				or exists (
					select 1
					from public.organizations o
					where o.id = organization_members.organization_id
						and o.owner_id = auth.uid()
				)
			)
		$policy$;
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organization_members'
			and policyname = 'organization_members_update_admin_or_owner'
	) then
		execute $policy$
			create policy "organization_members_update_admin_or_owner"
			on public.organization_members
			for update
			using (
				exists (
					select 1
					from public.organization_members om
					where om.organization_id = organization_members.organization_id
						and om.user_id = auth.uid()
						and om.is_active = true
						and om.role in ('owner', 'admin')
				)
				or exists (
					select 1
					from public.organizations o
					where o.id = organization_members.organization_id
						and o.owner_id = auth.uid()
				)
			)
			with check (
				exists (
					select 1
					from public.organization_members om
					where om.organization_id = organization_members.organization_id
						and om.user_id = auth.uid()
						and om.is_active = true
						and om.role in ('owner', 'admin')
				)
				or exists (
					select 1
					from public.organizations o
					where o.id = organization_members.organization_id
						and o.owner_id = auth.uid()
				)
			)
		$policy$;
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organization_members'
			and policyname = 'organization_members_delete_admin_or_owner'
	) then
		execute $policy$
			create policy "organization_members_delete_admin_or_owner"
			on public.organization_members
			for delete
			using (
				exists (
					select 1
					from public.organization_members om
					where om.organization_id = organization_members.organization_id
						and om.user_id = auth.uid()
						and om.is_active = true
						and om.role in ('owner', 'admin')
				)
				or exists (
					select 1
					from public.organizations o
					where o.id = organization_members.organization_id
						and o.owner_id = auth.uid()
				)
			)
		$policy$;
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'organizations'
			and policyname = 'organizations_member_select'
	) then
		execute $policy$
			create policy "organizations_member_select"
			on public.organizations
			for select
			using (
				owner_id = auth.uid()
				or exists (
					select 1
					from public.organization_members om
					where om.organization_id = organizations.id
						and om.user_id = auth.uid()
						and om.is_active = true
				)
			)
		$policy$;
	end if;
end
$$;

grant select, insert, update, delete on table public.organization_members to authenticated;
