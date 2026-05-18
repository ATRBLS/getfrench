"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServiceLogo } from "@/components/integrations/ServiceLogo";
import type { ServiceName } from "@/types";
import { Shield, Mail, Zap, DollarSign, Plus, CheckCircle2, Clock, Loader2 } from "lucide-react";

const AGENCY_STACK: ServiceName[] = ["vercel", "supabase", "stripe", "resend", "github"];

interface ClientStack {
  id: string;
  clientEmail: string;
  projectName: string;
  status: "pending" | "creating" | "active";
  createdAt: string;
  price: number;
}

const MOCK_STACKS: ClientStack[] = [
  { id: "1", clientEmail: "alice@startup.io", projectName: "alice-saas", status: "active", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), price: 149 },
  { id: "2", clientEmail: "bob@agency.fr", projectName: "bob-app", status: "active", createdAt: new Date(Date.now() - 86400000).toISOString(), price: 149 },
];

export default function AdminPage() {
  const [stacks] = useState<ClientStack[]>(MOCK_STACKS);
  const [clientEmail, setClientEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const totalRevenue = stacks.reduce((sum, s) => sum + s.price, 0);
  const activeCount = stacks.filter((s) => s.status === "active").length;

  async function handleCreate() {
    if (!clientEmail || !projectName) return;
    setCreating(true);
    // In production: call API to create project for client + charge $149
    await new Promise((r) => setTimeout(r, 2000));
    setCreating(false);
    setClientEmail("");
    setProjectName("");
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-600/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold">Mode Agence</h1>
          </div>
          <p className="text-muted-foreground">
            Crée des stacks pour tes clients et facture <span className="text-violet-400 font-semibold">$149</span> par setup.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalRevenue}</p>
                  <p className="text-xs text-muted-foreground">Revenus total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stacks.length}</p>
                  <p className="text-xs text-muted-foreground">Stacks créées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Stacks actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create stack for client */}
        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-violet-400" />
              Nouvelle stack client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email du client</label>
                <Input
                  type="email"
                  placeholder="client@startup.io"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="gap-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Nom du projet</label>
                <Input
                  placeholder="mon-projet-client"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
            </div>

            {/* Stack preview */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-3">Stack incluse (SaaS Standard) :</p>
              <div className="flex items-center gap-3">
                {AGENCY_STACK.map((svc) => (
                  <div key={svc} className="flex items-center gap-1.5">
                    <ServiceLogo service={svc} size="sm" />
                    <span className="text-xs capitalize">{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-violet-600/20 bg-violet-600/5">
              <div>
                <p className="font-semibold">Prix du setup</p>
                <p className="text-xs text-muted-foreground">Paiement unique — livraison immédiate</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-violet-400">$149</p>
                <p className="text-xs text-muted-foreground">one-shot</p>
              </div>
            </div>

            <Button
              variant="violet"
              size="lg"
              className="w-full gap-2"
              disabled={!clientEmail || !projectName || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>
              ) : (
                <><Mail className="w-4 h-4" /> Créer et facturer $149</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Client stacks list */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Stacks créées pour des clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stacks.map((stack) => (
              <div
                key={stack.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/30"
              >
                <div className="w-10 h-10 rounded-full bg-violet-600/15 border border-violet-600/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{stack.clientEmail}</p>
                  <p className="text-xs text-muted-foreground font-mono">{stack.projectName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={stack.status === "active" ? "success" : "violet"}>
                    {stack.status === "active" ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Actif</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> En cours</>
                    )}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">${stack.price}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(stack.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
