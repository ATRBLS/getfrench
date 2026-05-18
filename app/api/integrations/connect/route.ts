/**
 * POST /api/integrations/connect
 * Store an API key for a service that doesn't use OAuth.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import type { ServiceName } from "@/types";

async function getUserId(clerkId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("users").select("id").eq("clerk_id", clerkId).single();
  return data?.id ?? null;
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { service, apiKey, metadata }: { service: ServiceName; apiKey: string; metadata?: Record<string, unknown> } = await req.json();

  if (!service || !apiKey) {
    return NextResponse.json({ error: "service and apiKey are required" }, { status: 400 });
  }

  const encrypted = encrypt(apiKey);

  const { error } = await supabaseAdmin.from("integrations").upsert({
    user_id: userId,
    service_name: service,
    access_token_encrypted: encrypted,
    metadata: metadata ?? {},
    is_active: true,
  }, { onConflict: "user_id,service_name" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { service }: { service: ServiceName } = await req.json();

  const { error } = await supabaseAdmin
    .from("integrations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("service_name", service);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
