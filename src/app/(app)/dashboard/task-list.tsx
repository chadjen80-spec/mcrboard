"use client";

import { cn } from "@/lib/utils";
import { MemberAvatar, PriorityBadge, StatusBadge, TypeBadge } from "@/components/shared/badges";
import { dueLabel } from "@/components/tasks/task-card";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import type { TaskItem } from "@/server/queries/tasks";

export function TaskList({ tasks, empty = "ไม่มีงาน" }: { tasks: TaskItem[]; empty?: string }) {
  const { openEdit } = useTaskDialog();
  if (tasks.length === 0) return <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="divide-y rounded-lg border bg-card">
      {tasks.map((t) => {
        const due = dueLabel(t.dueDate, t.status);
        return (
          <button key={t.id} onClick={() => openEdit(t)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/60">
            <TypeBadge type={t.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{t.milestone?.name ?? "ไม่มี milestone"}{t.tags.length ? ` · ${t.tags.map((x) => `#${x}`).join(" ")}` : ""}</p>
            </div>
            {t.priority !== "MEDIUM" ? <PriorityBadge priority={t.priority} /> : null}
            <StatusBadge status={t.status} className="hidden sm:inline-flex" />
            <span className={cn("w-24 shrink-0 text-right text-[11px] tabular", due.tone === "danger" ? "font-medium text-danger" : due.tone === "warning" ? "font-medium text-warning-foreground dark:text-warning" : "text-muted-foreground")}>{due.text}</span>
            {t.assignee ? <MemberAvatar name={t.assignee.name} color={t.assignee.color} size="sm" /> : <span className="h-6 w-6 shrink-0 rounded-full border border-dashed" />}
          </button>
        );
      })}
    </div>
  );
}
