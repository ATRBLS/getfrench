-- StackLaunch — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  plan         TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users(clerk_id);

-- ============================================================
-- INTEGRATIONS  (OAuth tokens & API keys — all encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name             TEXT NOT NULL,
  access_token_encrypted   TEXT,
  refresh_token_encrypted  TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}',
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, service_name)
);

CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_service_idx ON integrations(service_name);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  stack       TEXT[] NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'creating', 'active', 'error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- ============================================================
-- PROJECT SERVICES  (one row per service per project)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_services (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  service_name         TEXT NOT NULL,
  external_project_id  TEXT,
  env_vars_encrypted   JSONB NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'creating', 'active', 'error', 'skipped')),
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, service_name)
);

CREATE INDEX IF NOT EXISTS project_services_project_id_idx ON project_services(project_id);

-- ============================================================
-- STACK TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS stack_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  services    TEXT[] NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEFAULT TEMPLATES
-- ============================================================
INSERT INTO stack_templates (name, description, services, is_default) VALUES
  (
    'SaaS Standard',
    'La stack complète pour un SaaS : hosting, DB, paiements, emails et repo.',
    ARRAY['vercel', 'supabase', 'stripe', 'resend', 'github'],
    TRUE
  ),
  (
    'App IA',
    'Pour les apps propulsées par l''IA : LLM, voix, base vectorielle.',
    ARRAY['vercel', 'supabase', 'openai', 'elevenlabs', 'resend', 'github'],
    TRUE
  ),
  (
    'Side Project',
    'Rapide et léger : hosting, DB et repo, c''est tout.',
    ARRAY['vercel', 'supabase', 'github'],
    TRUE
  ),
  (
    'Custom',
    'Sélectionne les services à la carte selon ton besoin.',
    ARRAY[]::TEXT[],
    TRUE
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ACTION LOGS  (historique des actions de création)
-- ============================================================
CREATE TABLE IF NOT EXISTS action_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  service_name TEXT,
  action       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'info' CHECK (status IN ('info', 'success', 'error', 'warning')),
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS action_logs_project_id_idx ON action_logs(project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_templates  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — all access goes through server-side API routes
-- using the service role key, so no client-side policies needed.
-- Read-only public access to templates:
CREATE POLICY "stack_templates_public_read" ON stack_templates
  FOR SELECT USING (TRUE);
