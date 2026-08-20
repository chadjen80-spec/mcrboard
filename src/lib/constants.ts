import type { EventKind, MemberRole, MilestoneStatus, Priority, TaskStatus, TaskType } from "@prisma/client";

export const APP_NAME = "MSW Project Hub";

// ── Task status (Kanban columns) ───────────────────────
export const TASK_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "DOING", "REVIEW", "DONE"];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "รอทำ",
  DOING: "กำลังทำ",
  REVIEW: "รอรีวิว",
  DONE: "เสร็จแล้ว",
};
export const STATUS_HINT: Record<TaskStatus, string> = {
  BACKLOG: "ไอเดีย / ยังไม่จัดลำดับ",
  TODO: "พร้อมเริ่มทำ",
  DOING: "กำลังดำเนินการ",
  REVIEW: "รอตรวจ / รอ playtest",
  DONE: "ปิดงานแล้ว",
};
export const STATUS_VARIANT: Record<TaskStatus, "muted" | "secondary" | "info" | "warning" | "success"> = {
  BACKLOG: "muted",
  TODO: "secondary",
  DOING: "info",
  REVIEW: "warning",
  DONE: "success",
};

// ── Priority ───────────────────────────────────────────
export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const PRIORITY_LABEL: Record<Priority, string> = { LOW: "ต่ำ", MEDIUM: "ปกติ", HIGH: "สูง", URGENT: "ด่วน" };
export const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export const PRIORITY_VARIANT: Record<Priority, "muted" | "secondary" | "warning" | "danger"> = { LOW: "muted", MEDIUM: "secondary", HIGH: "warning", URGENT: "danger" };

// ── Task type (MSW work areas) ─────────────────────────
export const TASK_TYPES: TaskType[] = ["SCRIPT", "MODEL", "UI", "MAP", "ART", "SOUND", "DESIGN", "QA", "DOCS", "OTHER"];
export const TYPE_LABEL: Record<TaskType, string> = {
  SCRIPT: "Script (.mlua)",
  MODEL: "Model / Entity",
  UI: "UI (.ui)",
  MAP: "Map (.map)",
  ART: "Art / Sprite",
  SOUND: "Sound",
  DESIGN: "Game Design",
  QA: "QA / Bug",
  DOCS: "Docs",
  OTHER: "อื่น ๆ",
};
export const TYPE_SHORT: Record<TaskType, string> = { SCRIPT: "Script", MODEL: "Model", UI: "UI", MAP: "Map", ART: "Art", SOUND: "Sound", DESIGN: "Design", QA: "QA", DOCS: "Docs", OTHER: "Other" };
export const TYPE_COLOR: Record<TaskType, string> = {
  SCRIPT: "#6366f1",
  MODEL: "#8b5cf6",
  UI: "#ec4899",
  MAP: "#10b981",
  ART: "#f59e0b",
  SOUND: "#14b8a6",
  DESIGN: "#3b82f6",
  QA: "#ef4444",
  DOCS: "#64748b",
  OTHER: "#94a3b8",
};

// ── Member roles ───────────────────────────────────────
export const MEMBER_ROLES: MemberRole[] = ["LEAD", "PLANNER", "SCRIPTER", "ARTIST", "UI", "LEVEL", "SOUND", "QA", "OTHER"];
export const ROLE_LABEL: Record<MemberRole, string> = {
  LEAD: "Lead / Producer",
  PLANNER: "Game Designer",
  SCRIPTER: "Scripter (mLua)",
  ARTIST: "Artist",
  UI: "UI / UX",
  LEVEL: "Level Design",
  SOUND: "Sound",
  QA: "QA / Tester",
  OTHER: "อื่น ๆ",
};
export const MEMBER_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16"];

// ── Milestones ─────────────────────────────────────────
export const MILESTONE_STATUSES: MilestoneStatus[] = ["PLANNED", "ACTIVE", "DONE"];
export const MILESTONE_LABEL: Record<MilestoneStatus, string> = { PLANNED: "วางแผน", ACTIVE: "กำลังทำ", DONE: "เสร็จแล้ว" };
export const MILESTONE_VARIANT: Record<MilestoneStatus, "muted" | "info" | "success"> = { PLANNED: "muted", ACTIVE: "info", DONE: "success" };

// ── Events ─────────────────────────────────────────────
export const EVENT_KINDS: EventKind[] = ["MEETING", "PLAYTEST", "RELEASE", "DEADLINE", "OTHER"];
export const EVENT_LABEL: Record<EventKind, string> = { MEETING: "ประชุม", PLAYTEST: "Playtest", RELEASE: "Release", DEADLINE: "Deadline", OTHER: "อื่น ๆ" };
export const EVENT_COLOR: Record<EventKind, string> = { MEETING: "#3b82f6", PLAYTEST: "#8b5cf6", RELEASE: "#10b981", DEADLINE: "#ef4444", OTHER: "#64748b" };

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}
