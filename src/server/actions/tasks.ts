"use server";

import { z } from "zod";
import type { Priority, TaskStatus, TaskType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentMember } from "@/lib/member";
import { logActivity } from "@/lib/activity";
import { notifyAssignment } from "@/lib/discord";
import { toJson } from "@/lib/json";
import { STATUS_LABEL, TASK_STATUSES, TASK_TYPES, PRIORITIES } from "@/lib/constants";
import { safeAction } from "./result";

const taskSchema = z.object({
  title: z.string().trim().min(1, "กรุณาใส่ชื่องาน").max(200),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(TASK_TYPES as [string, ...string[]]),
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
  priority: z.enum(PRIORITIES as [string, ...string[]]),
  assigneeId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(), // yyyy-MM-dd
  dueDate: z.string().nullable().optional(),
  estimateHours: z.number().min(0).max(1000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  checklist: z.array(z.object({ id: z.string(), text: z.string().max(300), done: z.boolean() })).max(50).optional(),
  files: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

const REVALIDATE = ["/dashboard", "/board", "/calendar", "/timeline", "/milestones", "/team"];
const revalidateAll = () => REVALIDATE.forEach((p) => revalidatePath(p));

const dateOrNull = (s: string | null | undefined, endOfDay = false) => {
  if (!s) return null;
  const d = new Date(`${s}T${endOfDay ? "18:00:00" : "09:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

function toData(d: TaskInput) {
  return {
    title: d.title,
    description: d.description?.trim() || null,
    type: d.type as TaskType,
    status: d.status as TaskStatus,
    priority: d.priority as Priority,
    assigneeId: d.assigneeId || null,
    milestoneId: d.milestoneId || null,
    startDate: dateOrNull(d.startDate),
    dueDate: dateOrNull(d.dueDate, true),
    estimateHours: d.estimateHours ?? null,
    tagsJson: toJson(d.tags ?? []),
    checklistJson: toJson(d.checklist ?? []),
    filesJson: toJson(d.files ?? []),
  };
}

/** Discord ping when a task lands on someone (skips self-assignment). Best-effort — never throws. */
async function notifyIfAssigned(taskId: string, assigneeId: string | null, meId: string | null | undefined, meName: string | null | undefined, reassigned: boolean) {
  if (!assigneeId || assigneeId === meId) return;
  const task = await db.task.findUnique({ where: { id: taskId }, include: { assignee: true, milestone: { select: { name: true } } } });
  if (!task?.assignee) return;
  await notifyAssignment({
    taskId: task.id,
    title: task.title,
    type: task.type,
    priority: task.priority,
    dueDate: task.dueDate,
    milestoneName: task.milestone?.name,
    assignee: { name: task.assignee.name, discordId: task.assignee.discordId },
    assigner: meName ?? null,
    reassigned,
  });
}

export async function createTask(input: TaskInput) {
  return safeAction(async () => {
    const me = await currentMember();
    const data = taskSchema.parse(input);
    const last = await db.task.findFirst({ where: { status: data.status as never }, orderBy: { order: "desc" }, select: { order: true } });
    const row = await db.task.create({ data: { ...toData(data), creatorId: me?.id ?? null, order: (last?.order ?? -1) + 1, completedAt: data.status === "DONE" ? new Date() : null } });
    await logActivity({ actorId: me?.id, action: "task.create", entityType: "task", entityId: row.id, summary: `สร้างงาน “${row.title}”` });
    await notifyIfAssigned(row.id, row.assigneeId, me?.id, me?.name, false);
    revalidateAll();
    return { id: row.id };
  });
}

export async function updateTask(input: { id: string; data: TaskInput }) {
  return safeAction(async () => {
    const me = await currentMember();
    const data = taskSchema.parse(input.data);
    const prev = await db.task.findUniqueOrThrow({ where: { id: input.id } });
    const row = await db.task.update({
      where: { id: input.id },
      data: { ...toData(data), completedAt: data.status === "DONE" ? (prev.completedAt ?? new Date()) : null },
    });
    const summary = prev.status !== row.status ? `ย้าย “${row.title}” → ${STATUS_LABEL[row.status]}` : `แก้ไขงาน “${row.title}”`;
    await logActivity({ actorId: me?.id, action: prev.status !== row.status ? "task.move" : "task.update", entityType: "task", entityId: row.id, summary });
    if (row.assigneeId && row.assigneeId !== prev.assigneeId) await notifyIfAssigned(row.id, row.assigneeId, me?.id, me?.name, prev.assigneeId !== null);
    revalidateAll();
    return { id: row.id };
  });
}

/** Quick create from the board column / quick-add bar. */
export async function quickCreateTask(input: { title: string; status?: string; dueDate?: string | null; milestoneId?: string | null; assigneeId?: string | null }) {
  return createTask({ title: input.title, type: "OTHER", status: (input.status as TaskInput["status"]) ?? "TODO", priority: "MEDIUM", dueDate: input.dueDate ?? null, milestoneId: input.milestoneId ?? null, assigneeId: input.assigneeId ?? null });
}

const moveSchema = z.object({ id: z.string(), status: z.enum(TASK_STATUSES as [string, ...string[]]), index: z.number().int().min(0).optional() });
export async function moveTask(input: z.infer<typeof moveSchema>) {
  return safeAction(async () => {
    const me = await currentMember();
    const { id, status, index } = moveSchema.parse(input);
    const st = status as TaskStatus;
    const task = await db.task.findUniqueOrThrow({ where: { id } });
    // Reorder: pull the column, insert at index, rewrite orders.
    const column = await db.task.findMany({ where: { status: st, id: { not: id } }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const ids = column.map((c) => c.id);
    const at = index === undefined ? ids.length : Math.min(index, ids.length);
    ids.splice(at, 0, id);
    await db.$transaction([
      ...ids.map((tid, i) => db.task.update({ where: { id: tid }, data: { order: i } })),
      db.task.update({ where: { id }, data: { status: st, completedAt: st === "DONE" ? (task.completedAt ?? new Date()) : null } }),
    ]);
    if (task.status !== st) await logActivity({ actorId: me?.id, action: "task.move", entityType: "task", entityId: id, summary: `ย้าย “${task.title}” → ${STATUS_LABEL[st]}` });
    revalidateAll();
    return { id };
  });
}

export async function rescheduleTask(input: { id: string; dueDate: string | null; startDate?: string | null }) {
  return safeAction(async () => {
    const me = await currentMember();
    const id = z.string().parse(input.id);
    const task = await db.task.findUniqueOrThrow({ where: { id } });
    const data: { dueDate: Date | null; startDate?: Date | null } = { dueDate: dateOrNull(input.dueDate, true) };
    if (input.startDate !== undefined) data.startDate = dateOrNull(input.startDate);
    await db.task.update({ where: { id }, data });
    await logActivity({ actorId: me?.id, action: "task.reschedule", entityType: "task", entityId: id, summary: `เลื่อนกำหนดส่ง “${task.title}” → ${input.dueDate ?? "ไม่ระบุ"}` });
    revalidateAll();
    return { id };
  });
}

export async function toggleChecklistItem(input: { id: string; itemId: string; done: boolean }) {
  return safeAction(async () => {
    const task = await db.task.findUniqueOrThrow({ where: { id: input.id } });
    const list = JSON.parse(task.checklistJson || "[]") as { id: string; text: string; done: boolean }[];
    const next = list.map((c) => (c.id === input.itemId ? { ...c, done: input.done } : c));
    await db.task.update({ where: { id: input.id }, data: { checklistJson: toJson(next) } });
    revalidateAll();
    return { checklist: next };
  });
}

export async function deleteTask(input: { id: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const task = await db.task.delete({ where: { id: z.string().parse(input.id) } });
    await logActivity({ actorId: me?.id, action: "task.delete", entityType: "task", entityId: task.id, summary: `ลบงาน “${task.title}”` });
    revalidateAll();
    return { id: task.id };
  });
}

export async function addComment(input: { taskId: string; body: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const body = z.string().trim().min(1).max(3000).parse(input.body);
    const c = await db.comment.create({ data: { taskId: input.taskId, authorId: me?.id ?? null, body } });
    const task = await db.task.findUnique({ where: { id: input.taskId }, select: { title: true } });
    await logActivity({ actorId: me?.id, action: "task.comment", entityType: "task", entityId: input.taskId, summary: `คอมเมนต์ใน “${task?.title ?? ""}”` });
    revalidateAll();
    return { id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), author: me ? { id: me.id, name: me.name, color: me.color } : null };
  });
}

export async function deleteComment(input: { id: string }) {
  return safeAction(async () => {
    await db.comment.delete({ where: { id: input.id } });
    revalidateAll();
    return { id: input.id };
  });
}

/** Read helper used by the task dialog (server action for simplicity — no API route needed). */
export async function fetchComments(input: { taskId: string }) {
  const { listComments } = await import("@/server/queries/tasks");
  return listComments(input.taskId);
}
