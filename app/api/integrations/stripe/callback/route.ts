import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/integrations/stripe";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/connect?error=stripe_oauth_denied", process.env.NEXT_PUBLIC_APP_URL!));
  }

  try {
    const tokenData = await exchangeCode(code);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!user) throw new Error("User not found");

    await supabaseAdmin.from("integrations").upsert({
      user_id: user.id,
      service_name: "stripe",
      access_token_encrypted: encrypt(tokenData.access_token),
      refresh_token_encrypted: encrypt(tokenData.refresh_token),
      metadata: {
        stripe_user_id: tokenData.stripe_user_id,
        stripe_publishable_key: tokenData.stripe_publishable_key,
        stripe_account_id: tokenData.stripe_user_id,
      },
      is_active: true,
    }, { onConflict: "user_id,service_name" });

    return NextResponse.redirect(new URL("/connect?success=stripe", process.env.NEXT_PUBLIC_APP_URL!));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(msg)}`, process.env.NEXT_PUBLIC_APP_URL!));
  }
}
