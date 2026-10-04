# Supabase RLS Security Demo

Independent security demo showing a practical approach to **multi-tenant authorization** with Supabase, PostgreSQL Row Level Security (RLS), and authenticated user sessions.

> This repository contains no proprietary or client code. It is a standalone demonstration project.

## Security model

The demo uses two isolated organizations. Each authenticated user has a profile mapped to one organization, while projects belong to an organization. PostgreSQL RLS is the enforcement boundary: application-side filtering is not treated as a security control.

Tenant resolution is performed by a small `SECURITY DEFINER` helper in a **non-exposed `private` schema**. RLS policies call that helper while authenticated users never receive direct Data API access to it.

## Verified end-to-end result

The TypeScript harness was successfully executed against a dedicated Supabase project using **two real Supabase Auth users** and the project's public/anon client key. The authorization tests do not use a service-role or secret key.

Verified assertions:

```text
PASS: test users belong to different organizations
PASS: Tenant A SELECT is restricted to Tenant A
PASS: Tenant B SELECT is restricted to Tenant B
PASS: cross-tenant SELECT request is safely evaluated
PASS: Tenant A cannot read Tenant B projects
PASS: Tenant A cannot insert a project into Tenant B

RLS isolation checks completed successfully.
```

This validates the full test path: **Supabase Auth → authenticated session/JWT → Data API → PostgreSQL RLS → tenant isolation**.

## What is tested

- **ALLOW:** each authenticated user can access projects belonging to their own organization.
- **DENY:** Tenant A receives no Tenant B projects even when explicitly filtering for Tenant B.
- **DENY:** Tenant A cannot insert a project into Tenant B's organization.
- **CROSS-TENANT:** two distinct authenticated identities are used so isolation is tested from both tenant contexts.

Testing only the expected success path does not prove tenant isolation, so the demo explicitly includes negative authorization checks.

## Structure

```text
.
├── .env.example
├── package.json
├── scripts/
│   └── rls-security-test.ts
└── supabase/
    └── migrations/
        ├── 001_schema.sql
        └── 002_rls_policies.sql
```

## Run the demo

Use a dedicated Supabase development project.

1. Apply `001_schema.sql`, then `002_rls_policies.sql`.
2. Create two Supabase Auth users for the demo.
3. Create two organizations and map one profile to each authenticated user's UUID.
4. Seed at least one project for each organization.
5. Copy `.env.example` to `.env` and fill in the project URL, public/anon key, and demo-user credentials.
6. Run:

```bash
npm install
npm run test:rls
```

The run should produce PASS assertions for same-tenant access and cross-tenant denial.

## Important implementation notes

- Never commit `.env`, passwords, access tokens, secret keys, or service-role credentials.
- Secret/service-role credentials bypass RLS and therefore must not be used to prove end-user authorization.
- Security-definer helper functions used by policies should live outside API-exposed schemas.
- RLS should be validated with both positive and negative tests.
- Production systems normally require additional role/permission policies, audit requirements, schema hardening, and application-specific threat modeling.

## Stack

Supabase · PostgreSQL · Row Level Security · Supabase Auth · TypeScript · JWT-based authenticated sessions

## Purpose

This repository is a concise technical portfolio example for reviewing Supabase/PostgreSQL security work. It demonstrates authenticated multi-tenant isolation without exposing architecture or source code from private SaaS projects.
