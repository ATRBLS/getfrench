import type { ServiceName } from "@/types";
import { cn } from "@/lib/utils";

const LOGOS: Record<ServiceName, string> = {
  vercel: "▲",
  supabase: "⚡",
  stripe: "◆",
  resend: "✉",
  github: "⬡",
  openai: "◎",
  anthropic: "◇",
  elevenlabs: "♪",
  clerk: "⬤",
  railway: "◈",
  posthog: "◉",
  upstash: "⟰",
  cloudflare: "☁",
};

const COLORS: Record<ServiceName, string> = {
  vercel: "bg-white/10 text-white",
  supabase: "bg-emerald-500/15 text-emerald-400",
  stripe: "bg-violet-500/15 text-violet-400",
  resend: "bg-white/10 text-white",
  github: "bg-white/10 text-white",
  openai: "bg-teal-500/15 text-teal-400",
  anthropic: "bg-orange-500/15 text-orange-400",
  elevenlabs: "bg-yellow-500/15 text-yellow-400",
  clerk: "bg-indigo-500/15 text-indigo-400",
  railway: "bg-white/10 text-white",
  posthog: "bg-yellow-500/15 text-yellow-400",
  upstash: "bg-emerald-500/15 text-emerald-400",
  cloudflare: "bg-orange-500/15 text-orange-400",
};

interface Props {
  service: ServiceName;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ServiceLogo({ service, size = "md", className }: Props) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-12 h-12 text-xl" };

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-bold border border-white/5 shrink-0",
        sizes[size],
        COLORS[service],
        className
      )}
    >
      {LOGOS[service]}
    </div>
  );
}
