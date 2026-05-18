import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/20 text-destructive border-destructive/30",
        outline: "border-border text-muted-foreground",
        success: "border-transparent bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        warning: "border-transparent bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        info: "border-transparent bg-blue-500/20 text-blue-400 border-blue-500/30",
        violet: "border-transparent bg-violet-500/20 text-violet-400 border-violet-500/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
