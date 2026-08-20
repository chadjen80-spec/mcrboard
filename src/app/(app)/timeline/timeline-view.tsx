"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { addDays, addWeeks, differenceInCalendarDays, format, isToday, isWeekend, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { MemberAvatar, MilestoneBadge } from "@/components/shared/badges";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { EVENT_COLOR, EVENT_LABEL, TYPE_COLOR } from "@/lib/constants";
import { rescheduleTask } from "@/server/actions/tasks";
import type { TaskItem } from "@/server/queries/tasks";
import type { EventItem } from "@/server/queries/calendar";
import type { MilestoneSummary } from "@/server/queries/overview";

const DAY_W = 28; // px per day
const LABEL_W = 260;

export function TimelineView({ fromIso, weeks, tasks: initial, events, milestones }: { fromIso: string; weeks: number; tasks: TaskItem[]; events: EventItem[]; milestones: MilestoneSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { openEdit } = useTaskDialog();
  const from = React.useMemo(() => startOfDay(new Date(fromIso)), [fromIso]);
  const totalDays = weeks * 7;
  const days = React.useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(from, i)), [from, totalDays]);
  const [tasks, setTasks] = React.useState(initial);
  const [seen, setSeen] = React.useState(initial);
  if (seen !== initial) { setSeen(initial); setTasks(initial); }
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [hideDone, setHideDone] = React.useState(false);
  const [drag, setDrag] = React.useState<{ id: string; startX: number; dx: number } | null>(null);

  const set = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) { if (v === null || v === "") next.delete(k); else next.set(k, v); }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const go = (dir: -1 | 0 | 1) => set({ date: dir === 0 ? null : format(addWeeks(addDays(from, 7), dir * 2), "yyyy-MM-dd") });

  const x = (d: Date | string) => differenceInCalendarDays(startOfDay(new Date(d)), from) * DAY_W;
  const clampX = (px: number) => Math.max(0, Math.min(totalDays * DAY_W, px));

  const groups = React.useMemo(() => {
    const list = [...milestones.map((m) => ({ milestone: m as MilestoneSummary | null, tasks: [] as TaskItem[] })), { milestone: null as MilestoneSummary | null, tasks: [] as TaskItem[] }];
    for (const t of tasks) {
      if (hideDone && t.status === "DONE") continue;
      if (!t.dueDate && !t.startDate) continue; // undated → not on timeline
      const g = list.find((x) => x.milestone?.id === (t.milestoneId ?? undefined)) ?? list[list.length - 1];
      g.tasks.push(t);
    }
    for (const g of list) g.tasks.sort((a, b) => new Date(a.startDate ?? a.dueDate!).getTime() - new Date(b.startDate ?? b.dueDate!).getTime());
    return list.filter((g) => g.tasks.length || g.milestone);
  }, [tasks, milestones, hideDone]);

  // Drag whole bar horizontally → shift start & due by N days
  const onBarPointerDown = (e: React.PointerEvent, t: TaskItem) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: t.id, startX: e.clientX, dx: 0 });
  };
  const onBarPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, dx: e.clientX - drag.startX });
  };
  const onBarPointerUp = async (e: React.PointerEvent, t: TaskItem) => {
    if (!drag || drag.id !== t.id) return;
    const shift = Math.round(drag.dx / DAY_W);
    setDrag(null);
    if (shift === 0) { openEdit(t); return; }
    const due = t.dueDate ? addDays(new Date(t.dueDate), shift) : null;
    const start = t.startDate ? addDays(new Date(t.startDate), shift) : null;
    const prev = tasks;
    setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, dueDate: due?.toISOString() ?? null, startDate: start?.toISOString() ?? null } : x)));
    const r = await rescheduleTask({ id: t.id, dueDate: due ? format(due, "yyyy-MM-dd") : null, startDate: start ? format(start, "yyyy-MM-dd") : null });
    if (!r.ok) { setTasks(prev); toast.error(r.error); return; }
    toast.success(`เลื่อน “${t.title}” ${shift > 0 ? "+" : ""}${shift} วัน`);
    router.refresh();
  };

  const weekHeaders = Array.from({ length: weeks }, (_, i) => addDays(from, i * 7));
  const todayX = x(new Date());
  const gridW = totalDays * DAY_W;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-md border bg-background">
          <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="ก่อนหน้า"><ChevronLeft /></Button>
          <Button variant="ghost" size="sm" onClick={() => go(0)}>วันนี้</Button>
          <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="ถัดไป"><ChevronRight /></Button>
        </div>
        <h2 className="text-sm font-semibold">{format(from, "d MMM", { locale: th })} – {format(addDays(from, totalDays - 1), "d MMM yyyy", { locale: th })}</h2>
        <Select value={String(weeks)} onChange={(e) => set({ weeks: e.target.value })} className="h-8 w-auto py-0 text-xs">
          {[4, 6, 8, 12, 16].map((w) => <option key={w} value={w}>{w} สัปดาห์</option>)}
        </Select>
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-primary" /> ซ่อนงานที่เสร็จแล้ว</label>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div style={{ minWidth: LABEL_W + gridW }}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex border-b bg-muted/40 text-[11px] text-muted-foreground">
            <div className="shrink-0 border-r px-3 py-1.5 font-medium" style={{ width: LABEL_W }}>Milestone / งาน</div>
            <div className="relative" style={{ width: gridW }}>
              <div className="flex">
                {weekHeaders.map((w) => <div key={w.toISOString()} className="border-r px-1 py-0.5 font-medium" style={{ width: DAY_W * 7 }}>{format(w, "d MMM", { locale: th })}</div>)}
              </div>
              <div className="flex border-t">
                {days.map((d) => <div key={d.toISOString()} className={cn("text-center tabular", isWeekend(d) && "bg-muted/50", isToday(d) && "bg-primary/15 font-semibold text-foreground")} style={{ width: DAY_W }}>{format(d, "d")}</div>)}
              </div>
            </div>
          </div>

          {/* Rows */}
          {groups.map((g) => {
            const m = g.milestone;
            const gid = m?.id ?? "none";
            const isCollapsed = collapsed[gid];
            const mStart = m?.startDate ? clampX(x(m.startDate)) : null;
            const mEnd = m?.endDate ? clampX(x(m.endDate) + DAY_W) : null;
            return (
              <React.Fragment key={gid}>
                <div className="flex border-b bg-muted/20">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [gid]: !c[gid] }))} className="flex shrink-0 items-center gap-1.5 border-r px-2 py-1.5 text-left text-xs font-semibold hover:bg-accent" style={{ width: LABEL_W }}>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: m?.color ?? "#94a3b8" }} />
                    <span className="truncate">{m?.name ?? "ไม่มี milestone"}</span>
                    {m ? <MilestoneBadge status={m.status} className="ml-auto" /> : null}
                    <span className="ml-1 text-[10px] tabular text-muted-foreground">{g.tasks.length}</span>
                  </button>
                  <div className="relative h-8" style={{ width: gridW }}>
                    <GridBg days={days} />
                    {m && mStart !== null && mEnd !== null && mEnd > mStart ? (
                      <div className="absolute top-1.5 h-5 rounded-sm opacity-90" style={{ left: mStart, width: mEnd - mStart, backgroundColor: m.color }} title={`${m.name}: ${format(new Date(m.startDate!), "d MMM", { locale: th })} – ${format(new Date(m.endDate!), "d MMM", { locale: th })}`}>
                        <div className="h-full rounded-sm bg-black/25" style={{ width: `${m.total ? (m.done / m.total) * 100 : 0}%` }} />
                        <span className="absolute inset-0 truncate px-1.5 text-[10px] font-medium leading-5 text-white">{m.total ? `${Math.round((m.done / m.total) * 100)}% · ${m.done}/${m.total}` : m.name}</span>
                      </div>
                    ) : null}
                    {/* milestone events (release/deadline) as flags */}
                    {events.filter((e) => (e.milestoneId ?? "none") === gid).map((e) => {
                      const ex = x(e.startAt);
                      if (ex < 0 || ex > gridW) return null;
                      return <div key={e.id} className="absolute top-0 flex h-8 items-center" style={{ left: ex + DAY_W / 2 - 6 }} title={`${EVENT_LABEL[e.kind]} · ${e.title} · ${format(new Date(e.startAt), "d MMM", { locale: th })}`}><Flag className="h-3 w-3" style={{ color: EVENT_COLOR[e.kind] }} /></div>;
                    })}
                    {todayX >= 0 && todayX <= gridW ? <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-danger" style={{ left: todayX + DAY_W / 2 }} /> : null}
                  </div>
                </div>
                {!isCollapsed ? g.tasks.map((t) => {
                  const hasStart = Boolean(t.startDate);
                  const sx = clampX(x(t.startDate ?? t.dueDate!));
                  const ex = clampX(x(t.dueDate ?? t.startDate!) + DAY_W);
                  const dx = drag?.id === t.id ? Math.round(drag.dx / DAY_W) * DAY_W : 0;
                  const c = TYPE_COLOR[t.type];
                  const overdue = t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <div key={t.id} className="flex border-b last:border-b-0 hover:bg-muted/20">
                      <button onClick={() => openEdit(t)} className="flex shrink-0 items-center gap-1.5 border-r px-2 py-1 text-left text-xs hover:bg-accent" style={{ width: LABEL_W }}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                        <span className={cn("min-w-0 flex-1 truncate", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</span>
                        {t.assignee ? <MemberAvatar name={t.assignee.name} color={t.assignee.color} size="xs" className="ring-0" /> : null}
                      </button>
                      <div className="relative h-7" style={{ width: gridW }}>
                        <GridBg days={days} />
                        {todayX >= 0 && todayX <= gridW ? <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-danger/60" style={{ left: todayX + DAY_W / 2 }} /> : null}
                        {hasStart && ex > sx ? (
                          <div
                            onPointerDown={(e) => onBarPointerDown(e, t)}
                            onPointerMove={onBarPointerMove}
                            onPointerUp={(e) => onBarPointerUp(e, t)}
                            className={cn("absolute top-1.5 flex h-4 cursor-grab select-none items-center overflow-hidden rounded-sm px-1 text-[10px] font-medium text-white active:cursor-grabbing", overdue && "ring-1 ring-danger", t.status === "DONE" && "opacity-50")}
                            style={{ left: sx + dx, width: ex - sx, backgroundColor: c }}
                            title={`${t.title}: ${format(new Date(t.startDate!), "d MMM", { locale: th })} – ${format(new Date(t.dueDate ?? t.startDate!), "d MMM", { locale: th })}`}
                          >
                            <span className="truncate">{t.title}</span>
                          </div>
                        ) : (
                          <div
                            onPointerDown={(e) => onBarPointerDown(e, t)}
                            onPointerMove={onBarPointerMove}
                            onPointerUp={(e) => onBarPointerUp(e, t)}
                            className={cn("absolute top-1.5 h-4 w-4 cursor-grab select-none rotate-45 rounded-sm active:cursor-grabbing", overdue && "ring-1 ring-danger", t.status === "DONE" && "opacity-50")}
                            style={{ left: sx + dx + DAY_W / 2 - 8, backgroundColor: c }}
                            title={`${t.title}: กำหนดส่ง ${format(new Date(t.dueDate!), "d MMM", { locale: th })}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                }) : null}
              </React.Fragment>
            );
          })}
          {groups.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีงานที่ระบุวันในช่วงนี้</p> : null}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">ทิป: ใส่ “วันเริ่ม” ในการ์ดงานเพื่อให้แสดงเป็นแถบช่วงเวลา · ลากแถบ/จุดซ้าย-ขวาเพื่อเลื่อนทั้งงาน · คลิกเพื่อเปิดแก้ไข</p>
    </div>
  );
}

function GridBg({ days }: { days: Date[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {days.map((d) => <div key={d.toISOString()} className={cn("h-full border-r border-border/50", isWeekend(d) && "bg-muted/40")} style={{ width: DAY_W }} />)}
    </div>
  );
}
