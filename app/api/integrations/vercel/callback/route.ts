import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, getAccount } from "@/lib/integrations/vercel";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/connect?error=vercel_oauth_denied`, process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeCode(code);
    const account = await getAccount(tokenData.access_token);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!user) throw new Error("User not found");

    await supabaseAdmin.from("integrations").upsert({
      user_id: user.id,
      service_name: "vercel",
      access_token_encrypted: encrypt(tokenData.access_token),
      metadata: {
        team_id: tokenData.team_id,
        user_id: tokenData.user_id,
        account_name: account.name,
        account_slug: account.slug,
        org_id: account.id,
      },
      is_active: true,
    }, { onConflict: "user_id,service_name" });

    return NextResponse.redirect(new URL("/connect?success=vercel", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(msg)}`, process.env.NEXT_PUBLIC_APP_URL!));
  }
}
