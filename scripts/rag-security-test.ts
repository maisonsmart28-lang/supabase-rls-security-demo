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

async function createOwnDocument(client: SupabaseClient, name: string) {
  const { data, error } = await client
    .from("rag_documents")
    .insert({ name, source_type: "text" })
    .select("id, owner_id, name")
    .single();
  if (error || !data) throw new Error(`Could not create RAG document: ${error?.message}`);
  return data;
}

async function main() {
  const tenantA = await authenticatedClient(process.env.TENANT_A_EMAIL!, process.env.TENANT_A_PASSWORD!);
  const tenantB = await authenticatedClient(process.env.TENANT_B_EMAIL!, process.env.TENANT_B_PASSWORD!);

  const suffix = Date.now();
  const docA = await createOwnDocument(tenantA.client, `RAG security A ${suffix}`);
  const docB = await createOwnDocument(tenantB.client, `RAG security B ${suffix}`);

  try {
    assert(docA.owner_id === tenantA.user.id, "User A can create a document owned by A");
    assert(docB.owner_id === tenantB.user.id, "User B can create a document owned by B");

    const { data: aReadsB, error: aReadsBError } = await tenantA.client
      .from("rag_documents").select("id").eq("id", docB.id);
    assert(!aReadsBError, "User A cross-user document SELECT is safely evaluated");
    assert((aReadsB ?? []).length === 0, "User A cannot read User B document");

    const { data: bReadsA, error: bReadsAError } = await tenantB.client
      .from("rag_documents").select("id").eq("id", docA.id);
    assert(!bReadsAError, "User B cross-user document SELECT is safely evaluated");
    assert((bReadsA ?? []).length === 0, "User B cannot read User A document");

    const { error: aChunkError } = await tenantA.client.from("rag_document_chunks").insert({
      document_id: docA.id,
      chunk_index: 0,
      content: "Private RAG content belonging to user A."
    });
    assert(!aChunkError, "User A can insert a chunk into A document");

    const { error: crossChunkError } = await tenantA.client.from("rag_document_chunks").insert({
      document_id: docB.id,
      chunk_index: 999999,
      content: "Forbidden cross-user chunk."
    });
    assert(Boolean(crossChunkError), "User A cannot insert a chunk into User B document");

    const { data: aSeesBChunks, error: aSeesBChunksError } = await tenantA.client
      .from("rag_document_chunks").select("id").eq("document_id", docB.id);
    assert(!aSeesBChunksError, "User A cross-user chunk SELECT is safely evaluated");
    assert((aSeesBChunks ?? []).length === 0, "User A cannot read User B chunks");

    const zeroVector = new Array(384).fill(0);
    const { data: matches, error: matchError } = await tenantA.client.rpc("match_rag_chunks", {
      query_embedding: zeroVector,
      match_threshold: -1,
      match_count: 20,
    });
    assert(!matchError, `RAG RPC executes as authenticated User A: ${matchError?.message ?? ""}`);
    assert((matches ?? []).every((row: { document_id: string }) => row.document_id !== docB.id),
      "RAG vector retrieval for User A cannot return User B document chunks");

    console.log("\nSecure RAG isolation checks completed successfully.");
  } finally {
    await tenantA.client.from("rag_documents").delete().eq("id", docA.id);
    await tenantB.client.from("rag_documents").delete().eq("id", docB.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
