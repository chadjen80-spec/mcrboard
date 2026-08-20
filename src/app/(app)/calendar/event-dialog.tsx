"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import type { EventKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { EVENT_KINDS, EVENT_LABEL } from "@/lib/constants";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "@/server/actions/events";
import type { EventItem } from "@/server/queries/calendar";

const toLocal = (iso: string | null | undefined, allDay: boolean) => {
  if (!iso) return "";
  const d = new Date(iso);
  return allDay ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM-dd'T'HH:mm");
};

export function EventDialog({ event, defaultDate, milestones, open, onOpenChange }: { event?: EventItem | null; defaultDate?: Date | null; milestones: { id: string; name: string }[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(event);
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [kind, setKind] = React.useState<EventKind>(event?.kind ?? "MEETING");
  const [allDay, setAllDay] = React.useState(event?.allDay ?? false);
  const [startAt, setStartAt] = React.useState(event ? toLocal(event.startAt, event.allDay) : defaultDate ? format(defaultDate, "yyyy-MM-dd'T'10:00") : "");
  const [endAt, setEndAt] = React.useState(event ? toLocal(event.endAt, event.allDay) : defaultDate ? format(defaultDate, "yyyy-MM-dd'T'11:00") : "");
  const [milestoneId, setMilestoneId] = React.useState(event?.milestoneId ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const toggleAllDay = (v: boolean) => {
    setAllDay(v);
    setStartAt((s) => (v ? s.slice(0, 10) : s.length === 10 ? `${s}T10:00` : s));
    setEndAt((s) => (v ? "" : s.length === 10 ? `${s}T11:00` : s));
  };

  const submit = () =>
    start(async () => {
      const payload: EventInput = { title, description: description.trim() || null, kind, startAt, endAt: allDay ? null : endAt || null, allDay, milestoneId: milestoneId || null };
      const r = editing && event ? await updateEvent({ id: event.id, data: payload }) : await createEvent(payload);
      if (r.ok) {
        toast.success(editing ? "บันทึกกิจกรรมแล้ว" : "เพิ่มกิจกรรมแล้ว");
        onOpenChange(false);
        router.refresh();
      } else toast.error(r.error);
    });
  const remove = () =>
    start(async () => {
      if (!event) return;
      const r = await deleteEvent({ id: event.id });
      if (r.ok) { toast.success("ลบกิจกรรมแล้ว"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && title.trim()) submit(); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรมในปฏิทิน"}</DialogTitle>
          <DialogDescription>ประชุม · playtest · release · deadline ของทีม</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="ชื่อกิจกรรม" className="md:col-span-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น Playtest Duel Room (2 client)" autoFocus /></Field>
          <Field label="ประเภท">
            <Select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>{EVENT_KINDS.map((k) => <option key={k} value={k}>{EVENT_LABEL[k]}</option>)}</Select>
          </Field>
          <Field label="Milestone">
            <Select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox id="allday" checked={allDay} onCheckedChange={(v) => toggleAllDay(Boolean(v))} />
            <label htmlFor="allday" className="text-sm">ทั้งวัน</label>
          </div>
          <Field label="เริ่ม"><Input type={allDay ? "date" : "datetime-local"} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
          {!allDay ? <Field label="สิ้นสุด"><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field> : <div />}
          <Field label="รายละเอียด" className="md:col-span-2"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[72px]" placeholder="ลิงก์ห้องประชุม, สิ่งที่ต้องเตรียม…" /></Field>
        </div>
        <DialogFooter className="sm:justify-between">
          <div>
            {editing ? (confirmDelete ? (
              <span className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">ลบกิจกรรมนี้?</span><Button size="sm" variant="destructive" onClick={remove} loading={pending}>ใช่ ลบ</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>ไม่</Button></span>
            ) : <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 /> ลบ</Button>) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={submit} loading={pending} disabled={!title.trim() || !startAt}>{editing ? "บันทึก" : "เพิ่มกิจกรรม"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
