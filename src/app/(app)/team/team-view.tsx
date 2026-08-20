"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { MemberRole } from "@prisma/client";
import { Plus, Trash2, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { MemberAvatar } from "@/components/shared/badges";
import { TaskCard } from "@/components/tasks/task-card";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { MEMBER_COLORS, MEMBER_ROLES, ROLE_LABEL } from "@/lib/constants";
import { createMember, deleteMember, selectMember, updateMember, type MemberInput } from "@/server/actions/members";
import type { MemberSummary } from "@/server/queries/overview";
import type { TaskItem } from "@/server/queries/tasks";

export function TeamView({ members, tasks, meId }: { members: MemberSummary[]; tasks: TaskItem[]; meId: string | null }) {
  const router = useRouter();
  const { openEdit, openNew } = useTaskDialog();
  const [dlg, setDlg] = React.useState<{ key: number; m: MemberSummary | null } | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(meId);

  const pick = async (id: string) => {
    const r = await selectMember({ id });
    if (r.ok) { toast.success("เลือกตัวตนแล้ว"); router.refresh(); } else toast.error(r.error);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{members.filter((m) => m.active).length} คนที่ใช้งานอยู่</p>
        <Button size="sm" onClick={() => setDlg({ key: Date.now(), m: null })}><Plus /> เพิ่มสมาชิก</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => {
          const open = expanded === m.id;
          const mine = tasks.filter((t) => t.assigneeId === m.id);
          return (
            <Card key={m.id} className={cn(!m.active && "opacity-60", meId === m.id && "border-primary/50")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MemberAvatar name={m.name} color={m.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      {meId === m.id ? <Badge variant="info">ฉัน</Badge> : null}
                      {!m.active ? <Badge variant="muted">พัก</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_LABEL[m.role as MemberRole]}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDlg({ key: Date.now(), m })}>แก้ไข</Button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[["ค้าง", m.open, ""], ["กำลังทำ", m.doing, "text-info"], ["เลยกำหนด", m.overdue, m.overdue ? "text-danger" : ""], ["ชม.ที่เหลือ", m.hours, ""]].map(([l, v, c]) => (
                    <div key={String(l)} className="rounded-md bg-muted/40 p-1.5">
                      <p className={cn("text-base font-semibold tabular", c as string)}>{v}</p>
                      <p className="text-[10px] text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openNew({ assigneeId: m.id })}><Plus /> มอบหมายงาน</Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : m.id)}>{open ? "ซ่อน" : `ดูงาน (${mine.length})`}</Button>
                  {meId !== m.id && m.active ? <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => pick(m.id)}><UserRoundCheck /> นี่คือฉัน</Button> : null}
                </div>
                {open ? (
                  <div className="mt-3 flex flex-col gap-1.5 border-t pt-3">
                    {mine.length === 0 ? <p className="text-center text-xs text-muted-foreground">ไม่มีงานค้าง 🎉</p> : mine.map((t) => <TaskCard key={t.id} task={t} compact onClick={() => openEdit(t)} />)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {dlg ? <MemberDialog key={dlg.key} member={dlg.m} open onOpenChange={(o) => !o && setDlg(null)} /> : null}
    </div>
  );
}

function MemberDialog({ member, open, onOpenChange }: { member: MemberSummary | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(member);
  const [name, setName] = React.useState(member?.name ?? "");
  const [role, setRole] = React.useState<MemberRole>((member?.role as MemberRole) ?? "OTHER");
  const [color, setColor] = React.useState(() => member?.color ?? MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)]);
  const [discordId, setDiscordId] = React.useState(member?.discordId ?? "");
  const [active, setActive] = React.useState(member?.active ?? true);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const submit = () =>
    start(async () => {
      const payload: MemberInput = { name, role, color, discordId: discordId.trim() || null, active };
      const r = editing && member ? await updateMember({ id: member.id, data: payload }) : await createMember(payload);
      if (r.ok) { toast.success(editing ? "บันทึกแล้ว" : "เพิ่มสมาชิกแล้ว"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
    });
  const remove = () =>
    start(async () => {
      if (!member) return;
      const r = await deleteMember({ id: member.id });
      if (r.ok) { toast.success("ลบสมาชิกแล้ว (งานที่มอบหมายจะกลายเป็น “ยังไม่มอบหมาย”)"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && name.trim()) submit(); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขสมาชิก" : "เพิ่มสมาชิกทีม"}</DialogTitle>
          <DialogDescription>ไม่ต้องมีรหัสผ่าน — แค่ชื่อกับบทบาท ทุกคนเลือกชื่อตัวเองตอนเข้าใช้</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <MemberAvatar name={name || "?"} color={color} size="lg" />
            <Field label="ชื่อ (ชื่อเล่นก็ได้)" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Bank" autoFocus /></Field>
          </div>
          <Field label="บทบาท"><Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>{MEMBER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
          <Field label="Discord User ID (สำหรับแจ้งเตือน @mention)" hint="Discord → เปิด Developer Mode → คลิกขวาที่ชื่อตัวเอง → Copy User ID · เว้นว่างได้ถ้าไม่ใช้">
            <Input value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="เช่น 245831294982819840" inputMode="numeric" />
          </Field>
          <Field label="สีประจำตัว">
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {MEMBER_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={cn("h-6 w-6 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} aria-label={c} />)}
            </div>
          </Field>
          {editing ? (
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
              <label htmlFor="active" className="text-sm">ใช้งานอยู่ (ปิดเพื่อซ่อนจากรายชื่อมอบหมาย โดยไม่ลบประวัติ)</label>
            </div>
          ) : null}
        </div>
        <DialogFooter className="sm:justify-between">
          <div>
            {editing ? (confirmDelete ? (
              <span className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">ลบถาวร?</span><Button size="sm" variant="destructive" onClick={remove} loading={pending}>ใช่ ลบ</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>ไม่</Button></span>
            ) : <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 /> ลบ</Button>) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={submit} loading={pending} disabled={!name.trim()}>{editing ? "บันทึก" : "เพิ่ม"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
