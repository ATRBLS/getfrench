/**
 * Generic handler for services that only need an API key stored.
 * Used for: OpenAI, Anthropic, ElevenLabs, Clerk, PostHog, Upstash, Railway, Cloudflare
 */

import type { ServiceName } from "@/types";

export const API_KEY_ENV_MAP: Partial<Record<ServiceName, string[]>> = {
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  elevenlabs: ["ELEVENLABS_API_KEY"],
  clerk: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
  railway: ["RAILWAY_TOKEN"],
  posthog: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
  upstash: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  cloudflare: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
};

export function buildEnvVars(service: ServiceName, values: Record<string, string>): Record<string, string> {
  const keys = API_KEY_ENV_MAP[service] ?? [];
  return Object.fromEntries(keys.map((k) => [k, values[k] ?? ""]));
}
