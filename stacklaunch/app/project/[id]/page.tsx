"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { ServiceLogo } from "@/components/integrations/ServiceLogo";
import type { Project, ActionLog, ServiceName, ServiceStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, Copy, Download, Github, RefreshCw, CheckCircle2,
  ExternalLink, Clock, AlertCircle, ArrowLeft, Terminal,
} from "lucide-react";

interface EnvVar { key: string; value: string }
interface ServiceEnvData {
  service_name: ServiceName;
  status: ServiceStatus;
  env_vars: EnvVar[];
}

function EnvBlock({ vars, revealed }: { vars: EnvVar[]; revealed: boolean }) {
  const [copied, setCopied] = useState(false);

  const text = vars.map(({ key, value }) => `${key}=${value}`).join("\n");

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (vars.length === 0) return <p className="text-xs text-muted-foreground italic">Aucune variable</p>;

  return (
    <div className="group relative">
      <pre className="text-xs font-mono bg-secondary/50 rounded-lg p-3 overflow-x-auto leading-relaxed">
        {vars.map(({ key, value }) => (
          <div key={key}>
            <span className="text-muted-foreground">{key}</span>
            <span className="text-foreground/50">=</span>
            <span className={cn("text-violet-400", !revealed && "blur-[3px] select-none")}>{value}</span>
          </div>
        ))}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-secondary hover:bg-muted transition-all"
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [services, setServices] = useState<ServiceEnvData[]>([]);
  const [allEnvVars, setAllEnvVars] = useState<EnvVar[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"env" | "services" | "logs">("env");

  async function fetchAll(rev = revealed) {
    const [projData, envData, logsData] = await Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/env?reveal=${rev}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/logs`).then((r) => r.json()),
    ]);
    setProject(projData.project);
    setServices(envData.services ?? []);
    setAllEnvVars(envData.all_env_vars ?? []);
    setLogs(logsData.logs ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (project?.status === "creating") {
      const timer = setInterval(() => fetchAll(), 3000);
      return () => clearInterval(timer);
    }
  }, [project?.status]);

  async function handleReveal() {
    const newRevealed = !revealed;
    setRevealed(newRevealed);
    await fetchAll(newRevealed);
  }

  function copyAll() {
    const text = allEnvVars.map(({ key, value }) => `${key}=${value}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadEnv() {
    const text = allEnvVars.map(({ key, value }) => `${key}=${value}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.local`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-12 skeleton rounded-xl w-48" />
          <div className="h-48 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Projet introuvable</h2>
          <Link href="/dashboard" className="text-violet-400 hover:underline text-sm mt-2 inline-block">
            Retour au dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const projectServices = project.project_services ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge
                variant={
                  project.status === "active" ? "success"
                  : project.status === "error" ? "destructive"
                  : project.status === "creating" ? "violet"
                  : "secondary"
                }
              >
                <StatusDot status={project.status as ServiceStatus} />
                <span className="ml-1.5">
                  {project.status === "active" && "Actif"}
                  {project.status === "creating" && "Création..."}
                  {project.status === "error" && "Erreur"}
                  {project.status === "pending" && "En attente"}
                </span>
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              <code className="font-mono text-xs">{project.slug}</code>
              {" · "}
              Créé le {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchAll()}
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Service status cards */}
        <div className="flex flex-wrap gap-2 mb-6">
          {projectServices.map((svc) => (
            <div
              key={svc.service_name}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                svc.status === "active" && "border-emerald-500/20 bg-emerald-500/5",
                svc.status === "error" && "border-red-500/20 bg-red-500/5",
                svc.status === "creating" && "border-violet-500/20 bg-violet-500/5",
                svc.status === "pending" && "border-border bg-card/30 opacity-60",
              )}
            >
              <ServiceLogo service={svc.service_name as ServiceName} size="sm" />
              <span className="font-medium capitalize">{svc.service_name}</span>
              <StatusDot status={svc.status} label />
              {svc.external_project_id && svc.status === "active" && (
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground ml-1"
                  title={`ID: ${svc.external_project_id}`}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/50 rounded-lg p-1 w-fit">
          {(["env", "services", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "env" && "Variables d'env"}
              {tab === "services" && "Par service"}
              {tab === "logs" && "Logs"}
            </button>
          ))}
        </div>

        {/* ENV TAB */}
        {activeTab === "env" && (
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">.env complet</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleReveal} className="gap-1.5 text-xs">
                    {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {revealed ? "Masquer" : "Révéler"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5 text-xs">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copier tout
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadEnv} className="gap-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    .env
                  </Button>
                  {project.stack.includes("github") && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Github className="w-3.5 h-3.5" />
                      Sync GitHub
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allEnvVars.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {project.status === "creating"
                      ? "Génération des variables en cours..."
                      : "Aucune variable d'environnement disponible"}
                  </p>
                </div>
              ) : (
                <EnvBlock vars={allEnvVars} revealed={revealed} />
              )}
            </CardContent>
          </Card>
        )}

        {/* SERVICES TAB */}
        {activeTab === "services" && (
          <div className="space-y-3">
            {services.map((svc) => (
              <Card key={svc.service_name} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ServiceLogo service={svc.service_name as ServiceName} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{svc.service_name}</span>
                        <StatusDot status={svc.status} label />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReveal} className="text-xs gap-1">
                      {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {revealed ? "Masquer" : "Voir les clés"}
                    </Button>
                  </div>
                  <EnvBlock vars={svc.env_vars} revealed={revealed} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <Card className="glass">
            <CardContent className="p-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun log disponible</p>
                </div>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {new Date(log.created_at).toLocaleTimeString("fr-FR")}
                      </span>
                      {log.service_name && (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1.5 shrink-0">
                          {log.service_name}
                        </Badge>
                      )}
                      <span
                        className={cn(
                          "flex-1",
                          log.status === "success" && "text-emerald-400",
                          log.status === "error" && "text-red-400",
                          log.status === "warning" && "text-yellow-400",
                          log.status === "info" && "text-muted-foreground",
                        )}
                      >
                        {log.status === "success" && "✓ "}
                        {log.status === "error" && "✗ "}
                        {log.status === "warning" && "⚠ "}
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
