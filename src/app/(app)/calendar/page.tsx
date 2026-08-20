import type { Metadata } from "next";
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { PageHeader } from "@/components/shared/page";
import { currentMember } from "@/lib/member";
import { calendarData } from "@/server/queries/calendar";
import { taskOptions } from "@/server/queries/tasks";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "ปฏิทิน" };
export const dynamic = "force-dynamic";

const parseDay = (s?: string) => {
  if (!s) return new Date();
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export default async function CalendarPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams;
  const me = await currentMember();
  const view = sp.view === "week" ? "week" : "month";
  const anchor = parseDay(sp.date);
  const rangeStart = view === "month" ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }) : startOfWeek(anchor, { weekStartsOn: 1 });
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) : endOfWeek(anchor, { weekStartsOn: 1 });
  const assignee = sp.assignee === "me" ? (me?.id ?? "none") : sp.assignee;
  const [data, options] = await Promise.all([calendarData({ from: rangeStart, to: addDays(rangeEnd, 1) }, { assignee, milestone: sp.milestone }), taskOptions()]);
  return (
    <div>
      <PageHeader title="ปฏิทินทีม" description="กำหนดส่งงาน + กิจกรรมทีม (ประชุม / playtest / release) · ลากการ์ดเพื่อเลื่อนวัน · คลิกวันว่างเพื่อเพิ่ม" />
      <CalendarView view={view} anchorIso={anchor.toISOString()} rangeStartIso={rangeStart.toISOString()} rangeEndIso={rangeEnd.toISOString()} tasks={data.tasks} events={data.events} options={options} meId={me?.id ?? null} />
    </div>
  );
}
