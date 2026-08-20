"use server";

import { z } from "zod";
import type { MilestoneStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentMember } from "@/lib/member";
import { logActivity } from "@/lib/activity";
import { MILESTONE_LABEL, MILESTONE_STATUSES } from "@/lib/constants";
import { safeAction } from "./result";

const schema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อ milestone").max(120),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(MILESTONE_STATUSES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});
export type MilestoneInput = z.infer<typeof schema>;

const revalidateAll = () => ["/dashboard", "/board", "/calendar", "/timeline", "/milestones"].forEach((p) => revalidatePath(p));
const d = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00`) : null);

function toData(i: MilestoneInput) {
  const startDate = d(i.startDate);
  const endDate = d(i.endDate);
  if (startDate && endDate && endDate < startDate) throw new Error("วันสิ้นสุดต้องอยู่หลังวันเริ่ม");
  return { name: i.name, description: i.description?.trim() || null, status: i.status as MilestoneStatus, color: i.color, startDate, endDate };
}

export async function createMilestone(input: MilestoneInput) {
  return safeAction(async () => {
    const me = await currentMember();
    const last = await db.milestone.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const row = await db.milestone.create({ data: { ...toData(schema.parse(input)), order: (last?.order ?? 0) + 1 } });
    await logActivity({ actorId: me?.id, action: "milestone.create", entityType: "milestone", entityId: row.id, summary: `สร้าง milestone “${row.name}”` });
    revalidateAll();
    return { id: row.id };
  });
}

export async function updateMilestone(input: { id: string; data: MilestoneInput }) {
  return safeAction(async () => {
    const me = await currentMember();
    const prev = await db.milestone.findUniqueOrThrow({ where: { id: input.id } });
    const row = await db.milestone.update({ where: { id: input.id }, data: toData(schema.parse(input.data)) });
    const summary = prev.status !== row.status ? `milestone “${row.name}” → ${MILESTONE_LABEL[row.status]}` : `แก้ไข milestone “${row.name}”`;
    await logActivity({ actorId: me?.id, action: "milestone.update", entityType: "milestone", entityId: row.id, summary });
    revalidateAll();
    return { id: row.id };
  });
}

export async function reorderMilestones(input: { ids: string[] }) {
  return safeAction(async () => {
    await db.$transaction(input.ids.map((id, i) => db.milestone.update({ where: { id }, data: { order: i + 1 } })));
    revalidateAll();
    return { ok: true };
  });
}

export async function deleteMilestone(input: { id: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const row = await db.milestone.delete({ where: { id: input.id } }); // tasks/events keep existing with milestoneId = null (SetNull)
    await logActivity({ actorId: me?.id, action: "milestone.delete", entityType: "milestone", entityId: row.id, summary: `ลบ milestone “${row.name}”` });
    revalidateAll();
    return { id: row.id };
  });
}
