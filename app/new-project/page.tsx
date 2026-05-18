"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ServiceLogo } from "@/components/integrations/ServiceLogo";
import { SERVICES_META } from "@/lib/services-meta";
import type { ServiceName, StackTemplate } from "@/types";
import { cn } from "@/lib/utils";
import { Zap, CheckCircle2, X, Loader2, ArrowRight, Info } from "lucide-react";

const TEMPLATE_ICONS: Record<string, string> = {
  "SaaS Standard": "🚀",
  "App IA": "🤖",
  "Side Project": "⚡",
  "Custom": "🛠",
};

function TemplateCard({
  template,
  selected,
  onSelect,
  connectedServices,
}: {
  template: StackTemplate;
  selected: boolean;
  onSelect: () => void;
  connectedServices: Set<string>;
}) {
  const missingServices = template.services.filter((s) => !connectedServices.has(s));
  const allConnected = missingServices.length === 0 || template.services.length === 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative rounded-xl border p-4 cursor-pointer transition-all duration-200",
        selected
          ? "border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-900/20"
          : "border-border bg-card/50 hover:border-border/80 hover:bg-card"
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-5 h-5 text-violet-400" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{TEMPLATE_ICONS[template.name] ?? "📦"}</span>
        <div>
          <h3 className="font-semibold text-sm">{template.name}</h3>
          {!allConnected && (
            <p className="text-xs text-yellow-400">{missingServices.length} service(s) non connecté(s)</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{template.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {template.services.map((svc) => (
          <div key={svc} className="relative">
            <ServiceLogo service={svc as ServiceName} size="sm" />
            {!connectedServices.has(svc) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-500 border border-background" />
            )}
          </div>
        ))}
        {template.services.length === 0 && (
          <span className="text-xs text-muted-foreground italic">Sélection libre</span>
        )}
      </div>
    </div>
  );
}

type CreationStep = {
  service: ServiceName | "orchestration";
  label: string;
  status: "pending" | "active" | "done" | "error";
};

function CreationProgress({ projectId, stack }: { projectId: string; stack: ServiceName[] }) {
  const router = useRouter();
  const [steps, setSteps] = useState<CreationStep[]>([
    { service: "orchestration", label: "Initialisation...", status: "active" },
    ...stack.map((s) => ({
      service: s,
      label: SERVICES_META[s].label,
      status: "pending" as const,
    })),
  ]);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
      const project = data.project;
      if (!project) return;

      const services = project.project_services ?? [];
      const newSteps: CreationStep[] = [
        {
          service: "orchestration",
          label: "Initialisation",
          status: project.status === "creating" || project.status === "active" ? "done" : "active",
        },
        ...stack.map((s) => {
          const svc = services.find((sv: { service_name: string; status: string }) => sv.service_name === s);
          return {
            service: s,
            label: SERVICES_META[s].label,
            status: (svc?.status ?? "pending") as CreationStep["status"],
          };
        }),
      ];

      setSteps(newSteps);

      const completed = newSteps.filter((s) => s.status === "done" || s.status === "error").length;
      setProgress(Math.round((completed / newSteps.length) * 100));

      if (project.status === "active" || project.status === "error") {
        setDone(true);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, stack]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">
          {done ? "Stack créée !" : "Création en cours..."}
        </h2>
        <p className="text-muted-foreground text-sm">
          {done ? "Tous les services ont été configurés." : "On configure tes services automatiquement."}
        </p>
      </div>

      <Progress value={progress} className="h-2" />
      <p className="text-center text-xs text-muted-foreground">{progress}% complété</p>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              step.status === "done" && "border-emerald-500/20 bg-emerald-500/5",
              step.status === "active" && "border-violet-500/30 bg-violet-500/5",
              step.status === "error" && "border-red-500/20 bg-red-500/5",
              step.status === "pending" && "border-border bg-card/30 opacity-50",
            )}
          >
            {step.service !== "orchestration" ? (
              <ServiceLogo service={step.service as ServiceName} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-violet-400" />
              </div>
            )}
            <span className="text-sm font-medium flex-1">{step.label}</span>
            {step.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {step.status === "active" && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
            {step.status === "error" && <X className="w-4 h-4 text-red-400" />}
            {step.status === "pending" && <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />}
          </div>
        ))}
      </div>

      {done && (
        <Button
          variant="violet"
          size="lg"
          className="w-full gap-2"
          onClick={() => router.push(`/project/${projectId}`)}
        >
          Voir le projet <ArrowRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [templates, setTemplates] = useState<StackTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<StackTemplate | null>(null);
  const [customStack, setCustomStack] = useState<Set<ServiceName>>(new Set());
  const [connectedServices, setConnectedServices] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/integrations").then((r) => r.json()),
    ]).then(([tmplData, intgData]) => {
      setTemplates(tmplData.templates ?? []);
      if (tmplData.templates?.length > 0) setSelectedTemplate(tmplData.templates[0]);
      setConnectedServices(new Set((intgData.integrations ?? []).map((i: { service_name: string }) => i.service_name)));
    });
  }, []);

  const isCustom = selectedTemplate?.name === "Custom";
  const activeStack: ServiceName[] = isCustom
    ? Array.from(customStack)
    : (selectedTemplate?.services as ServiceName[]) ?? [];

  function toggleCustomService(svc: ServiceName) {
    setCustomStack((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || activeStack.length === 0) return;
    setError(null);
    setCreating(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), stack: activeStack }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de la création");
      setCreating(false);
      return;
    }

    const data = await res.json();
    setCreatedProjectId(data.project.id);
  }

  if (createdProjectId) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-8">
          <Card className="glass">
            <CardContent className="p-8">
              <CreationProgress projectId={createdProjectId} stack={activeStack} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Nouveau projet</h1>
          <p className="text-muted-foreground mt-1">
            Choisis ta stack et on crée tout automatiquement.
          </p>
        </div>

        {/* Project name */}
        <Card className="glass mb-6">
          <CardContent className="p-6">
            <label className="text-sm font-medium block mb-2">Nom du projet</label>
            <Input
              placeholder="mon-saas-2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base h-12"
              autoFocus
            />
            {name && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Slug : <code className="font-mono">{name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</code>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Template selection */}
        <Card className="glass mb-6">
          <CardContent className="p-6">
            <label className="text-sm font-medium block mb-4">Choisis ta stack</label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedTemplate?.id === t.id}
                  onSelect={() => setSelectedTemplate(t)}
                  connectedServices={connectedServices}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom service selector */}
        {isCustom && (
          <Card className="glass mb-6">
            <CardContent className="p-6">
              <label className="text-sm font-medium block mb-4">Sélectionne tes services</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(SERVICES_META).map((meta) => {
                  const isSelected = customStack.has(meta.name);
                  const isConnected = connectedServices.has(meta.name);
                  return (
                    <button
                      key={meta.name}
                      onClick={() => toggleCustomService(meta.name)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                        isSelected
                          ? "border-violet-500 bg-violet-600/10"
                          : "border-border hover:border-border/80 bg-card/30"
                      )}
                    >
                      <div className="relative">
                        <ServiceLogo service={meta.name} size="md" />
                        {isConnected && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-background" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium leading-tight">{meta.label}</span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-violet-400" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active stack preview */}
        {activeStack.length > 0 && (
          <Card className="glass mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Stack active :</span>
                {activeStack.map((svc) => {
                  const isConnected = connectedServices.has(svc);
                  return (
                    <div key={svc} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5">
                      <ServiceLogo service={svc} size="sm" />
                      <span className="text-xs font-medium">{SERVICES_META[svc].label}</span>
                      {!isConnected && (
                        <Badge variant="warning" className="text-[9px] py-0 px-1">
                          Non connecté
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {activeStack.some((s) => !connectedServices.has(s)) && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
                  <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400/80">
                    Certains services ne sont pas connectés — ils seront ignorés lors de la création.{" "}
                    <a href="/connect" className="underline">Connecter les services</a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 flex items-start gap-2">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* CTA */}
        <Button
          variant="violet"
          size="xl"
          className="w-full gap-3 font-semibold"
          disabled={!name.trim() || activeStack.length === 0 || creating}
          onClick={handleCreate}
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" fill="currentColor" />
              Créer la stack — {activeStack.length} service{activeStack.length > 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}
