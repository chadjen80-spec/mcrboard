import "server-only";
import type { Prisma, TaskStatus, TaskType, Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJson, parseStringArray } from "@/lib/json";
import type { ChecklistItem } from "@/lib/constants";

export interface TaskFilters {
  q?: string;
  assignee?: string; // member id | "me" handled by page | "none"
  milestone?: string; // id | "none"
  type?: TaskType;
  priority?: Priority;
  status?: TaskStatus;
  hideDone?: boolean;
}

const taskInclude = {
  assignee: { select: { id: true, name: true, color: true, role: true } },
  milestone: { select: { id: true, name: true, color: true, status: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  assignee: { id: string; name: string; color: string } | null;
  milestoneId: string | null;
  milestone: { id: string; name: string; color: string } | null;
  startDate: string | null;
  dueDate: string | null;
  estimateHours: number | null;
  tags: string[];
  checklist: ChecklistItem[];
  files: string[];
  order: number;
  commentCount: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toItem(t: TaskRow): TaskItem {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, color: t.assignee.color } : null,
    milestoneId: t.milestoneId,
    milestone: t.milestone ? { id: t.milestone.id, name: t.milestone.name, color: t.milestone.color } : null,
    startDate: t.startDate?.toISOString() ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimateHours: t.estimateHours,
    tags: parseStringArray(t.tagsJson),
    checklist: parseJson<ChecklistItem[]>(t.checklistJson, []),
    files: parseStringArray(t.filesJson),
    order: t.order,
    commentCount: t._count.comments,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function listTasks(f: TaskFilters = {}): Promise<TaskItem[]> {
  const where: Prisma.TaskWhereInput = {};
  if (f.q) where.OR = [{ title: { contains: f.q } }, { description: { contains: f.q } }, { tagsJson: { contains: f.q } }];
  if (f.assignee === "none") where.assigneeId = null;
  else if (f.assignee) where.assigneeId = f.assignee;
  if (f.milestone === "none") where.milestoneId = null;
  else if (f.milestone) where.milestoneId = f.milestone;
  if (f.type) where.type = f.type;
  if (f.priority) where.priority = f.priority;
  if (f.status) where.status = f.status;
  if (f.hideDone) where.status = { not: "DONE" };
  const rows = await db.task.findMany({ where, include: taskInclude, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return rows.map(toItem);
}

export async function getTask(id: string) {
  const t = await db.task.findUnique({ where: { id }, include: taskInclude });
  return t ? toItem(t) : null;
}

export async function listComments(taskId: string) {
  const rows = await db.comment.findMany({ where: { taskId }, include: { author: { select: { id: true, name: true, color: true } } }, orderBy: { createdAt: "asc" } });
  return rows.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), author: c.author }));
}
export type CommentItem = Awaited<ReturnType<typeof listComments>>[number];

export interface TaskOptions {
  members: { id: string; name: string; color: string; role: string }[];
  milestones: { id: string; name: string; color: string; status: string }[];
}
export async function taskOptions(): Promise<TaskOptions> {
  const [members, milestones] = await Promise.all([
    db.member.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, role: true } }),
    db.milestone.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, color: true, status: true } }),
  ]);
  return { members, milestones };
}
