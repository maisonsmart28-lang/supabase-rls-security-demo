import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TENANT_A_EMAIL",
  "TENANT_A_PASSWORD",
  "TENANT_B_EMAIL",
  "TENANT_B_PASSWORD",
] as const;

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

async function authenticatedClient(email: string, password: string) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Authentication failed for ${email}: ${error?.message}`);

  return { client, user: data.user };
}

async function ownOrganizationId(client: SupabaseClient) {
  const { data, error } = await client
    .from("profiles")
    .select("organization_id")
    .single();

  if (error || !data) throw new Error(`Could not read own profile: ${error?.message}`);
  return data.organization_id as string;
}

async function main() {
  const tenantA = await authenticatedClient(process.env.TENANT_A_EMAIL!, process.env.TENANT_A_PASSWORD!);
  const tenantB = await authenticatedClient(process.env.TENANT_B_EMAIL!, process.env.TENANT_B_PASSWORD!);

  const orgA = await ownOrganizationId(tenantA.client);
  const orgB = await ownOrganizationId(tenantB.client);

  if (orgA === orgB) throw new Error("Test users must belong to different organizations.");

  console.log("Authenticated as two users in different tenants.");
  console.log("Base harness ready for ALLOW/DENY assertions.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
