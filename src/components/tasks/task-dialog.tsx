"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { CheckSquare, FileCode2, MessageSquare, Plus, Send, Tag, Trash2, X } from "lucide-react";
import type { Priority, TaskStatus, TaskType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar, StatusBadge } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, TASK_TYPES, TYPE_LABEL, type ChecklistItem } from "@/lib/constants";
import { addComment, createTask, deleteComment, deleteTask, fetchComments, updateTask, type TaskInput } from "@/server/actions/tasks";
import type { CommentItem, TaskItem, TaskOptions } from "@/server/queries/tasks";

export interface TaskDefaults {
  status?: TaskStatus;
  dueDate?: string | null;
  milestoneId?: string | null;
  assigneeId?: string | null;
}

const toDateInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

export function TaskDialog({ options, task, defaults, open, onOpenChange, meId }: { options: TaskOptions; task?: TaskItem | null; defaults?: TaskDefaults; open: boolean; onOpenChange: (o: boolean) => void; meId?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(task);

  const [title, setTitle] = React.useState(task?.title ?? "");
  const [description, setDescription] = React.useState(task?.description ?? "");
  const [type, setType] = React.useState<TaskType>(task?.type ?? "OTHER");
  const [status, setStatus] = React.useState<TaskStatus>(task?.status ?? defaults?.status ?? "TODO");
  const [priority, setPriority] = React.useState<Priority>(task?.priority ?? "MEDIUM");
  const [assigneeId, setAssigneeId] = React.useState(task?.assigneeId ?? defaults?.assigneeId ?? "");
  const [milestoneId, setMilestoneId] = React.useState(task?.milestoneId ?? defaults?.milestoneId ?? "");
  const [startDate, setStartDate] = React.useState(toDateInput(task?.startDate));
  const [dueDate, setDueDate] = React.useState(task ? toDateInput(task.dueDate) : (defaults?.dueDate ?? ""));
  const [estimate, setEstimate] = React.useState(task?.estimateHours?.toString() ?? "");
  const [tags, setTags] = React.useState<string[]>(task?.tags ?? []);
  const [tagDraft, setTagDraft] = React.useState("");
  const [files, setFiles] = React.useState<string[]>(task?.files ?? []);
  const [fileDraft, setFileDraft] = React.useState("");
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>(task?.checklist ?? []);
  const [checkDraft, setCheckDraft] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Comments (edit mode)
  const [comments, setComments] = React.useState<CommentItem[] | null>(null);
  const [commentDraft, setCommentDraft] = React.useState("");
  React.useEffect(() => {
    if (!task?.id || !open) return;
    let alive = true;
    fetchComments({ taskId: task.id }).then((c) => alive && setComments(c));
    return () => { alive = false; };
  }, [task?.id, open]);

  const payload = (): TaskInput => ({
    title,
    description: description.trim() || null,
    type,
    status,
    priority,
    assigneeId: assigneeId || null,
    milestoneId: milestoneId || null,
    startDate: startDate || null,
    dueDate: dueDate || null,
    estimateHours: estimate.trim() === "" ? null : Number(estimate),
    tags,
    checklist,
    files,
  });

  const submit = () =>
    start(async () => {
      const r = editing && task ? await updateTask({ id: task.id, data: payload() }) : await createTask(payload());
      if (r.ok) {
        toast.success(editing ? "บันทึกงานแล้ว" : "สร้างงานแล้ว");
        onOpenChange(false);
        router.refresh();
      } else toast.error(r.error);
    });

  const remove = () =>
    start(async () => {
      if (!task) return;
      const r = await deleteTask({ id: task.id });
      if (r.ok) {
        toast.success("ลบงานแล้ว");
        onOpenChange(false);
        router.refresh();
      } else toast.error(r.error);
    });

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  };
  const addFile = () => {
    const f = fileDraft.trim();
    if (f && !files.includes(f)) setFiles([...files, f]);
    setFileDraft("");
  };
  const addCheck = () => {
    const t = checkDraft.trim();
    if (t) setChecklist([...checklist, { id: uid(), text: t, done: false }]);
    setCheckDraft("");
  };
  const sendComment = () =>
    start(async () => {
      if (!task || !commentDraft.trim()) return;
      const r = await addComment({ taskId: task.id, body: commentDraft });
      if (r.ok) {
        setComments((c) => [...(c ?? []), r.data]);
        setCommentDraft("");
        router.refresh();
      } else toast.error(r.error);
    });
  const removeComment = (id: string) =>
    start(async () => {
      const r = await deleteComment({ id });
      if (r.ok) setComments((c) => (c ?? []).filter((x) => x.id !== id));
      else toast.error(r.error);
    });

  const doneCount = checklist.filter((c) => c.done).length;
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (title.trim()) submit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="p-0" onKeyDown={onKey}>
        <div className="grid md:grid-cols-[1fr_300px]">
          {/* ── Main form ───────────────────────────── */}
          <div className="space-y-3 p-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing ? "แก้ไขงาน" : "สร้างการ์ดงานใหม่"}
                {task ? <StatusBadge status={task.status} /> : null}
              </DialogTitle>
              <DialogDescription>{editing && task ? `สร้างเมื่อ ${format(new Date(task.createdAt), "d MMM yyyy", { locale: th })} · อัปเดต ${formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: th })}` : "กรอกชื่องานแล้วกด Ctrl+Enter เพื่อบันทึกเร็ว ๆ"}</DialogDescription>
            </DialogHeader>

            <Field label="ชื่องาน"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น DuelRoomLogic: sync seed ระหว่าง 2 client" autoFocus /></Field>
            <Field label="รายละเอียด / Acceptance criteria"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[96px]" placeholder="บริบท, ขั้นตอน, สิ่งที่ต้องเช็ค (ExecSpace, Body component, RUID…)" /></Field>

            {/* Checklist */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><CheckSquare className="h-3.5 w-3.5" /> Checklist {checklist.length ? <span className="tabular">({doneCount}/{checklist.length})</span> : null}</p>
              </div>
              {checklist.length ? (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-success transition-[width]" style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
              ) : null}
              <ul className="space-y-1">
                {checklist.map((c) => (
                  <li key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/60">
                    <Checkbox checked={c.done} onCheckedChange={(v) => setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, done: Boolean(v) } : x)))} />
                    <input value={c.text} onChange={(e) => setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)))} className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none", c.done && "text-muted-foreground line-through")} />
                    <button onClick={() => setChecklist((l) => l.filter((x) => x.id !== c.id))} className="opacity-0 group-hover:opacity-100" aria-label="ลบ"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={checkDraft} onChange={(e) => setCheckDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }} placeholder="เพิ่มรายการย่อย แล้วกด Enter" className="h-8 text-xs" />
                <Button variant="outline" size="sm" onClick={addCheck} disabled={!checkDraft.trim()}><Plus /></Button>
              </div>
            </div>

            {/* Files */}
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><FileCode2 className="h-3.5 w-3.5" /> ไฟล์ที่เกี่ยวข้องใน workspace</p>
              {files.length ? (
                <div className="flex flex-wrap gap-1">
                  {files.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]">
                      {f}
                      <button onClick={() => setFiles((l) => l.filter((x) => x !== f))} aria-label="ลบ"><X className="h-3 w-3 text-muted-foreground" /></button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input value={fileDraft} onChange={(e) => setFileDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFile(); } }} placeholder="RootDesk/MyDesk/Foo.mlua · ui/Popup.ui · map/Lobby.map" className="h-8 font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={addFile} disabled={!fileDraft.trim()}><Plus /></Button>
              </div>
            </div>

            {/* Comments */}
            {editing && task ? (
              <div className="space-y-2 border-t pt-3">
                <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> คอมเมนต์ {comments ? `(${comments.length})` : ""}</p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {comments === null ? <p className="text-xs text-muted-foreground">กำลังโหลด…</p> : comments.length === 0 ? <p className="text-xs text-muted-foreground">ยังไม่มีคอมเมนต์ — เริ่มคุยกันตรงนี้ได้เลย</p> : comments.map((c) => (
                    <div key={c.id} className="group flex gap-2">
                      <MemberAvatar name={c.author?.name ?? "?"} color={c.author?.color ?? "#888"} size="sm" className="mt-0.5" />
                      <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-2.5 py-1.5">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{c.author?.name ?? "ไม่ทราบชื่อ"}</span>
                          <span>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: th })}</span>
                          <button onClick={() => removeComment(c.id)} className="ml-auto opacity-0 group-hover:opacity-100" aria-label="ลบคอมเมนต์"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); sendComment(); } }} placeholder={meId ? "พิมพ์คอมเมนต์ แล้ว Enter เพื่อส่ง (Shift+Enter ขึ้นบรรทัดใหม่)" : "เลือกชื่อตัวเองที่มุมขวาบนก่อน จะได้รู้ว่าใครคอมเมนต์"} className="min-h-[40px] text-sm" rows={1} />
                  <Button variant="outline" size="sm" onClick={sendComment} disabled={!commentDraft.trim() || pending}><Send /></Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Side: meta ─────────────────────────── */}
          <aside className="space-y-3 border-t bg-muted/30 p-5 md:border-l md:border-t-0">
            <Field label="สถานะ">
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
            </Field>
            <Field label="ผู้รับผิดชอบ">
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— ยังไม่มอบหมาย —</option>
                {options.members.map((m) => <option key={m.id} value={m.id}>{m.name}{meId === m.id ? " (ฉัน)" : ""}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ประเภทงาน">
                <Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>{TASK_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>
              </Field>
              <Field label="ความสำคัญ">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select>
              </Field>
            </div>
            <Field label="Milestone">
              <Select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {options.milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="เริ่ม"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="กำหนดส่ง"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            </div>
            <Field label="ประมาณเวลา (ชม.)"><Input type="number" min={0} step={0.5} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="เช่น 4" /></Field>
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Tag className="h-3.5 w-3.5" /> แท็ก</p>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    #{t}
                    <button onClick={() => setTags((l) => l.filter((x) => x !== t))} aria-label="ลบแท็ก"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="พิมพ์แล้ว Enter" className="h-8 text-xs" />
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t px-5 py-3 sm:justify-between">
          <div>
            {editing ? (
              confirmDelete ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">ลบงานนี้?</span>
                  <Button size="sm" variant="destructive" onClick={remove} loading={pending}>ใช่ ลบเลย</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>ไม่</Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={pending}><Trash2 /> ลบ</Button>
              )
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={submit} loading={pending} disabled={!title.trim()}>{editing ? "บันทึก" : "สร้างการ์ด"} <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] opacity-70 sm:inline">Ctrl+↵</kbd></Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
