/**
 * GET  /api/projects — list projects for current user
 * POST /api/projects — create a new project
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { encryptEnvVars } from "@/lib/crypto";
import { orchestrateProjectCreation } from "@/lib/project-orchestrator";
import type { ServiceName, Integration } from "@/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function getUserId(clerkId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("users").select("id").eq("clerk_id", clerkId).single();
  return data?.id ?? null;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ projects: [] });

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`*, project_services(id, service_name, status, external_project_id, error_message)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { name, stack }: { name: string; stack: ServiceName[] } = await req.json();

  if (!name || !stack?.length) {
    return NextResponse.json({ error: "name and stack are required" }, { status: 400 });
  }

  // Check plan limits
  const { data: user } = await supabaseAdmin.from("users").select("plan").eq("id", userId).single();
  if (user?.plan === "free") {
    const { count } = await supabaseAdmin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= 1) {
      return NextResponse.json({ error: "Free plan is limited to 1 project. Upgrade to Pro." }, { status: 403 });
    }
  }

  const slug = slugify(name);

  // Create project record
  const { data: project, error: projErr } = await supabaseAdmin
    .from("projects")
    .insert({ user_id: userId, name, slug, stack, status: "pending" })
    .select()
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: projErr?.message ?? "Failed to create project" }, { status: 500 });
  }

  // Pre-create project_services rows
  const serviceRows = stack.map((svc) => ({
    project_id: project.id,
    service_name: svc,
    status: "pending",
  }));

  await supabaseAdmin.from("project_services").insert(serviceRows);

  // Fetch integrations
  const { data: rawIntegrations } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  const integrations: Record<string, Integration & { access_token_decrypted: string }> = {};
  for (const intg of rawIntegrations ?? []) {
    if (intg.access_token_encrypted) {
      try {
        integrations[intg.service_name] = {
          ...intg,
          access_token_decrypted: decrypt(intg.access_token_encrypted),
        };
      } catch {
        // skip integrations with invalid encryption
      }
    }
  }

  // Helper to log actions
  async function log(
    service: string | null,
    action: string,
    status: "info" | "success" | "error" | "warning",
    message: string
  ) {
    await supabaseAdmin.from("action_logs").insert({
      project_id: project.id,
      service_name: service,
      action,
      status,
      message,
    });
  }

  // Helper to update service status
  async function updateServiceStatus(service: ServiceName, status: string, externalId?: string, error?: string) {
    await supabaseAdmin
      .from("project_services")
      .update({
        status,
        ...(externalId ? { external_project_id: externalId } : {}),
        ...(error ? { error_message: error } : {}),
      })
      .eq("project_id", project.id)
      .eq("service_name", service);
  }

  // Helper to store encrypted env vars
  async function storeServiceEnvVars(service: ServiceName, envVars: Record<string, string>, externalId?: string) {
    const encrypted = encryptEnvVars(envVars);
    await supabaseAdmin
      .from("project_services")
      .update({
        env_vars_encrypted: encrypted,
        ...(externalId ? { external_project_id: externalId } : {}),
      })
      .eq("project_id", project.id)
      .eq("service_name", service);
  }

  // Run orchestration in the background (don't await — SSE or polling will track progress)
  orchestrateProjectCreation({
    project,
    integrations,
    log,
    updateServiceStatus,
    storeServiceEnvVars,
  }).catch(async (err) => {
    await supabaseAdmin.from("projects").update({ status: "error" }).eq("id", project.id);
    await log(null, "orchestration_failed", "error", err instanceof Error ? err.message : String(err));
  });

  return NextResponse.json({ project }, { status: 201 });
}
