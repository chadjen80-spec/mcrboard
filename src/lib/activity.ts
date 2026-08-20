import "server-only";
import { db } from "./db";

export async function logActivity(input: { actorId?: string | null; action: string; entityType: string; entityId: string; summary: string }) {
  try {
    await db.activity.create({ data: { actorId: input.actorId ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId, summary: input.summary } });
  } catch (e) {
    console.error("[activity]", e);
  }
}
