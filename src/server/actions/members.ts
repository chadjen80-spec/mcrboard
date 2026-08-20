"use server";

import { z } from "zod";
import type { MemberRole } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MEMBER_COOKIE, currentMember } from "@/lib/member";
import { logActivity } from "@/lib/activity";
import { MEMBER_ROLES } from "@/lib/constants";
import { safeAction } from "./result";

const schema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อ").max(80),
  role: z.enum(MEMBER_ROLES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  discordId: z.string().trim().regex(/^\d{15,25}$/, "Discord ID ต้องเป็นตัวเลข 15–25 หลัก").nullable().optional().or(z.literal("").transform(() => null)),
  active: z.boolean().optional(),
});
export type MemberInput = z.infer<typeof schema>;

const revalidateAll = () => ["/", "/dashboard", "/board", "/calendar", "/timeline", "/milestones", "/team"].forEach((p) => revalidatePath(p, "layout"));

export async function createMember(input: MemberInput) {
  return safeAction(async () => {
    const me = await currentMember();
    const d = schema.parse(input);
    const row = await db.member.create({ data: { name: d.name, role: d.role as MemberRole, color: d.color, discordId: d.discordId ?? null, active: d.active ?? true } });
    await logActivity({ actorId: me?.id, action: "member.create", entityType: "member", entityId: row.id, summary: `เพิ่มสมาชิก “${row.name}”` });
    revalidateAll();
    return { id: row.id };
  });
}

export async function updateMember(input: { id: string; data: MemberInput }) {
  return safeAction(async () => {
    const me = await currentMember();
    const d = schema.parse(input.data);
    const row = await db.member.update({ where: { id: input.id }, data: { name: d.name, role: d.role as MemberRole, color: d.color, discordId: d.discordId ?? null, active: d.active ?? true } });
    await logActivity({ actorId: me?.id, action: "member.update", entityType: "member", entityId: row.id, summary: `แก้ไขสมาชิก “${row.name}”` });
    revalidateAll();
    return { id: row.id };
  });
}

export async function deleteMember(input: { id: string }) {
  return safeAction(async () => {
    const me = await currentMember();
    const row = await db.member.delete({ where: { id: input.id } });
    if (me?.id === row.id) (await cookies()).delete(MEMBER_COOKIE);
    await logActivity({ actorId: me?.id, action: "member.delete", entityType: "member", entityId: row.id, summary: `ลบสมาชิก “${row.name}”` });
    revalidateAll();
    return { id: row.id };
  });
}

/** Lightweight identity: pick who you are (cookie, 1 year). */
export async function selectMember(input: { id: string | null }) {
  return safeAction(async () => {
    const jar = await cookies();
    if (!input.id) {
      jar.delete(MEMBER_COOKIE);
    } else {
      const m = await db.member.findUnique({ where: { id: input.id } });
      if (!m) throw new Error("ไม่พบสมาชิก");
      jar.set(MEMBER_COOKIE, m.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
    }
    revalidateAll();
    return { id: input.id };
  });
}
