"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ServiceLogo } from "@/components/integrations/ServiceLogo";
import { SERVICES_META, PRIORITY_1_SERVICES } from "@/lib/services-meta";
import type { ServiceName, ServiceCategory } from "@/types";
import { CheckCircle2, ExternalLink, AlertCircle, X, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: ServiceCategory[] = [
  "Infrastructure", "Database", "Payments", "Email", "AI", "Auth", "Analytics", "Cache",
];

interface ConnectedIntegration {
  service_name: ServiceName;
  metadata: Record<string, unknown>;
  connected_at: string;
}

interface ApiKeyFormProps {
  service: ServiceName;
  fields: { key: string; label: string; placeholder: string }[];
  onSave: (values: Record<string, string>) => Promise<void>;
}

function ApiKeyForm({ service, fields, onSave }: ApiKeyFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(values);
    setSaving(false);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
          <Input
            type="password"
            placeholder={f.placeholder}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="h-8 text-xs font-mono"
          />
        </div>
      ))}
      <Button
        variant="violet"
        size="sm"
        onClick={handleSave}
        disabled={saving || fields.some((f) => !values[f.key])}
        className="w-full mt-2"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Sauvegarder
      </Button>
    </div>
  );
}

const API_KEY_FIELDS: Partial<Record<ServiceName, { key: string; label: string; placeholder: string }[]>> = {
  supabase: [{ key: "apiKey", label: "Management API Token", placeholder: "sbp_..." }],
  resend: [{ key: "apiKey", label: "API Key", placeholder: "re_..." }],
  openai: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }],
  anthropic: [{ key: "apiKey", label: "API Key", placeholder: "sk-ant-..." }],
  elevenlabs: [{ key: "apiKey", label: "API Key", placeholder: "..." }],
  clerk: [
    { key: "publishableKey", label: "Publishable Key", placeholder: "pk_test_..." },
    { key: "secretKey", label: "Secret Key", placeholder: "sk_test_..." },
  ],
  railway: [{ key: "apiKey", label: "API Token", placeholder: "..." }],
  posthog: [
    { key: "apiKey", label: "Project API Key", placeholder: "phc_..." },
    { key: "host", label: "Host (optionnel)", placeholder: "https://app.posthog.com" },
  ],
  upstash: [
    { key: "url", label: "REST URL", placeholder: "https://..." },
    { key: "token", label: "REST Token", placeholder: "..." },
  ],
  cloudflare: [
    { key: "apiToken", label: "API Token", placeholder: "..." },
    { key: "zoneId", label: "Zone ID (optionnel)", placeholder: "..." },
  ],
};

