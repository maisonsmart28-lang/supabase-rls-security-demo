-- Multi-tenant schema for the RLS security demo.
-- Run inside a Supabase project after Auth is available.

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index profiles_organization_id_idx on public.profiles (organization_id);
create index projects_organization_id_idx on public.projects (organization_id);

comment on table public.organizations is 'Tenant records for the demo.';
comment on table public.profiles is 'Maps an authenticated Supabase user to exactly one tenant.';
comment on table public.projects is 'Tenant-owned application data protected by RLS.';
