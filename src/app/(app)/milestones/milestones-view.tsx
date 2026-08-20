"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";
import { th } from "date-fns/locale";
import type { MilestoneStatus } from "@prisma/client";
import { CalendarRange, ChevronDown, ChevronUp, Clock, Flag, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Progress } from "@/components/shared/page";
import { MilestoneBadge, StatusBadge } from "@/components/shared/badges";
import { TaskCard } from "@/components/tasks/task-card";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { MEMBER_COLORS, MILESTONE_LABEL, MILESTONE_STATUSES, STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { createMilestone, deleteMilestone, reorderMilestones, updateMilestone, type MilestoneInput } from "@/server/actions/milestones";
import type { MilestoneSummary } from "@/server/queries/overview";
import type { TaskItem } from "@/server/queries/tasks";

const toDate = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd") : "");

export function MilestonesView({ milestones, tasks }: { milestones: MilestoneSummary[]; tasks: TaskItem[] }) {
  const router = useRouter();
  const { openEdit, openNew } = useTaskDialog();
  const [dlg, setDlg] = React.useState<{ key: number; m: MilestoneSummary | null } | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(milestones.find((m) => m.status === "ACTIVE")?.id ?? null);
  const [, start] = useTransition();

  const move = (id: string, dir: -1 | 1) => {
    const ids = milestones.map((m) => m.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => {
      const r = await reorderMilestones({ ids });
      if (r.ok) router.refresh(); else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{milestones.length} milestones · {milestones.filter((m) => m.status === "DONE").length} เสร็จแล้ว</p>
        <Button size="sm" onClick={() => setDlg({ key: Date.now(), m: null })}><Plus /> เพิ่ม milestone</Button>
      </div>
      {milestones.length === 0 ? <EmptyState icon={Flag} title="ยังไม่มี milestone" description="สร้าง M1, M2 … เพื่อจัดกลุ่มงานเป็นช่วง ๆ" action={<Button size="sm" onClick={() => setDlg({ key: Date.now(), m: null })}><Plus /> เพิ่ม milestone</Button>} /> : null}
      {milestones.map((m, idx) => {
        const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
        const daysLeft = m.endDate ? differenceInCalendarDays(new Date(m.endDate), new Date()) : null;
        const open = expanded === m.id;
        const mTasks = tasks.filter((t) => t.milestoneId === m.id);
        return (
          <Card key={m.id} className={cn("overflow-hidden", m.status === "ACTIVE" && "border-primary/40")}>
            <div className="h-1" style={{ backgroundColor: m.color }} />
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{m.name}</h3>
                    <MilestoneBadge status={m.status} />
                    {m.overdue ? <span className="text-[11px] font-medium text-danger">{m.overdue} งานเลยกำหนด</span> : null}
                  </div>
                  {m.description ? <p className="mt-0.5 text-sm text-muted-foreground">{m.description}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" /> {m.startDate ? format(new Date(m.startDate), "d MMM", { locale: th }) : "?"} – {m.endDate ? format(new Date(m.endDate), "d MMM yyyy", { locale: th }) : "?"}</span>
                    {daysLeft !== null && m.status !== "DONE" ? <span className={cn("inline-flex items-center gap-1", daysLeft < 0 ? "font-medium text-danger" : daysLeft <= 3 ? "font-medium text-warning-foreground dark:text-warning" : "")}><Clock className="h-3.5 w-3.5" /> {daysLeft < 0 ? `เลยกำหนด ${-daysLeft} วัน` : daysLeft === 0 ? "ครบกำหนดวันนี้" : `เหลือ ${daysLeft} วัน`}</span> : null}
                    <span className="tabular">{m.done}/{m.total} งาน · {m.remainingHours ? `เหลือ ~${m.remainingHours} ชม.` : m.estimateHours ? `${m.estimateHours} ชม.` : "ยังไม่ประมาณเวลา"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={pct} color={m.color} className="max-w-md" />
                    <span className="text-xs font-medium tabular">{pct}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TASK_STATUSES.map((s) => m.byStatus[s] ? <span key={s} className="inline-flex items-center gap-1 text-[11px]"><StatusBadge status={s} /> <span className="tabular text-muted-foreground">{m.byStatus[s]}</span></span> : null)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => move(m.id, -1)} disabled={idx === 0} aria-label="ขึ้น"><ChevronUp /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => move(m.id, 1)} disabled={idx === milestones.length - 1} aria-label="ลง"><ChevronDown /></Button>
                  <Button variant="outline" size="sm" onClick={() => openNew({ milestoneId: m.id })}><Plus /> งาน</Button>
                  <Button variant="outline" size="sm" onClick={() => setDlg({ key: Date.now(), m })}>แก้ไข</Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : m.id)}>{open ? "ซ่อนงาน" : `ดูงาน (${mTasks.length})`}</Button>
                </div>
              </div>
              {open ? (
                <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-5">
                  {TASK_STATUSES.map((s) => {
                    const items = mTasks.filter((t) => t.status === s);
                    return (
                      <div key={s} className="rounded-md bg-muted/30 p-2">
                        <div className="mb-1.5 flex items-center justify-between"><StatusBadge status={s} /><span className="text-[11px] tabular text-muted-foreground">{items.length}</span></div>
                        <div className="flex flex-col gap-1.5">
                          {items.map((t) => <TaskCard key={t.id} task={t} compact onClick={() => openEdit(t)} />)}
                          {items.length === 0 ? <p className="py-2 text-center text-[11px] text-muted-foreground">— ไม่มี{STATUS_LABEL[s]} —</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      {dlg ? <MilestoneDialog key={dlg.key} milestone={dlg.m} open onOpenChange={(o) => !o && setDlg(null)} /> : null}
    </div>
  );
}

function MilestoneDialog({ milestone, open, onOpenChange }: { milestone: MilestoneSummary | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(milestone);
  const [name, setName] = React.useState(milestone?.name ?? "");
  const [description, setDescription] = React.useState(milestone?.description ?? "");
  const [status, setStatus] = React.useState<MilestoneStatus>(milestone?.status ?? "PLANNED");
  const [color, setColor] = React.useState(milestone?.color ?? MEMBER_COLORS[0]);
  const [startDate, setStartDate] = React.useState(toDate(milestone?.startDate ?? null));
  const [endDate, setEndDate] = React.useState(toDate(milestone?.endDate ?? null));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const submit = () =>
    start(async () => {
      const payload: MilestoneInput = { name, description: description.trim() || null, status, color, startDate: startDate || null, endDate: endDate || null };
      const r = editing && milestone ? await updateMilestone({ id: milestone.id, data: payload }) : await createMilestone(payload);
      if (r.ok) { toast.success(editing ? "บันทึกแล้ว" : "สร้าง milestone แล้ว"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
    });
  const remove = () =>
    start(async () => {
      if (!milestone) return;
      const r = await deleteMilestone({ id: milestone.id });
      if (r.ok) { toast.success("ลบ milestone แล้ว (งานในนั้นยังอยู่ แต่ไม่มี milestone)"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && name.trim()) submit(); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไข milestone" : "เพิ่ม milestone"}</DialogTitle>
          <DialogDescription>ช่วงงานของโปรเจค เช่น “M7 · Duel Room”</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="ชื่อ" className="md:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="M8 · Season Event" autoFocus /></Field>
          <Field label="รายละเอียด / เป้าหมาย" className="md:col-span-2"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[64px]" /></Field>
          <Field label="สถานะ"><Select value={status} onChange={(e) => setStatus(e.target.value as MilestoneStatus)}>{MILESTONE_STATUSES.map((s) => <option key={s} value={s}>{MILESTONE_LABEL[s]}</option>)}</Select></Field>
          <Field label="สี">
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {MEMBER_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={cn("h-6 w-6 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} aria-label={c} />)}
            </div>
          </Field>
          <Field label="วันเริ่ม"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="วันสิ้นสุด"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>
        <DialogFooter className="sm:justify-between">
          <div>
            {editing ? (confirmDelete ? (
              <span className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">ลบ milestone นี้?</span><Button size="sm" variant="destructive" onClick={remove} loading={pending}>ใช่ ลบ</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>ไม่</Button></span>
            ) : <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 /> ลบ</Button>) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={submit} loading={pending} disabled={!name.trim()}>{editing ? "บันทึก" : "สร้าง"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
