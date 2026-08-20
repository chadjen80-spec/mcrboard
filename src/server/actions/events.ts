"use server";

import { z } from "zod";
import type { EventKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentMember } from "@/lib/member";
import { logActivity } from "@/lib/activity";
import { EVENT_KINDS } from "@/lib/constants";
import { safeAction } from "./result";

const schema = z.object({
  title: z.string().trim().min(1, "กรุณาใส่ชื่อกิจกรรม").max(200),
  description: z.string().max(3000).nullable().optional(),
  kind: z.enum(EVENT_KINDS as [string, ...string[]]),
  startAt: z.string().min(1), // ISO local "yyyy-MM-ddTHH:mm" or "yyyy-MM-dd"
  endAt: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
  milestoneId: z.string().nullable().optional(),
});
export type EventInput = z.infer<typeof schema>;

const revalidateAll = () => ["/dashboard", "/calendar", "/timeline", "/milestones"].forEach((p) => revalidatePath(p));
const parseDate = (s: string | null | undefined) => {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
};

function toData(d: EventInput) {
  const startAt = parseDate(d.startAt);
  if (!startAt) throw new Error("วันที่เริ่มไม่ถูกต้อง");
  const endAt = parseDate(d.endAt);
  if (endAt && endAt < startAt) throw new Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
  return { title: d.title, description: d.description?.trim() || null, kind: d.kind as EventKind, startAt, endAt, allDay: d.allDay ?? false, milestoneId: d.milestoneId || null };
}

export async function createEvent(input: EventInput) {
  return safeAction(async () => {
    const me = await currentMember();
    const row = await db.event.create({ data: toData(schema.parse(input)) });
    await logActivity({ actorId: me?.id, action: "event.create", entityType: "event", entityId: row.id, summary: `เพิ่มกิจกรรม “${row.title}”` });
    revalidateAll();
    return { id: row.id };
  });
}

export async function updateEvent(input: { id: string; data: EventInput }) {
  return safeAction(async () => {
    const me = await currentMember();
    const row = await db.event.update({ where: { id: input.id }, data: toData(schema.parse(input.data)) });
    await logActivity({ actorId: me?.id, action: "event.update", entityType: "event", entityId: row.id, summary: `แก้ไขกิจกรรม “${row.title}”` });
    revalidateAll();
    return { id: row.id };
  });
}

/** Drag-drop on calendar: keep time-of-day, change the day. */
export async function moveEvent(input: { id: string; day: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.id } });
    const target = parseDate(input.day);
    if (!target) throw new Error("วันที่ไม่ถูกต้อง");
    const shift = (d: Date) => new Date(target.getFullYear(), target.getMonth(), target.getDate(), d.getHours(), d.getMinutes());
    const dur = ev.endAt ? ev.endAt.getTime() - ev.startAt.getTime() : null;
    const startAt = shift(ev.startAt);
    const endAt = dur !== null ? new Date(startAt.getTime() + dur) : null;
    await db.event.update({ where: { id: ev.id }, data: { startAt, endAt } });
    await logActivity({ actorId: me?.id, action: "event.move", entityType: "event", entityId: ev.id, summary: `เลื่อนกิจกรรม “${ev.title}” → ${input.day}` });
    revalidateAll();
    return { id: ev.id };
  });
}

export async function deleteEvent(input: { id: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const row = await db.event.delete({ where: { id: input.id } });
    await logActivity({ actorId: me?.id, action: "event.delete", entityType: "event", entityId: row.id, summary: `ลบกิจกรรม “${row.title}”` });
    revalidateAll();
    return { id: row.id };
  });
}
