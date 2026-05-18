/**
 * Vercel integration — OAuth 2.0
 * Docs: https://vercel.com/docs/rest-api
 */

const VERCEL_API = "https://api.vercel.com";

export interface VercelProject {
  id: string;
  name: string;
  url?: string;
}

export interface VercelEnvVars extends Record<string, string> {
  VERCEL_TOKEN: string;
  VERCEL_PROJECT_ID: string;
  VERCEL_ORG_ID: string;
}

/** Exchange OAuth code for access token */
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  team_id?: string;
  user_id?: string;
}> {
  const res = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID!,
      client_secret: process.env.VERCEL_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/vercel/callback`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel OAuth exchange failed: ${err}`);
  }

  return res.json();
}

/** Get the authenticated user / team info */
export async function getAccount(accessToken: string): Promise<{ id: string; name: string; slug: string }> {
  const res = await fetch(`${VERCEL_API}/v2/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Vercel account");

  const data = await res.json();
  return {
    id: data.user.id,
    name: data.user.name ?? data.user.username,
    slug: data.user.username,
  };
}

/** Create a Vercel project */
export async function createProject(
  accessToken: string,
  name: string,
  teamId?: string
): Promise<VercelProject> {
  const url = teamId
    ? `${VERCEL_API}/v9/projects?teamId=${teamId}`
    : `${VERCEL_API}/v9/projects`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      framework: "nextjs",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create Vercel project: ${err.error?.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: `https://vercel.com/${data.accountId}/${data.name}`,
  };
}

/** Inject environment variables into a Vercel project */
export async function setEnvVars(
  accessToken: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
  const url = teamId
    ? `${VERCEL_API}/v9/projects/${projectId}/env?teamId=${teamId}`
    : `${VERCEL_API}/v9/projects/${projectId}/env`;

  const body = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    type: "encrypted",
    target: ["production", "preview", "development"],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to set Vercel env vars: ${err.error?.message ?? JSON.stringify(err)}`);
  }
}

/** Connect a GitHub repo to a Vercel project */
export async function connectGitRepo(
  accessToken: string,
  projectId: string,
  repoOwner: string,
  repoName: string,
  teamId?: string
): Promise<void> {
  const url = teamId
    ? `${VERCEL_API}/v9/projects/${projectId}?teamId=${teamId}`
    : `${VERCEL_API}/v9/projects/${projectId}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      link: {
        type: "github",
        repo: `${repoOwner}/${repoName}`,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to connect GitHub to Vercel: ${err.error?.message ?? JSON.stringify(err)}`);
  }
}

/** Returns the env vars to store for this service */
export function getEnvVars(
  accessToken: string,
  projectId: string,
  orgId: string,
  projectUrl?: string
): VercelEnvVars {
  const vars: VercelEnvVars = {
    VERCEL_TOKEN: accessToken,
    VERCEL_PROJECT_ID: projectId,
    VERCEL_ORG_ID: orgId,
  };
  if (projectUrl) vars["VERCEL_PROJECT_URL"] = projectUrl;
  return vars;
}

/** Build the OAuth redirect URL */
export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/vercel/callback`,
    scope: "user",
    state,
  });
  return `https://vercel.com/oauth/authorize?${params}`;
}
