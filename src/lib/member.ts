import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";

export const MEMBER_COOKIE = "mswpm_member";

/** Currently selected team member (lightweight identity — no password; internal team tool). */
export async function currentMember() {
  const jar = await cookies();
  const id = jar.get(MEMBER_COOKIE)?.value;
  if (!id) return null;
  const m = await db.member.findUnique({ where: { id } });
  if (!m || !m.active) return null;
  return m;
}
