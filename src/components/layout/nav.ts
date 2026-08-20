import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, KanbanSquare, CalendarDays, GanttChartSquare, Flag, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  hint?: string;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard, hint: "Dashboard" },
  { href: "/board", label: "บอร์ดงาน", icon: KanbanSquare, section: "ทำงาน", hint: "Kanban" },
  { href: "/calendar", label: "ปฏิทิน", icon: CalendarDays, hint: "Calendar" },
  { href: "/timeline", label: "ไทม์ไลน์", icon: GanttChartSquare, hint: "Timeline" },
  { href: "/milestones", label: "Milestones", icon: Flag, section: "วางแผน" },
  { href: "/team", label: "ทีม", icon: Users, hint: "Members" },
];
