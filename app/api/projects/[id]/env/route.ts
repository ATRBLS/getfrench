/**
 * GET /api/projects/[id]/env?reveal=true
 * Returns env vars for all project services.
 * Without ?reveal=true, values are masked.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptEnvVars, maskEnvVars } from "@/lib/crypto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabaseAdmin.from("users").select("id").eq("clerk_id", clerkId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const url = new URL(req.url);
  const reveal = url.searchParams.get("reveal") === "true";

  // Verify ownership
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data: services } = await supabaseAdmin
    .from("project_services")
    .select("service_name, status, env_vars_encrypted")
    .eq("project_id", id);

  const result = (services ?? []).map((svc) => {
    let envVars: Record<string, string> = {};

    if (svc.env_vars_encrypted && typeof svc.env_vars_encrypted === "object") {
      try {
        const raw = decryptEnvVars(svc.env_vars_encrypted as Record<string, string>);
        envVars = reveal ? raw : maskEnvVars(raw);
      } catch {
        envVars = {};
      }
    }

    return {
      service_name: svc.service_name,
      status: svc.status,
      env_vars: Object.entries(envVars).map(([key, value]) => ({ key, value })),
    };
  });

  // Flatten all env vars
  const allEnvVars = result.flatMap((s) => s.env_vars);

  return NextResponse.json({ services: result, all_env_vars: allEnvVars });
}
