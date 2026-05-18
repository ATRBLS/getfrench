/**
 * GET /api/integrations
 * Returns the list of connected integrations for the current user (no tokens).
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();

  if (!user) return NextResponse.json({ integrations: [] });

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("id, service_name, metadata, connected_at, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integrations: data ?? [] });
}
