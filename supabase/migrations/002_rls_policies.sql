-- RLS policies: authenticated users can only access rows belonging
-- to the organization mapped to their auth.uid() profile.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.current_organization_id() from public;
revoke execute on function public.current_organization_id() from anon;
grant execute on function public.current_organization_id() to authenticated;

create policy "users can read own organization"
on public.organizations
for select
to authenticated
using (id = public.current_organization_id());

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "users can read projects in own organization"
on public.projects
for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "users can insert projects in own organization"
on public.projects
for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and created_by = auth.uid()
);

create policy "users can update projects in own organization"
on public.projects
for update
to authenticated
using (organization_id = public.current_organization_id())
with check (
  organization_id = public.current_organization_id()
  and created_by = auth.uid()
);

create policy "users can delete projects in own organization"
on public.projects
for delete
to authenticated
using (organization_id = public.current_organization_id());
