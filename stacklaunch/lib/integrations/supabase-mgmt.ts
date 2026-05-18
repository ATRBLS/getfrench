/**
 * Supabase Management API integration
 * Docs: https://supabase.com/docs/reference/api/introduction
 * Auth: Personal Access Token (Management API key)
 */

const MGMT_API = "https://api.supabase.com";

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  status: string;
}

export interface SupabaseEnvVars extends Record<string, string> {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_PROJECT_ID: string;
}

/** Validate the Management API token by fetching orgs */
export async function validateToken(token: string): Promise<{ valid: boolean; orgs?: { id: string; name: string }[] }> {
  const res = await fetch(`${MGMT_API}/v1/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { valid: false };

  const orgs = await res.json();
  return { valid: true, orgs };
}

/** Create a new Supabase project */
export async function createProject(
  token: string,
  name: string,
  orgId: string,
  region = "eu-west-2"
): Promise<SupabaseProject> {
  const dbPassword = generateSecurePassword();

  const res = await fetch(`${MGMT_API}/v1/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      organization_id: orgId,
      region,
      db_pass: dbPassword,
      plan: "free",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create Supabase project: ${err.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    region: data.region,
    status: data.status,
  };
}

/** Get API keys for a project */
export async function getProjectKeys(
  token: string,
  projectId: string
): Promise<{ anon: string; service_role: string }> {
  const res = await fetch(`${MGMT_API}/v1/projects/${projectId}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Supabase project keys");

  const keys = await res.json();
  const anon = keys.find((k: { name: string }) => k.name === "anon")?.api_key;
  const service = keys.find((k: { name: string }) => k.name === "service_role")?.api_key;

  if (!anon || !service) throw new Error("Could not find anon/service_role keys");

  return { anon, service_role: service };
}

/** Build env vars for this service */
export function getEnvVars(projectId: string, anonKey: string, serviceRoleKey: string): SupabaseEnvVars {
  return {
    NEXT_PUBLIC_SUPABASE_URL: `https://${projectId}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_PROJECT_ID: projectId,
  };
}

/** Get the first org for the token owner */
export async function getFirstOrg(token: string): Promise<string> {
  const res = await fetch(`${MGMT_API}/v1/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Supabase organizations");

  const orgs = await res.json();
  if (!orgs.length) throw new Error("No Supabase organization found for this token");

  return orgs[0].id;
}

function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
