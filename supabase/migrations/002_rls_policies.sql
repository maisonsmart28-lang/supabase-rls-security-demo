-- RLS policies for tenant isolation.
-- Security-definer helpers live in a non-exposed schema so they cannot
-- be called directly through the Supabase Data API.

create schema if not exists private;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid())
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

create policy "users can read own organization"
on public.organizations
for select to authenticated
using (id = (select private.current_organization_id()));

create policy "users can read own profile"
on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "users can read projects in own organization"
on public.projects
for select to authenticated
using (organization_id = (select private.current_organization_id()));

create policy "users can insert projects in own organization"
on public.projects
for insert to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and created_by = (select auth.uid())
);

create policy "users can update projects in own organization"
on public.projects
for update to authenticated
using (organization_id = (select private.current_organization_id()))
with check (
  organization_id = (select private.current_organization_id())
  and created_by = (select auth.uid())
);

create policy "users can delete projects in own organization"
on public.projects
for delete to authenticated
using (organization_id = (select private.current_organization_id()));
