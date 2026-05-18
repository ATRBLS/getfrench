/**
 * Core orchestrator — creates all project services in sequence
 * and wires them together (env vars injection, webhooks, GitHub→Vercel link).
 */

import { supabaseAdmin } from "@/lib/supabase";
import { encrypt, encryptEnvVars } from "@/lib/crypto";
import { decrypt } from "@/lib/crypto";
import type { ServiceName, Project, Integration } from "@/types";

import * as VercelLib from "@/lib/integrations/vercel";
import * as SupabaseMgmt from "@/lib/integrations/supabase-mgmt";
import * as StripeLib from "@/lib/integrations/stripe";
import * as GitHubLib from "@/lib/integrations/github";

interface OrchestratorContext {
  project: Project;
  integrations: Record<string, Integration & { access_token_decrypted: string }>;
  log: (service: string | null, action: string, status: "info" | "success" | "error" | "warning", message: string) => Promise<void>;
  updateServiceStatus: (service: ServiceName, status: string, externalId?: string, error?: string) => Promise<void>;
  storeServiceEnvVars: (service: ServiceName, envVars: Record<string, string>, externalId?: string) => Promise<void>;
}

export async function orchestrateProjectCreation(ctx: OrchestratorContext): Promise<void> {
  const { project, integrations, log, updateServiceStatus, storeServiceEnvVars } = ctx;
  const stack = project.stack as ServiceName[];

  // Collected env vars from each service — used for cross-injection
  const collectedEnvVars: Partial<Record<ServiceName, Record<string, string>>> = {};

  // Update project status to "creating"
  await supabaseAdmin
    .from("projects")
    .update({ status: "creating" })
    .eq("id", project.id);

  await log(null, "orchestration_start", "info", `Démarrage de la création pour ${project.name} (${stack.join(", ")})`);

  // ── 1. GITHUB ───────────────────────────────────────────────────────────────
  if (stack.includes("github") && integrations.github) {
    await updateServiceStatus("github", "creating");
    await log("github", "create_repo", "info", `Création du repo GitHub "${project.slug}"...`);

    try {
      const token = integrations.github.access_token_decrypted;
      const user = await GitHubLib.getUser(token);
      const repo = await GitHubLib.createRepo(token, project.slug, true);
      await GitHubLib.pushBoilerplate(token, user.login, repo.name, project.name);

      const envVars = GitHubLib.getEnvVars(repo.html_url, repo.name, user.login);
      collectedEnvVars.github = envVars;

      await storeServiceEnvVars("github", envVars, String(repo.id));
      await updateServiceStatus("github", "active", String(repo.id));
      await log("github", "create_repo", "success", `Repo créé : ${repo.html_url}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateServiceStatus("github", "error", undefined, msg);
      await log("github", "create_repo", "error", msg);
    }
  }

  // ── 2. SUPABASE ─────────────────────────────────────────────────────────────
  if (stack.includes("supabase") && integrations.supabase) {
    await updateServiceStatus("supabase", "creating");
    await log("supabase", "create_project", "info", `Création du projet Supabase "${project.slug}"...`);

    try {
      const token = integrations.supabase.access_token_decrypted;
      const orgId = await SupabaseMgmt.getFirstOrg(token);
      const supaProject = await SupabaseMgmt.createProject(token, project.slug, orgId);

      // Wait for project to be ready (max 60s)
      let ready = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const validateRes = await SupabaseMgmt.validateToken(token);
        if (validateRes.valid) { ready = true; break; }
      }

      if (!ready) {
        await log("supabase", "create_project", "warning", "Supabase project may still be provisioning. Keys fetched.");
      }

      const keys = await SupabaseMgmt.getProjectKeys(token, supaProject.id);
      const envVars = SupabaseMgmt.getEnvVars(supaProject.id, keys.anon, keys.service_role);
      collectedEnvVars.supabase = envVars;

      await storeServiceEnvVars("supabase", envVars, supaProject.id);
      await updateServiceStatus("supabase", "active", supaProject.id);
      await log("supabase", "create_project", "success", `Projet Supabase créé : ${supaProject.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateServiceStatus("supabase", "error", undefined, msg);
      await log("supabase", "create_project", "error", msg);
    }
  }

  // ── 3. VERCEL ───────────────────────────────────────────────────────────────
  let vercelProjectUrl: string | undefined;
  if (stack.includes("vercel") && integrations.vercel) {
    await updateServiceStatus("vercel", "creating");
    await log("vercel", "create_project", "info", `Création du projet Vercel "${project.slug}"...`);

    try {
      const token = integrations.vercel.access_token_decrypted;
      const meta = integrations.vercel.metadata as { team_id?: string; org_id?: string };
      const teamId = meta?.team_id ?? undefined;
      const orgId = meta?.org_id ?? "personal";

      const vercelProject = await VercelLib.createProject(token, project.slug, teamId);
      vercelProjectUrl = `https://${project.slug}.vercel.app`;

      // Inject Supabase env vars into Vercel
      if (collectedEnvVars.supabase) {
        await log("vercel", "inject_supabase_env", "info", "Injection des env vars Supabase dans Vercel...");
        await VercelLib.setEnvVars(token, vercelProject.id, collectedEnvVars.supabase, teamId);
        await log("vercel", "inject_supabase_env", "success", "Env vars Supabase injectées dans Vercel.");
      }

      // Connect GitHub repo to Vercel
      if (collectedEnvVars.github) {
        const { GITHUB_OWNER, GITHUB_REPO_NAME } = collectedEnvVars.github;
        if (GITHUB_OWNER && GITHUB_REPO_NAME) {
          try {
            await VercelLib.connectGitRepo(token, vercelProject.id, GITHUB_OWNER, GITHUB_REPO_NAME, teamId);
            await log("vercel", "connect_github", "success", `Repo ${GITHUB_OWNER}/${GITHUB_REPO_NAME} connecté à Vercel.`);
          } catch (linkErr) {
            await log("vercel", "connect_github", "warning", `GitHub→Vercel link failed (needs GitHub OAuth on Vercel): ${linkErr}`);
          }
        }
      }

      const envVars = VercelLib.getEnvVars(token, vercelProject.id, orgId, vercelProjectUrl);
      collectedEnvVars.vercel = envVars;

      await storeServiceEnvVars("vercel", envVars, vercelProject.id);
      await updateServiceStatus("vercel", "active", vercelProject.id);
      await log("vercel", "create_project", "success", `Projet Vercel créé : ${vercelProject.url ?? vercelProjectUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateServiceStatus("vercel", "error", undefined, msg);
      await log("vercel", "create_project", "error", msg);
    }
  }

  // ── 4. STRIPE ───────────────────────────────────────────────────────────────
  if (stack.includes("stripe") && integrations.stripe) {
    await updateServiceStatus("stripe", "creating");
    await log("stripe", "setup_webhooks", "info", "Configuration des webhooks Stripe...");

    try {
      const token = integrations.stripe.access_token_decrypted;
      const meta = integrations.stripe.metadata as {
        stripe_publishable_key?: string;
        stripe_account_id?: string;
      };

      const webhookUrl = vercelProjectUrl
        ? `${vercelProjectUrl}/api/webhooks/stripe`
        : `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe-placeholder`;

      const webhook = await StripeLib.createWebhook(token, webhookUrl);
      const envVars = StripeLib.getEnvVars(
        token,
        meta?.stripe_publishable_key ?? "",
        webhook.secret,
        meta?.stripe_account_id ?? ""
      );
      collectedEnvVars.stripe = envVars;

      // Inject Stripe env vars into Vercel
      if (collectedEnvVars.vercel && integrations.vercel) {
        const vercelMeta = integrations.vercel.metadata as { team_id?: string };
        try {
          await VercelLib.setEnvVars(
            integrations.vercel.access_token_decrypted,
            collectedEnvVars.vercel.VERCEL_PROJECT_ID,
            {
              STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY,
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
              STRIPE_WEBHOOK_SECRET: envVars.STRIPE_WEBHOOK_SECRET,
            },
            vercelMeta?.team_id
          );
          await log("stripe", "inject_vercel_env", "success", "Env vars Stripe injectées dans Vercel.");
        } catch {
          await log("stripe", "inject_vercel_env", "warning", "Impossible d'injecter les env vars Stripe dans Vercel.");
        }
      }

      await storeServiceEnvVars("stripe", envVars, webhook.id);
      await updateServiceStatus("stripe", "active", webhook.id);
      await log("stripe", "setup_webhooks", "success", `Webhook Stripe créé : ${webhookUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateServiceStatus("stripe", "error", undefined, msg);
      await log("stripe", "setup_webhooks", "error", msg);
    }
  }

  // ── 5. RESEND ───────────────────────────────────────────────────────────────
  if (stack.includes("resend") && integrations.resend) {
    await updateServiceStatus("resend", "creating");
    await log("resend", "validate_key", "info", "Validation de la clé Resend...");

    try {
      const token = integrations.resend.access_token_decrypted;
      const valid = await import("@/lib/integrations/resend").then((m) => m.validateApiKey(token));

      if (!valid.valid) throw new Error("Clé Resend invalide");

      const envVars = { RESEND_API_KEY: token };
      collectedEnvVars.resend = envVars;

      await storeServiceEnvVars("resend", envVars);
      await updateServiceStatus("resend", "active");
      await log("resend", "validate_key", "success", "Clé Resend validée et stockée.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateServiceStatus("resend", "error", undefined, msg);
      await log("resend", "validate_key", "error", msg);
    }
  }

  // ── 6. PRIORITY-2 SERVICES (store API keys as-is) ───────────────────────────
  const p2Services: ServiceName[] = ["openai", "anthropic", "elevenlabs", "clerk", "railway", "posthog", "upstash", "cloudflare"];
  for (const svc of p2Services) {
    if (stack.includes(svc) && integrations[svc]) {
      await updateServiceStatus(svc, "creating");
      try {
        const token = integrations[svc].access_token_decrypted;
        const { API_KEY_ENV_MAP } = await import("@/lib/integrations/generic-api-key");
        const keys = API_KEY_ENV_MAP[svc] ?? [];
        const envVars = Object.fromEntries(keys.map((k) => [k, token]));

        await storeServiceEnvVars(svc, envVars);
        await updateServiceStatus(svc, "active");
        await log(svc, "store_key", "success", `Clé ${svc} stockée.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateServiceStatus(svc, "error", undefined, msg);
        await log(svc, "store_key", "error", msg);
      }
    }
  }

  // ── 7. Update .env.example in GitHub ────────────────────────────────────────
  if (collectedEnvVars.github && integrations.github) {
    try {
      const token = integrations.github.access_token_decrypted;
      const user = await GitHubLib.getUser(token);
      const allKeys = Object.values(collectedEnvVars).flatMap((v) => Object.keys(v ?? {}));
      await GitHubLib.updateEnvExample(token, user.login, project.slug, allKeys);
      await log("github", "update_env_example", "success", ".env.example mis à jour dans GitHub.");
    } catch {
      await log("github", "update_env_example", "warning", "Impossible de mettre à jour .env.example dans GitHub.");
    }
  }

  // ── 8. Mark project as active ───────────────────────────────────────────────
  await supabaseAdmin
    .from("projects")
    .update({ status: "active" })
    .eq("id", project.id);

  await log(null, "orchestration_complete", "success", "Tous les services ont été créés. Projet actif !");
}
