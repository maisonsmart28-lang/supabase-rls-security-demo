import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL", "SUPABASE_ANON_KEY",
  "TENANT_A_EMAIL", "TENANT_A_PASSWORD",
  "TENANT_B_EMAIL", "TENANT_B_PASSWORD",
] as const;

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`PASS: ${message}`);
}

async function authenticatedClient(email: string, password: string) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Authentication failed for ${email}: ${error?.message}`);
  return { client, user: data.user };
}

async function ownOrganizationId(client: SupabaseClient) {
  const { data, error } = await client.from("profiles").select("organization_id").single();
  if (error || !data) throw new Error(`Could not read own profile: ${error?.message}`);
  return data.organization_id as string;
}

async function visibleProjects(client: SupabaseClient) {
  const { data, error } = await client.from("projects").select("id, organization_id, name");
  if (error) throw new Error(`Could not read projects: ${error.message}`);
  return data ?? [];
}

async function main() {
  const tenantA = await authenticatedClient(process.env.TENANT_A_EMAIL!, process.env.TENANT_A_PASSWORD!);
  const tenantB = await authenticatedClient(process.env.TENANT_B_EMAIL!, process.env.TENANT_B_PASSWORD!);

  const orgA = await ownOrganizationId(tenantA.client);
  const orgB = await ownOrganizationId(tenantB.client);
  assert(orgA !== orgB, "test users belong to different organizations");

  const aProjects = await visibleProjects(tenantA.client);
  const bProjects = await visibleProjects(tenantB.client);

  assert(aProjects.every((p) => p.organization_id === orgA), "Tenant A SELECT is restricted to Tenant A");
  assert(bProjects.every((p) => p.organization_id === orgB), "Tenant B SELECT is restricted to Tenant B");

  const { data: crossTenantRead, error: crossTenantReadError } = await tenantA.client
    .from("projects")
    .select("id, organization_id")
    .eq("organization_id", orgB);

  assert(!crossTenantReadError, "cross-tenant SELECT request is safely evaluated");
  assert((crossTenantRead ?? []).length === 0, "Tenant A cannot read Tenant B projects");

  const { error: crossTenantInsertError } = await tenantA.client.from("projects").insert({
    organization_id: orgB,
    name: "Forbidden cross-tenant insert",
    created_by: tenantA.user.id,
  });

  assert(Boolean(crossTenantInsertError), "Tenant A cannot insert a project into Tenant B");

  console.log("\nRLS isolation checks completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
