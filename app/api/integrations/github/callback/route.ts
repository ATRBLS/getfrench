import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, getUser } from "@/lib/integrations/github";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/connect?error=github_oauth_denied", process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeCode(code);
    const ghUser = await getUser(tokenData.access_token);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!user) throw new Error("User not found");

    await supabaseAdmin.from("integrations").upsert({
      user_id: user.id,
      service_name: "github",
      access_token_encrypted: encrypt(tokenData.access_token),
      metadata: {
        github_login: ghUser.login,
        github_id: ghUser.id,
        github_name: ghUser.name,
        scope: tokenData.scope,
      },
      is_active: true,
    }, { onConflict: "user_id,service_name" });

    return NextResponse.redirect(new URL("/connect?success=github", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(msg)}`, process.env.NEXT_PUBLIC_APP_URL!));
  }
}
