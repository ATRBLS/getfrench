/**
 * Stripe integration — OAuth Connect
 * Docs: https://stripe.com/docs/connect/oauth-reference
 */

export interface StripeEnvVars extends Record<string, string> {
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_ACCOUNT_ID: string;
}

/** Exchange OAuth code for Stripe access token */
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  stripe_user_id: string;
  stripe_publishable_key: string;
  refresh_token: string;
}> {
  const res = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: process.env.STRIPE_SECRET_KEY!,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe OAuth exchange failed: ${err.error_description ?? JSON.stringify(err)}`);
  }

  return res.json();
}

/** Create a webhook endpoint for a given Vercel project URL */
export async function createWebhook(
  secretKey: string,
  endpointUrl: string
): Promise<{ id: string; secret: string }> {
  const res = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      url: endpointUrl,
      "enabled_events[]": "checkout.session.completed",
      "enabled_events[1]": "customer.subscription.updated",
      "enabled_events[2]": "customer.subscription.deleted",
      "enabled_events[3]": "invoice.payment_succeeded",
      "enabled_events[4]": "invoice.payment_failed",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create Stripe webhook: ${err.error?.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { id: data.id, secret: data.secret };
}

/** Build env vars */
export function getEnvVars(
  secretKey: string,
  publishableKey: string,
  webhookSecret: string,
  accountId: string
): StripeEnvVars {
  return {
    STRIPE_SECRET_KEY: secretKey,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: publishableKey,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_ACCOUNT_ID: accountId,
  };
}

/** Build the OAuth redirect URL */
export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRIPE_CLIENT_ID!,
    response_type: "code",
    scope: "read_write",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/stripe/callback`,
    state,
  });
  return `https://connect.stripe.com/oauth/authorize?${params}`;
}
