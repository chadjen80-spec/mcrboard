import "server-only";
import { addDays, endOfDay, startOfDay } from "date-fns";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { listEvents } from "./calendar";
import { listTasks, type TaskItem } from "./tasks";

export interface MilestoneSummary {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNED" | "ACTIVE" | "DONE";
  color: string;
  startDate: string | null;
  endDate: string | null;
  order: number;
  total: number;
  done: number;
  doing: number;
  overdue: number;
  byStatus: Record<TaskStatus, number>;
  estimateHours: number;
  remainingHours: number;
}

export async function listMilestones(): Promise<MilestoneSummary[]> {
  const [ms, tasks] = await Promise.all([db.milestone.findMany({ orderBy: { order: "asc" } }), db.task.findMany({ select: { milestoneId: true, status: true, dueDate: true, estimateHours: true } })]);
  const now = new Date();
  return ms.map((m) => {
    const ts = tasks.filter((t) => t.milestoneId === m.id);
    const byStatus: Record<TaskStatus, number> = { BACKLOG: 0, TODO: 0, DOING: 0, REVIEW: 0, DONE: 0 };
    let estimate = 0;
    let remaining = 0;
    for (const t of ts) {
      byStatus[t.status]++;
      estimate += t.estimateHours ?? 0;
      if (t.status !== "DONE") remaining += t.estimateHours ?? 0;
    }
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      status: m.status,
      color: m.color,
      startDate: m.startDate?.toISOString() ?? null,
      endDate: m.endDate?.toISOString() ?? null,
      order: m.order,
      total: ts.length,
      done: byStatus.DONE,
      doing: byStatus.DOING + byStatus.REVIEW,
      overdue: ts.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now).length,
      byStatus,
      estimateHours: estimate,
      remainingHours: remaining,
    };
  });
}

export interface MemberSummary {
  id: string;
  name: string;
  role: string;
  color: string;
  discordId: string | null;
  active: boolean;
  open: number;
  doing: number;
  done: number;
  overdue: number;
  hours: number;
}

export async function listMembers(): Promise<MemberSummary[]> {
  const [members, tasks] = await Promise.all([db.member.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }), db.task.findMany({ select: { assigneeId: true, status: true, dueDate: true, estimateHours: true } })]);
  const now = new Date();
  return members.map((m) => {
    const ts = tasks.filter((t) => t.assigneeId === m.id);
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      color: m.color,
      discordId: m.discordId,
      active: m.active,
      open: ts.filter((t) => t.status !== "DONE").length,
      doing: ts.filter((t) => t.status === "DOING" || t.status === "REVIEW").length,
      done: ts.filter((t) => t.status === "DONE").length,
      overdue: ts.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now).length,
      hours: ts.filter((t) => t.status !== "DONE").reduce((a, t) => a + (t.estimateHours ?? 0), 0),
    };
  });
}

export async function dashboardData(meId: string | null) {
  const now = new Date();
  const today0 = startOfDay(now);
  const weekEnd = endOfDay(addDays(today0, 6));
  const [tasks, milestones, members, events, activity] = await Promise.all([
    listTasks(),
    listMilestones(),
    listMembers(),
    listEvents({ from: today0, to: addDays(today0, 14) }),
    db.activity.findMany({ include: { actor: { select: { id: true, name: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const open = tasks.filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const dueThisWeek = open.filter((t) => t.dueDate && new Date(t.dueDate) >= today0 && new Date(t.dueDate) <= weekEnd);
  const doneThisWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= addDays(today0, -6));
  const mine = meId ? open.filter((t) => t.assigneeId === meId) : [];
  const byStatus: Record<TaskStatus, number> = { BACKLOG: 0, TODO: 0, DOING: 0, REVIEW: 0, DONE: 0 };
  for (const t of tasks) byStatus[t.status]++;
  const upcoming: TaskItem[] = [...open].filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 8);
  return {
    counts: { total: tasks.length, open: open.length, overdue: overdue.length, dueThisWeek: dueThisWeek.length, doneThisWeek: doneThisWeek.length, review: byStatus.REVIEW, doing: byStatus.DOING },
    byStatus,
    mine,
    overdue,
    upcoming,
    milestones,
    members: members.filter((m) => m.active),
    events,
    activity: activity.map((a) => ({ id: a.id, action: a.action, summary: a.summary, createdAt: a.createdAt.toISOString(), actor: a.actor })),
  };
}
