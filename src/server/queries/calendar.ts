import "server-only";
import type { EventKind } from "@prisma/client";
import { db } from "@/lib/db";
import { listTasks, type TaskItem } from "./tasks";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  kind: EventKind;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  milestoneId: string | null;
  milestone: { id: string; name: string; color: string } | null;
}

export async function listEvents(range?: { from: Date; to: Date }): Promise<EventItem[]> {
  const rows = await db.event.findMany({
    where: range ? { startAt: { gte: range.from, lte: range.to } } : undefined,
    include: { milestone: { select: { id: true, name: true, color: true } } },
    orderBy: { startAt: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    kind: e.kind,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    allDay: e.allDay,
    milestoneId: e.milestoneId,
    milestone: e.milestone,
  }));
}

/** Tasks with a due date inside the range + all events in the range. */
export async function calendarData(range: { from: Date; to: Date }, filters: { assignee?: string; milestone?: string } = {}): Promise<{ tasks: TaskItem[]; events: EventItem[] }> {
  const [tasks, events] = await Promise.all([listTasks({ assignee: filters.assignee, milestone: filters.milestone }), listEvents(range)]);
  const from = range.from.getTime();
  const to = range.to.getTime();
  return {
    tasks: tasks.filter((t) => {
      const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
      const start = t.startDate ? new Date(t.startDate).getTime() : null;
      if (due !== null && due >= from && due <= to) return true;
      if (start !== null && due !== null && start <= to && due >= from) return true; // spans range (timeline)
      return false;
    }),
    events,
  };
}
