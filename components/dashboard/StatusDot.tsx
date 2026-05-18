import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types";

interface Props {
  status: ServiceStatus | "active" | "error" | "pending" | "creating" | "skipped";
  label?: boolean;
  size?: "sm" | "md";
}

const STATUS_CONFIG = {
  active: { dot: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Actif", pulse: false },
  error: { dot: "bg-red-500", ring: "ring-red-500/30", label: "Erreur", pulse: false },
  pending: { dot: "bg-zinc-500", ring: "ring-zinc-500/30", label: "En attente", pulse: false },
  creating: { dot: "bg-violet-500", ring: "ring-violet-500/30", label: "Création...", pulse: true },
  skipped: { dot: "bg-zinc-600", ring: "ring-zinc-600/30", label: "Ignoré", pulse: false },
};

export function StatusDot({ status, label = false, size = "sm" }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("rounded-full ring-2 shrink-0", dotSize, cfg.dot, cfg.ring, cfg.pulse && "animate-pulse")} />
      {label && <span className="text-xs text-muted-foreground">{cfg.label}</span>}
    </span>
  );
}
