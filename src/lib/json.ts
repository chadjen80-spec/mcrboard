export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
export const toJson = (v: unknown) => JSON.stringify(v ?? null);
export const parseStringArray = (raw: string | null | undefined) => parseJson<string[]>(raw, []).filter((s) => typeof s === "string");
