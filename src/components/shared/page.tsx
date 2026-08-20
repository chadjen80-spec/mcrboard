import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, children }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center", className)}>
      {Icon ? <Icon className="mb-3 h-8 w-8 text-muted-foreground" /> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub, tone, className, icon: Icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "danger" | "warning" | "success" | "info"; className?: string; icon?: LucideIcon }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3.5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? <Icon className={cn("h-4 w-4 text-muted-foreground", tone === "danger" && "text-danger", tone === "warning" && "text-warning-foreground", tone === "success" && "text-success", tone === "info" && "text-info")} /> : null}
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular", tone === "danger" && "text-danger")}>{value}</p>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <h2 className="text-sm font-semibold">{children}</h2>
      {right}
    </div>
  );
}

export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${v}%`, backgroundColor: color }} />
    </div>
  );
}
