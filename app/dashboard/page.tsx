"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { ServiceLogo } from "@/components/integrations/ServiceLogo";
import type { Project, ServiceName } from "@/types";
import { PlusCircle, Plug, ArrowRight, Zap, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Integration {
  service_name: ServiceName;
  connected_at: string;
  is_active: boolean;
}

function ProjectCard({ project }: { project: Project }) {
  const services = project.project_services ?? [];
  const activeCount = services.filter((s) => s.status === "active").length;
  const errorCount = services.filter((s) => s.status === "error").length;
  const creatingCount = services.filter((s) => s.status === "creating").length;

  const statusVariant =
    project.status === "active" ? "success"
    : project.status === "error" ? "destructive"
    : project.status === "creating" ? "violet"
    : "secondary";

  return (
    <Link href={`/project/${project.id}`} className="group block">
      <Card className="glass hover:border-violet-600/30 transition-all duration-200 hover:shadow-lg hover:shadow-violet-900/10 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base group-hover:text-violet-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{project.slug}</p>
            </div>
            <Badge variant={statusVariant as Parameters<typeof Badge>[0]["variant"]}>
              {project.status === "active" && "Actif"}
              {project.status === "creating" && "Création..."}
              {project.status === "error" && "Erreur"}
              {project.status === "pending" && "En attente"}
            </Badge>
          </div>

          {/* Service logos */}
          <div className="flex items-center gap-2 mb-4">
            {project.stack.map((svc) => {
              const serviceStat = services.find((s) => s.service_name === svc);
              return (
                <div key={svc} className="relative">
                  <ServiceLogo service={svc as ServiceName} size="sm" />
                  {serviceStat && (
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={serviceStat.status} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {activeCount} actif{activeCount > 1 ? "s" : ""}
              </span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {errorCount} erreur{errorCount > 1 ? "s" : ""}
              </span>
            )}
            {creatingCount > 0 && (
              <span className="flex items-center gap-1 text-violet-400">
                <Clock className="w-3 h-3 animate-spin" />
                {creatingCount} en cours
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(project.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-violet-400 group-hover:text-muted-foreground/100 transition-all mt-3 ml-auto" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/integrations").then((r) => r.json()),
    ]).then(([projData, intgData]) => {
      setProjects(projData.projects ?? []);
      setIntegrations(intgData.integrations ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Refresh while any project is creating
  useEffect(() => {
    if (projects.some((p) => p.status === "creating")) {
      const timer = setInterval(async () => {
        const data = await fetch("/api/projects").then((r) => r.json());
        setProjects(data.projects ?? []);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [projects]);

  const connectedCount = integrations.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Tous tes projets StackLaunch</p>
          </div>
          <Link href="/new-project">
            <Button variant="violet" size="lg" className="gap-2">
              <PlusCircle className="w-5 h-5" />
              Nouveau projet
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600/15 border border-violet-600/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-xs text-muted-foreground">Projets total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeProjects}</p>
                  <p className="text-xs text-muted-foreground">Projets actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                  <Plug className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connectedCount}</p>
                  <p className="text-xs text-muted-foreground">Services connectés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected integrations summary */}
        {integrations.length > 0 && (
          <Card className="glass mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Connecté :</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {integrations.map((i) => (
                    <div key={i.service_name} className="flex items-center gap-1.5 bg-secondary rounded-md px-2 py-1">
                      <StatusDot status="active" />
                      <span className="text-xs capitalize">{i.service_name}</span>
                    </div>
                  ))}
                </div>
                <Link href="/connect" className="ml-auto text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Gérer <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl skeleton" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucun projet encore</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Crée ton premier projet et on s'occupe de tout configurer automatiquement.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {connectedCount === 0 && (
                  <Link href="/connect">
                    <Button variant="outline" className="gap-2">
                      <Plug className="w-4 h-4" />
                      Connecter des services
                    </Button>
                  </Link>
                )}
                <Link href="/new-project">
                  <Button variant="violet" className="gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Nouveau projet
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
