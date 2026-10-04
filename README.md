# Supabase RLS Security Demo

A small, independent security demo showing how I approach multi-tenant authorization with Supabase, PostgreSQL Row Level Security (RLS), and authenticated JWT user contexts.

This repository contains **no proprietary or client code**. It is intentionally minimal so the security model and tests are easy to review.

## What this demonstrates

- Two isolated organizations (tenants)
- Users mapped to organizations
- Projects owned by organizations
- Supabase Auth/JWT-aware RLS policies
- Positive **ALLOW** tests for same-tenant access
- Negative **DENY** tests for cross-tenant access
- Tests performed as authenticated users, not by relying on a service-role bypass

## Planned structure

```
supabase/
  migrations/
    001_schema.sql
    002_rls_policies.sql
scripts/
  rls-security-test.ts
.env.example
package.json
```

## Security principle

A successful authorized request is not enough to prove tenant isolation. The test harness therefore validates both expected access and explicit cross-tenant denial.

## Status

Built incrementally with separate commits for schema, RLS policies, authenticated test harness, negative isolation tests, and documentation.
