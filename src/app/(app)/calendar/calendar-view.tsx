"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { addMonths, addWeeks, eachDayOfInterval, format, isSameDay, isSameMonth, isToday, isWeekend } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/badges";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { EVENT_COLOR, EVENT_LABEL, TYPE_COLOR } from "@/lib/constants";
import { rescheduleTask } from "@/server/actions/tasks";
import { moveEvent } from "@/server/actions/events";
import type { TaskItem, TaskOptions } from "@/server/queries/tasks";
import type { EventItem } from "@/server/queries/calendar";
import { EventDialog } from "./event-dialog";

interface Props {
  view: "month" | "week";
  anchorIso: string;
  rangeStartIso: string;
  rangeEndIso: string;
  tasks: TaskItem[];
  events: EventItem[];
  options: TaskOptions;
  meId: string | null;
}

type Drag = { kind: "task" | "event"; id: string } | null;
const dayKey = (d: Date | string) => format(new Date(d), "yyyy-MM-dd");

export function CalendarView({ view, anchorIso, rangeStartIso, rangeEndIso, tasks: initialTasks, events: initialEvents, options, meId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { openEdit, openNew } = useTaskDialog();
  const anchor = React.useMemo(() => new Date(anchorIso), [anchorIso]);
  const days = React.useMemo(() => eachDayOfInterval({ start: new Date(rangeStartIso), end: new Date(rangeEndIso) }), [rangeStartIso, rangeEndIso]);

  const [tasks, setTasks] = React.useState(initialTasks);
  const [events, setEvents] = React.useState(initialEvents);
  const [seenT, setSeenT] = React.useState(initialTasks);
  const [seenE, setSeenE] = React.useState(initialEvents);
  if (seenT !== initialTasks) { setSeenT(initialTasks); setTasks(initialTasks); }
  if (seenE !== initialEvents) { setSeenE(initialEvents); setEvents(initialEvents); }

  const [drag, setDrag] = React.useState<Drag>(null);
  const [overDay, setOverDay] = React.useState<string | null>(null);
  const [eventDlg, setEventDlg] = React.useState<{ key: number; event: EventItem | null; date: Date | null } | null>(null);
  const showTasks = sp.get("tasks") !== "0";
  const showEvents = sp.get("events") !== "0";

  const set = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const go = (dir: -1 | 0 | 1) => {
    if (dir === 0) return set({ date: null });
    const d = view === "month" ? addMonths(anchor, dir) : addWeeks(anchor, dir);
    set({ date: format(d, "yyyy-MM-dd") });
  };

  const tasksByDay = React.useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const k = dayKey(t.dueDate);
      (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    }
    return m;
  }, [tasks]);
  const eventsByDay = React.useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of events) {
      const k = dayKey(e.startAt);
      (m.get(k) ?? m.set(k, []).get(k)!).push(e);
    }
    for (const arr of m.values()) arr.sort((a, b) => Number(b.allDay) - Number(a.allDay) || new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return m;
  }, [events]);

  const drop = async (day: Date) => {
    const d = drag;
    setDrag(null);
    setOverDay(null);
    if (!d) return;
    const key = dayKey(day);
    if (d.kind === "task") {
      const t = tasks.find((x) => x.id === d.id);
      if (!t || (t.dueDate && isSameDay(new Date(t.dueDate), day))) return;
      const prev = tasks;
      setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, dueDate: new Date(`${key}T18:00:00`).toISOString() } : x)));
      const r = await rescheduleTask({ id: t.id, dueDate: key });
      if (!r.ok) { setTasks(prev); toast.error(r.error); return; }
      toast.success(`เลื่อนกำหนดส่งไป ${format(day, "EEE d MMM", { locale: th })}`);
    } else {
      const e = events.find((x) => x.id === d.id);
      if (!e || isSameDay(new Date(e.startAt), day)) return;
      const prev = events;
      setEvents((xs) => xs.map((x) => {
        if (x.id !== e.id) return x;
        const s = new Date(x.startAt);
        const ns = new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.getHours(), s.getMinutes());
        const ne = x.endAt ? new Date(ns.getTime() + (new Date(x.endAt).getTime() - s.getTime())) : null;
        return { ...x, startAt: ns.toISOString(), endAt: ne?.toISOString() ?? null };
      }));
      const r = await moveEvent({ id: e.id, day: key });
      if (!r.ok) { setEvents(prev); toast.error(r.error); return; }
      toast.success(`เลื่อนกิจกรรมไป ${format(day, "EEE d MMM", { locale: th })}`);
    }
    router.refresh();
  };

  const title = view === "month" ? format(anchor, "MMMM yyyy", { locale: th }) : `${format(days[0], "d MMM", { locale: th })} – ${format(days[6], "d MMM yyyy", { locale: th })}`;
  const sel = "h-8 w-auto min-w-[120px] py-0 text-xs";
  const weekdays = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

  const renderTask = (t: TaskItem) => {
    const c = TYPE_COLOR[t.type];
    const overdue = t.status !== "DONE" && new Date(t.dueDate!) < new Date();
    return (
      <button
        key={t.id}
        draggable
        onDragStart={(e) => { setDrag({ kind: "task", id: t.id }); e.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => { setDrag(null); setOverDay(null); }}
        onClick={(e) => { e.stopPropagation(); openEdit(t); }}
        title={`${t.title}${t.assignee ? ` · ${t.assignee.name}` : ""}`}
        className={cn("flex w-full items-center gap-1 rounded border-l-2 bg-card px-1.5 py-0.5 text-left text-[11px] shadow-sm hover:bg-accent", drag?.id === t.id && "opacity-40", t.status === "DONE" && "opacity-60", overdue && "ring-1 ring-danger/50")}
        style={{ borderLeftColor: c }}
      >
        <span className={cn("min-w-0 flex-1 truncate", t.status === "DONE" && "line-through")}>{t.title}</span>
        {t.assignee ? <MemberAvatar name={t.assignee.name} color={t.assignee.color} size="xs" className="ring-0" /> : null}
      </button>
    );
  };
  const renderEvent = (e: EventItem) => {
    const c = EVENT_COLOR[e.kind];
    return (
      <button
        key={e.id}
        draggable
        onDragStart={(ev) => { setDrag({ kind: "event", id: e.id }); ev.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => { setDrag(null); setOverDay(null); }}
        onClick={(ev) => { ev.stopPropagation(); setEventDlg({ key: Date.now(), event: e, date: null }); }}
        title={`${EVENT_LABEL[e.kind]} · ${e.title}`}
        className={cn("flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white shadow-sm hover:opacity-90", drag?.id === e.id && "opacity-40")}
        style={{ backgroundColor: c }}
      >
        {!e.allDay ? <span className="tabular opacity-80">{format(new Date(e.startAt), "HH:mm")}</span> : null}
        <span className="min-w-0 flex-1 truncate">{e.title}</span>
      </button>
    );
  };

  const weekStarts = React.useMemo(() => days.filter((_, i) => i % 7 === 0), [days]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-md border bg-background">
          <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="ก่อนหน้า"><ChevronLeft /></Button>
          <Button variant="ghost" size="sm" onClick={() => go(0)}>วันนี้</Button>
          <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="ถัดไป"><ChevronRight /></Button>
        </div>
        <h2 className="min-w-[180px] text-sm font-semibold">{title}</h2>
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button key={v} onClick={() => set({ view: v === "month" ? null : v })} className={cn("rounded px-2.5 py-1 text-xs font-medium transition-colors", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              {v === "month" ? "เดือน" : "สัปดาห์"}
            </button>
          ))}
        </div>
        <Select value={sp.get("assignee") ?? ""} onChange={(e) => set({ assignee: e.target.value })} className={sel}>
          <option value="">ทุกคน</option>
          {meId ? <option value="me">งานของฉัน</option> : null}
          {options.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select value={sp.get("milestone") ?? ""} onChange={(e) => set({ milestone: e.target.value })} className={sel}>
          <option value="">ทุก milestone</option>
          {options.milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={showTasks} onChange={(e) => set({ tasks: e.target.checked ? null : "0" })} className="accent-primary" /> งาน</label>
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={showEvents} onChange={(e) => set({ events: e.target.checked ? null : "0" })} className="accent-primary" /> กิจกรรม</label>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEventDlg({ key: Date.now(), event: null, date: new Date() })}><CalendarPlus /> เพิ่มกิจกรรม</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[11px] font-medium text-muted-foreground">
          {weekdays.map((w) => <div key={w} className="py-1.5">{w}</div>)}
        </div>
        {weekStarts.map((ws, wi) => (
          <div key={wi} className={cn("grid grid-cols-7 border-b last:border-b-0", view === "week" ? "min-h-[520px]" : "min-h-[112px]")}>
            {days.slice(wi * 7, wi * 7 + 7).map((day) => {
              const key = dayKey(day);
              const dayTasks = showTasks ? (tasksByDay.get(key) ?? []) : [];
              const dayEvents = showEvents ? (eventsByDay.get(key) ?? []) : [];
              const dim = view === "month" && !isSameMonth(day, anchor);
              const isOver = overDay === key;
              return (
                <div
                  key={key}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overDay !== key) setOverDay(key); }}
                  onDragLeave={() => setOverDay((o) => (o === key ? null : o))}
                  onDrop={(e) => { e.preventDefault(); drop(day); }}
                  className={cn("group relative flex min-w-0 flex-col gap-0.5 border-r p-1 last:border-r-0 transition-colors", dim && "bg-muted/30 text-muted-foreground", isWeekend(day) && !dim && "bg-muted/10", isOver && "bg-primary/10 ring-1 ring-inset ring-primary")}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular", isToday(day) && "bg-primary font-semibold text-primary-foreground")}>{format(day, "d")}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100" aria-label="เพิ่ม"><Plus className="h-3.5 w-3.5" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openNew({ dueDate: key })}>+ การ์ดงาน (กำหนดส่ง {format(day, "d MMM", { locale: th })})</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEventDlg({ key: Date.now(), event: null, date: day })}>+ กิจกรรม</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                    {dayEvents.map(renderEvent)}
                    {dayTasks.map(renderTask)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="font-medium">สัญลักษณ์:</span>
        {(Object.keys(EVENT_LABEL) as (keyof typeof EVENT_LABEL)[]).map((k) => <span key={k} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EVENT_COLOR[k] }} />{EVENT_LABEL[k]}</span>)}
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-3 rounded border-l-2 bg-card" style={{ borderLeftColor: TYPE_COLOR.SCRIPT }} />การ์ดงาน (สีตามประเภท)</span>
      </div>

      {eventDlg ? <EventDialog key={eventDlg.key} event={eventDlg.event} defaultDate={eventDlg.date} milestones={options.milestones} open onOpenChange={(o) => !o && setEventDlg(null)} /> : null}
    </div>
  );
}