function ServiceCard({
  service,
  connected,
  onConnect,
  onDisconnect,
  onSaveApiKey,
}: {
  service: ServiceName;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSaveApiKey: (values: Record<string, string>) => Promise<void>;
}) {
  const meta = SERVICES_META[service];
  const [showForm, setShowForm] = useState(false);
  const isOAuth = meta.authType === "oauth";
  const isP1 = PRIORITY_1_SERVICES.includes(service);

  return (
    <Card
      className={cn(
        "glass transition-all duration-200",
        connected ? "border-emerald-500/20 shadow-emerald-900/5 shadow-sm" : "hover:border-border/80"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ServiceLogo service={service} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{meta.label}</span>
              {isP1 && (
                <Badge variant="violet" className="text-[10px] py-0 px-1.5">MVP</Badge>
              )}
              {connected && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5 gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Connecté
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {meta.description}
            </p>

            {/* Env vars preview */}
            <div className="flex flex-wrap gap-1 mt-2">
              {meta.envVarNames.slice(0, 2).map((v) => (
                <code key={v} className="text-[9px] bg-secondary rounded px-1 py-0.5 text-muted-foreground font-mono">
                  {v}
                </code>
              ))}
              {meta.envVarNames.length > 2 && (
                <span className="text-[9px] text-muted-foreground">+{meta.envVarNames.length - 2}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3">
          {connected ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className="flex-1 text-xs gap-1 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <X className="w-3 h-3" />
                Déconnecter
              </Button>
            </div>
          ) : isOAuth ? (
            <Button variant="violet" size="sm" onClick={onConnect} className="w-full text-xs gap-1">
              <ExternalLink className="w-3 h-3" />
              Connecter via OAuth
            </Button>
          ) : (
            <>
              <Button
                variant={showForm ? "ghost" : "violet"}
                size="sm"
                onClick={() => setShowForm(!showForm)}
                className="w-full text-xs gap-1"
              >
                <KeyRound className="w-3 h-3" />
                {showForm ? "Annuler" : "Entrer la clé API"}
              </Button>
              {showForm && (
                <ApiKeyForm
                  service={service}
                  fields={API_KEY_FIELDS[service] ?? [{ key: "apiKey", label: "API Key", placeholder: "..." }]}
                  onSave={async (values) => {
                    await onSaveApiKey(values);
                    setShowForm(false);
                  }}
                />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "Tout">("Tout");
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchIntegrations();

    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) setNotification({ type: "success", msg: `${success} connecté avec succès !` });
    if (error) setNotification({ type: "error", msg: decodeURIComponent(error) });

    if (success || error) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function fetchIntegrations() {
    const data = await fetch("/api/integrations").then((r) => r.json());
    setIntegrations(data.integrations ?? []);
    setLoading(false);
  }

  async function handleOAuthConnect(service: ServiceName) {
    const res = await fetch(`/api/integrations/oauth-url?service=${service}`).then((r) => r.json());
    if (res.url) window.location.href = res.url;
  }

  async function handleSaveApiKey(service: ServiceName, values: Record<string, string>) {
    // Map form values to a single API key string (first non-empty value)
    const primaryKey = values.apiKey ?? values.publishableKey ?? Object.values(values)[0];

    const res = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service,
        apiKey: primaryKey,
        metadata: values,
      }),
    });

    if (res.ok) {
      setNotification({ type: "success", msg: `${SERVICES_META[service].label} connecté !` });
      await fetchIntegrations();
    } else {
      const err = await res.json();
      setNotification({ type: "error", msg: err.error ?? "Erreur lors de la sauvegarde" });
    }
    setTimeout(() => setNotification(null), 4000);
  }

  async function handleDisconnect(service: ServiceName) {
    await fetch("/api/integrations/connect", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    await fetchIntegrations();
  }

  const connectedSet = new Set(integrations.map((i) => i.service_name));

  const allServices = Object.values(SERVICES_META);
  const filtered =
    activeCategory === "Tout"
      ? allServices
      : allServices.filter((s) => s.category === activeCategory);

  const categories: ("Tout" | ServiceCategory)[] = ["Tout", ...CATEGORIES];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Notification */}
        {notification && (
          <div
            className={cn(
              "fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all",
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {notification.msg}
            <button onClick={() => setNotification(null)}>
              <X className="w-3.5 h-3.5 ml-2 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Hub des intégrations</h1>
          <p className="text-muted-foreground mt-1">
            Connecte tes services une seule fois — ils seront disponibles pour tous tes projets.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-violet-600/5 border border-violet-600/15 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-violet-400 font-semibold">{integrations.length} service{integrations.length > 1 ? "s" : ""} connecté{integrations.length > 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">sur {allServices.length} disponibles</span>
            {integrations.length > 0 && (
              <div className="ml-auto flex gap-1.5">
                {integrations.map((i) => (
                  <ServiceLogo key={i.service_name} service={i.service_name} size="sm" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeCategory === cat
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((meta) => (
              <ServiceCard
                key={meta.name}
                service={meta.name}
                connected={connectedSet.has(meta.name)}
                onConnect={() => handleOAuthConnect(meta.name)}
                onDisconnect={() => handleDisconnect(meta.name)}
                onSaveApiKey={(values) => handleSaveApiKey(meta.name, values)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
