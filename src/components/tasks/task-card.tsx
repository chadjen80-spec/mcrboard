"use client";

import * as React from "react";
import { differenceInCalendarDays, format, isBefore, isToday, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarClock, CheckSquare, GripVertical, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberAvatar, MilestoneChip, PriorityBadge, TypeBadge } from "@/components/shared/badges";
import type { TaskItem } from "@/server/queries/tasks";

export const isOverdue = (t: Pick<TaskItem, "dueDate" | "status">) => Boolean(t.dueDate && t.status !== "DONE" && isBefore(new Date(t.dueDate), new Date()));

export function dueLabel(iso: string | null, status: string) {
  if (!iso) return { text: "ไม่มีกำหนด", tone: "muted" as const };
  const d = new Date(iso);
  if (status === "DONE") return { text: format(d, "d MMM", { locale: th }), tone: "muted" as const };
  const days = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  if (days < 0) return { text: `เลยกำหนด ${-days} วัน`, tone: "danger" as const };
  if (isToday(d)) return { text: "ส่งวันนี้", tone: "warning" as const };
  if (days === 1) return { text: "พรุ่งนี้", tone: "warning" as const };
  if (days <= 7) return { text: `อีก ${days} วัน`, tone: "normal" as const };
  return { text: format(d, "d MMM", { locale: th }), tone: "normal" as const };
}

export function TaskCard({ task, onClick, draggable, dragging, focused, compact, className }: { task: TaskItem; onClick?: () => void; draggable?: boolean; dragging?: boolean; focused?: boolean; compact?: boolean; className?: string }) {
  const due = dueLabel(task.dueDate, task.status);
  const done = task.checklist.filter((c) => c.done).length;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-md border bg-card p-2.5 text-sm shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow",
        dragging && "opacity-40",
        focused && "ring-2 ring-primary",
        due.tone === "danger" && "border-danger/50",
        className,
      )}
    >
      <div className="flex items-start gap-1.5">
        {draggable ? <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground" /> : null}
        <p className={cn("min-w-0 flex-1 font-medium leading-snug", task.status === "DONE" && "text-muted-foreground line-through decoration-muted-foreground/50")}>{task.title}</p>
        {task.assignee ? <MemberAvatar name={task.assignee.name} color={task.assignee.color} size="sm" /> : <span title="ยังไม่มอบหมาย" className="h-6 w-6 shrink-0 rounded-full border border-dashed" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <TypeBadge type={task.type} />
        {task.priority !== "MEDIUM" ? <PriorityBadge priority={task.priority} /> : null}
        <span className={cn("inline-flex items-center gap-1 text-[11px]", due.tone === "danger" ? "font-medium text-danger" : due.tone === "warning" ? "font-medium text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
          <CalendarClock className="h-3 w-3" /> {due.text}
        </span>
        {task.checklist.length ? (
          <span className={cn("inline-flex items-center gap-1 text-[11px] tabular", done === task.checklist.length ? "text-success" : "text-muted-foreground")}><CheckSquare className="h-3 w-3" /> {done}/{task.checklist.length}</span>
        ) : null}
        {task.commentCount ? <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><MessageSquare className="h-3 w-3" /> {task.commentCount}</span> : null}
      </div>
      {!compact && task.milestone ? <MilestoneChip name={task.milestone.name} color={task.milestone.color} className="mt-1.5" /> : null}
      {!compact && task.tags.length ? <div className="mt-1 flex flex-wrap gap-1">{task.tags.slice(0, 4).map((t) => <span key={t} className="rounded bg-muted px-1 text-[10px] text-muted-foreground">#{t}</span>)}</div> : null}
    </div>
  );
}
