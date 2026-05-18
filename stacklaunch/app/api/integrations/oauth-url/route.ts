/**
 * GET /api/integrations/oauth-url?service=vercel
 * Returns the OAuth redirect URL for a given service.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthUrl as vercelOAuth } from "@/lib/integrations/vercel";
import { getOAuthUrl as githubOAuth } from "@/lib/integrations/github";
import { getOAuthUrl as stripeOAuth } from "@/lib/integrations/stripe";
import { randomBytes } from "crypto";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const service = url.searchParams.get("service");
  const state = randomBytes(16).toString("hex");

  let oauthUrl: string;
  switch (service) {
    case "vercel":
      oauthUrl = vercelOAuth(state);
      break;
    case "github":
      oauthUrl = githubOAuth(state);
      break;
    case "stripe":
      oauthUrl = stripeOAuth(state);
      break;
    default:
      return NextResponse.json({ error: "Unknown service or not OAuth-based" }, { status: 400 });
  }

  return NextResponse.json({ url: oauthUrl });
}
