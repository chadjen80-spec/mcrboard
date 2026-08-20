import type { Metadata } from "next";
import Link from "next/link";
import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, Flag, ListTodo, Sparkles } from "lucide-react";
import { PageHeader, Progress, SectionTitle, Stat } from "@/components/shared/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventKindBadge, MemberAvatar, MilestoneBadge, StatusBadge } from "@/components/shared/badges";
import { currentMember } from "@/lib/member";
import { STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { dashboardData } from "@/server/queries/overview";
import { TaskList } from "./task-list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "ภาพรวม" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await currentMember();
  const d = await dashboardData(me?.id ?? null);
  const active = d.milestones.filter((m) => m.status === "ACTIVE");
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "สวัสดีตอนเช้า" : hour < 18 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  return (
    <div className="space-y-5">
      <PageHeader
        title={me ? `${greet}, ${me.name}` : "ภาพรวมโปรเจค"}
        description={`${format(now, "EEEE d MMMM yyyy", { locale: th })} · งานค้าง ${d.counts.open} จาก ${d.counts.total} งาน${!me ? " · เลือกชื่อตัวเองที่มุมขวาบนเพื่อดู “งานของฉัน”" : ""}`}
        actions={<Button asChild size="sm" variant="outline"><Link href="/board">ไปที่บอร์ด <ArrowRight /></Link></Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="งานค้างทั้งหมด" value={d.counts.open} icon={ListTodo} />
        <Stat label="กำลังทำ" value={d.counts.doing} icon={Clock} tone="info" />
        <Stat label="รอรีวิว" value={d.counts.review} icon={Sparkles} tone="warning" />
        <Stat label="ครบกำหนดใน 7 วัน" value={d.counts.dueThisWeek} icon={CalendarClock} />
        <Stat label="เลยกำหนด" value={d.counts.overdue} icon={AlertTriangle} tone={d.counts.overdue ? "danger" : undefined} />
        <Stat label="เสร็จใน 7 วันล่าสุด" value={d.counts.doneThisWeek} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {me ? (
            <section>
              <SectionTitle right={<Link href="/board?assignee=me" className="text-xs text-muted-foreground hover:underline">ดูทั้งหมด</Link>}>งานของฉัน ({d.mine.length})</SectionTitle>
              <TaskList tasks={[...d.mine].sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)).slice(0, 6)} empty="ไม่มีงานค้าง 🎉 ลองดูบอร์ดว่ามีอะไรช่วยเพื่อนได้บ้าง" />
            </section>
          ) : null}
          {d.overdue.length ? (
            <section>
              <SectionTitle>เลยกำหนด — ต้องจัดการ ({d.overdue.length})</SectionTitle>
              <TaskList tasks={d.overdue.slice(0, 6)} />
            </section>
          ) : null}
          <section>
            <SectionTitle right={<Link href="/calendar" className="text-xs text-muted-foreground hover:underline">เปิดปฏิทิน</Link>}>กำหนดส่งที่ใกล้ถึง</SectionTitle>
            <TaskList tasks={d.upcoming} empty="ยังไม่มีงานที่ระบุกำหนดส่ง" />
          </section>

          {/* Milestones */}
          <section>
            <SectionTitle right={<Link href="/milestones" className="text-xs text-muted-foreground hover:underline">จัดการ milestones</Link>}>Milestone ที่กำลังทำ</SectionTitle>
            {active.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">ยังไม่มี milestone ที่ active — ตั้งค่าได้ที่หน้า Milestones</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {active.map((m) => {
                const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
                const left = m.endDate ? differenceInCalendarDays(new Date(m.endDate), now) : null;
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: m.color }} /><p className="text-sm font-semibold">{m.name}</p></div>
                        <MilestoneBadge status={m.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2"><Progress value={pct} color={m.color} /><span className="text-xs font-medium tabular">{pct}%</span></div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{m.done}/{m.total} งาน</span>
                        {left !== null ? <span className={cn(left < 0 ? "font-medium text-danger" : left <= 3 ? "font-medium text-warning-foreground dark:text-warning" : "")}>{left < 0 ? `เลยกำหนด ${-left} วัน` : left === 0 ? "ครบกำหนดวันนี้" : `เหลือ ${left} วัน`}</span> : null}
                        {m.overdue ? <span className="text-danger">{m.overdue} งานเลยกำหนด</span> : null}
                        {m.remainingHours ? <span>~{m.remainingHours} ชม. ที่เหลือ</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">{TASK_STATUSES.map((s) => m.byStatus[s] ? <span key={s} className="inline-flex items-center gap-1 text-[10px]"><StatusBadge status={s} /><span className="tabular text-muted-foreground">{m.byStatus[s]}</span></span> : null)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <section>
            <SectionTitle right={<Link href="/calendar" className="text-xs text-muted-foreground hover:underline">ทั้งหมด</Link>}>กิจกรรม 14 วันข้างหน้า</SectionTitle>
            <Card>
              <CardContent className="divide-y p-0">
                {d.events.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">ไม่มีกิจกรรม — เพิ่มได้ในหน้าปฏิทิน</p> : d.events.slice(0, 7).map((e) => {
                  const s = new Date(e.startAt);
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="w-10 shrink-0 text-center">
                        <p className="text-[10px] uppercase text-muted-foreground">{format(s, "EEE", { locale: th })}</p>
                        <p className="text-base font-semibold leading-tight tabular">{format(s, "d")}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <p className="text-[11px] text-muted-foreground">{e.allDay ? "ทั้งวัน" : `${format(s, "HH:mm")}${e.endAt ? `–${format(new Date(e.endAt), "HH:mm")}` : ""}`}{e.milestone ? ` · ${e.milestone.name}` : ""}</p>
                      </div>
                      <EventKindBadge kind={e.kind} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionTitle right={<Link href="/team" className="text-xs text-muted-foreground hover:underline">ทีม</Link>}>ภาระงานทีม</SectionTitle>
            <Card>
              <CardContent className="space-y-2 p-3">
                {d.members.map((m) => {
                  const max = Math.max(1, ...d.members.map((x) => x.open));
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <MemberAvatar name={m.name} color={m.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs"><span className="truncate font-medium">{m.name}</span><span className="tabular text-muted-foreground">{m.open} งาน{m.overdue ? <span className="text-danger"> · {m.overdue} เลย</span> : null}</span></div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(m.open / max) * 100}%`, backgroundColor: m.color }} /></div>
                      </div>
                    </div>
                  );
                })}
                {d.members.length === 0 ? <p className="text-center text-xs text-muted-foreground">ยังไม่มีสมาชิก</p> : null}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionTitle>ความเคลื่อนไหวล่าสุด</SectionTitle>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {d.activity.length === 0 ? <li className="p-4 text-center text-xs text-muted-foreground">ยังไม่มีความเคลื่อนไหว</li> : d.activity.map((a) => (
                    <li key={a.id} className="flex gap-2 px-3 py-2">
                      <MemberAvatar name={a.actor?.name ?? "?"} color={a.actor?.color ?? "#94a3b8"} size="xs" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs"><span className="font-medium">{a.actor?.name ?? "ไม่ระบุ"}</span> {a.summary}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: th })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionTitle>สรุปตามสถานะ</SectionTitle>
            <Card>
              <CardContent className="p-3">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {TASK_STATUSES.map((s) => d.byStatus[s] ? <div key={s} title={`${STATUS_LABEL[s]} ${d.byStatus[s]}`} className={cn("h-full", { BACKLOG: "bg-muted-foreground/40", TODO: "bg-secondary-foreground/40", DOING: "bg-info", REVIEW: "bg-warning", DONE: "bg-success" }[s])} style={{ width: `${(d.byStatus[s] / Math.max(1, d.counts.total)) * 100}%` }} /> : null)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{TASK_STATUSES.map((s) => <span key={s} className="inline-flex items-center gap-1 text-[11px]"><StatusBadge status={s} /><span className="tabular text-muted-foreground">{d.byStatus[s]}</span></span>)}</div>
              </CardContent>
            </Card>
          </section>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Flag className="h-3 w-3" /> กด <kbd className="rounded border bg-muted px-1 font-mono">N</kbd> ที่หน้าไหนก็ได้เพื่อสร้างการ์ดงานทันที</p>
        </div>
      </div>
    </div>
  );
}
