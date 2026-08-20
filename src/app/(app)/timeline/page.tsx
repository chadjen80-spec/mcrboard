import type { Metadata } from "next";
import { addDays, startOfWeek, subWeeks } from "date-fns";
import { PageHeader } from "@/components/shared/page";
import { listTasks } from "@/server/queries/tasks";
import { listEvents } from "@/server/queries/calendar";
import { listMilestones } from "@/server/queries/overview";
import { TimelineView } from "./timeline-view";

export const metadata: Metadata = { title: "ไทม์ไลน์" };
export const dynamic = "force-dynamic";

export default async function TimelinePage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams;
  const anchor = sp.date ? new Date(`${sp.date}T00:00:00`) : new Date();
  const weeks = Math.min(16, Math.max(4, Number(sp.weeks) || 8));
  const from = startOfWeek(subWeeks(Number.isNaN(anchor.getTime()) ? new Date() : anchor, 1), { weekStartsOn: 1 });
  const to = addDays(from, weeks * 7 - 1);
  const [tasks, events, milestones] = await Promise.all([listTasks(), listEvents({ from, to: addDays(to, 1) }), listMilestones()]);
  return (
    <div>
      <PageHeader title="ไทม์ไลน์โปรเจค" description="ดูช่วงเวลาของแต่ละ milestone และงานที่มี วันเริ่ม–กำหนดส่ง · งานที่มีแค่กำหนดส่งจะแสดงเป็นจุด · ลากแถบงานเพื่อเลื่อนวัน" />
      <TimelineView fromIso={from.toISOString()} weeks={weeks} tasks={tasks} events={events} milestones={milestones} />
    </div>
  );
}
