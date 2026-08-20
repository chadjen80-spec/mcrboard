export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Wrap a server action body: converts thrown Zod/other errors into ActionResult. */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const err = e as { issues?: { message: string; path?: (string | number)[] }[]; message?: string };
    if (err?.issues?.length) return fail(err.issues.map((i) => `${i.path?.join(".") ?? ""}: ${i.message}`).join("; "));
    console.error("[action]", e);
    return fail(err?.message ?? "เกิดข้อผิดพลาด");
  }
}
