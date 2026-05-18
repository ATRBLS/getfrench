export type Plan = "free" | "pro" | "agency";
export type ProjectStatus = "pending" | "creating" | "active" | "error";
export type ServiceStatus = "pending" | "creating" | "active" | "error" | "skipped";
export type LogStatus = "info" | "success" | "error" | "warning";

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  plan: Plan;
  created_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  service_name: ServiceName;
  metadata: Record<string, unknown>;
  connected_at: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  stack: ServiceName[];
  status: ProjectStatus;
  created_at: string;
  project_services?: ProjectService[];
}

export interface ProjectService {
  id: string;
  project_id: string;
  service_name: ServiceName;
  external_project_id: string | null;
  status: ServiceStatus;
  error_message: string | null;
  created_at: string;
}

export interface StackTemplate {
  id: string;
  name: string;
  description: string;
  services: ServiceName[];
  is_default: boolean;
}

export interface ActionLog {
  id: string;
  project_id: string;
  service_name: string | null;
  action: string;
  status: LogStatus;
  message: string;
  created_at: string;
}

export type ServiceName =
  | "vercel"
  | "supabase"
  | "stripe"
  | "resend"
  | "github"
  | "openai"
  | "anthropic"
  | "elevenlabs"
  | "clerk"
  | "railway"
  | "posthog"
  | "upstash"
  | "cloudflare";

export interface ServiceMeta {
  name: ServiceName;
  label: string;
  description: string;
  category: ServiceCategory;
  logoUrl: string;
  color: string;
  authType: "oauth" | "api_key";
  priority: 1 | 2;
  envVarNames: string[];
}

export type ServiceCategory =
  | "Infrastructure"
  | "Database"
  | "Payments"
  | "Email"
  | "AI"
  | "Auth"
  | "Analytics"
  | "Cache";

export interface EnvVar {
  key: string;
  value: string;
}

export interface CreateProjectPayload {
  name: string;
  stack: ServiceName[];
}

export interface ProjectEnvResponse {
  env_vars: EnvVar[];
  services: {
    service_name: ServiceName;
    status: ServiceStatus;
    env_vars: EnvVar[];
  }[];
}
