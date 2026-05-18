import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getUserId(clerkId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("users").select("id").eq("clerk_id", clerkId).single();
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`*, project_services(*)`)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ project: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
