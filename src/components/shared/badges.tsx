import * as React from "react";
import type { EventKind, MilestoneStatus, Priority, TaskStatus, TaskType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EVENT_COLOR, EVENT_LABEL, MILESTONE_LABEL, MILESTONE_VARIANT, PRIORITY_LABEL, PRIORITY_VARIANT, STATUS_LABEL, STATUS_VARIANT, TYPE_COLOR, TYPE_SHORT } from "@/lib/constants";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return <Badge variant={STATUS_VARIANT[status]} className={className}>{STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <Badge variant={PRIORITY_VARIANT[priority]} className={cn("px-1.5", className)}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function TypeBadge({ type, className, short = true }: { type: TaskType; className?: string; short?: boolean }) {
  const c = TYPE_COLOR[type];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-4 whitespace-nowrap", className)} style={{ borderColor: `${c}55`, color: c, backgroundColor: `${c}14` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {short ? TYPE_SHORT[type] : TYPE_SHORT[type]}
    </span>
  );
}

export function MilestoneBadge({ status, className }: { status: MilestoneStatus; className?: string }) {
  return <Badge variant={MILESTONE_VARIANT[status]} className={className}>{MILESTONE_LABEL[status]}</Badge>;
}

export function MilestoneChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground", className)}>
      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function EventKindBadge({ kind, className }: { kind: EventKind; className?: string }) {
  const c = EVENT_COLOR[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-4", className)} style={{ borderColor: `${c}55`, color: c, backgroundColor: `${c}14` }}>
      {EVENT_LABEL[kind]}
    </span>
  );
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}

export function MemberAvatar({ name, color, size = "sm", className, title }: { name: string; color: string; size?: "xs" | "sm" | "md" | "lg"; className?: string; title?: string }) {
  const dim = { xs: "h-5 w-5 text-[9px]", sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" }[size];
  return (
    <span title={title ?? name} className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-background", dim, className)} style={{ backgroundColor: color }}>
      {initialsOf(name)}
    </span>
  );
}

export function MemberPill({ name, color, className, unassignedLabel = "ยังไม่มอบหมาย" }: { name?: string | null; color?: string | null; className?: string; unassignedLabel?: string }) {
  if (!name) return <span className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground/80", className)}><span className="h-5 w-5 rounded-full border border-dashed" />{unassignedLabel}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px]", className)}>
      <MemberAvatar name={name} color={color ?? "#888"} size="xs" />
      <span className="truncate">{name}</span>
    </span>
  );
}
