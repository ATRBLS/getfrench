/**
 * Resend integration — API Key
 * Docs: https://resend.com/docs/api-reference/introduction
 */

export interface ResendEnvVars {
  RESEND_API_KEY: string;
}

/** Validate a Resend API key by fetching the account */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; name?: string }> {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.status === 401) return { valid: false };
  if (!res.ok) return { valid: false };

  return { valid: true };
}

/** Create a domain in Resend (optional — just validates key by default) */
export async function addDomain(apiKey: string, domain: string): Promise<{ id: string }> {
  const res = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to add Resend domain: ${err.message ?? JSON.stringify(err)}`);
  }

  return res.json();
}

/** Returns the env vars to store */
export function getEnvVars(apiKey: string): ResendEnvVars {
  return { RESEND_API_KEY: apiKey };
}
