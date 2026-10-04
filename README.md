# Supabase RLS Security Demo

Independent security demo showing a practical approach to **multi-tenant authorization** with Supabase, PostgreSQL Row Level Security (RLS), and authenticated user sessions.

> This repository contains no proprietary or client code. It is a standalone demonstration project.

## Security model

The demo uses two isolated organizations. Each authenticated user has a profile mapped to one organization, while projects belong to an organization. PostgreSQL RLS is the enforcement boundary: application-side filtering is not treated as a security control.

The policies use `auth.uid()` through a small helper function to resolve the current user's organization.

## What is tested

The TypeScript harness signs in as two real Supabase Auth users through the **anon key**. It deliberately does not use a service-role key for authorization tests.

It verifies:

- **ALLOW:** each user can resolve their own tenant context.
- **ALLOW:** visible project rows belong only to the authenticated user's tenant.
- **DENY:** Tenant A receives no Tenant B projects even when explicitly filtering for Tenant B.
- **DENY:** Tenant A cannot insert a project owned by Tenant B.

This matters because testing only the expected success path does not prove tenant isolation.

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
4. Optionally seed projects for both organizations.
5. Copy `.env.example` to `.env` and fill in the project URL, anon key, and demo-user credentials.
6. Run:

```bash
npm install
npm run test:rls
```

Expected output contains PASS assertions for both same-tenant access and cross-tenant denial.

## Important implementation notes

- Never commit `.env`, passwords, access tokens, or service-role credentials.
- The service-role key bypasses RLS and therefore should not be used to prove end-user authorization.
- RLS should be validated with both positive and negative tests.
- Production systems normally require additional role/permission policies, audit requirements, schema hardening, and application-specific threat modeling.

## Stack

Supabase · PostgreSQL · Row Level Security · Supabase Auth · TypeScript · JWT-based authenticated sessions

## Purpose

This repository is intended as a concise technical portfolio example for reviewing Supabase/PostgreSQL security work. It demonstrates the approach without exposing architecture or source code from private SaaS projects.
