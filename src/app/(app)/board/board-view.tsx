"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowUpDown, Plus } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/page";
import { MemberPill, MilestoneChip, PriorityBadge, StatusBadge, TypeBadge } from "@/components/shared/badges";
import { TaskCard, dueLabel, isOverdue } from "@/components/tasks/task-card";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { PRIORITY_RANK, STATUS_HINT, STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { moveTask, quickCreateTask } from "@/server/actions/tasks";
import type { TaskItem } from "@/server/queries/tasks";

export function BoardView({ tasks: initial, view, focusId }: { tasks: TaskItem[]; view: "kanban" | "list"; focusId?: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const { openEdit, openNew } = useTaskDialog();
  const [tasks, setTasks] = React.useState(initial);
  const [seen, setSeen] = React.useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setTasks(initial);
  }
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<{ col: TaskStatus; index: number } | null>(null);
  const [sort, setSort] = React.useState<{ key: "title" | "status" | "priority" | "dueDate" | "assignee"; dir: 1 | -1 }>({ key: "status", dir: 1 });
  const focusRef = React.useRef<HTMLDivElement | null>(null);
  const [hideDone, setHideDone] = React.useState(false);

  React.useEffect(() => {
    if (focusId) {
      const t = initial.find((x) => x.id === focusId);
      if (t) openEdit(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const byCol = React.useMemo(() => {
    const m = new Map<TaskStatus, TaskItem[]>();
    for (const s of TASK_STATUSES) m.set(s, []);
    for (const t of tasks) m.get(t.status)!.push(t);
    return m;
  }, [tasks]);

  const drop = (col: TaskStatus, index: number) => {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id) return;
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const colItems = byCol.get(col)!.filter((x) => x.id !== id);
    const idx = Math.min(index, colItems.length);
    // Optimistic: rebuild orders
    const next = tasks.map((x) => ({ ...x }));
    const moved = next.find((x) => x.id === id)!;
    const prevStatus = moved.status;
    moved.status = col;
    const reordered = [...colItems.map((x) => next.find((n) => n.id === x.id)!)];
    reordered.splice(idx, 0, moved);
    reordered.forEach((x, i) => (x.order = i));
    setTasks(next.sort((a, b) => a.order - b.order));
    start(async () => {
      const r = await moveTask({ id, status: col, index: idx });
      if (r.ok) {
        if (prevStatus !== col) toast.success(`ย้ายไป “${STATUS_LABEL[col]}” แล้ว`);
        router.refresh();
      } else {
        toast.error(r.error);
        setTasks(initial);
      }
    });
  };

  const sorted = React.useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let v = 0;
      if (sort.key === "dueDate") v = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
      else if (sort.key === "priority") v = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      else if (sort.key === "title") v = a.title.localeCompare(b.title, "th");
      else if (sort.key === "assignee") v = (a.assignee?.name ?? "￿").localeCompare(b.assignee?.name ?? "￿", "th");
      else v = TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.order - b.order;
      if (!Number.isFinite(v)) v = 0;
      return v * sort.dir;
    });
    return arr;
  }, [tasks, sort]);
  const toggleSort = (key: typeof sort.key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const changeStatus = (t: TaskItem, status: TaskStatus) => {
    if (t.status === status) return;
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
    start(async () => {
      const r = await moveTask({ id: t.id, status });
      if (r.ok) router.refresh();
      else { toast.error(r.error); setTasks(initial); }
    });
  };

  if (view === "list") {
    const rows = hideDone ? sorted.filter((t) => t.status !== "DONE") : sorted;
    return (
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
          <span>{rows.length} งาน</span>
          <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-primary" /> ซ่อนงานที่เสร็จแล้ว</label>
        </div>
        {rows.length === 0 ? <EmptyState title="ไม่มีงานที่ตรงกับตัวกรอง" className="m-3" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                {([["title", "งาน"], ["status", "สถานะ"], ["priority", "ความสำคัญ"], ["dueDate", "กำหนดส่ง"], ["assignee", "ผู้รับผิดชอบ"]] as const).map(([k, label]) => (
                  <TableHead key={k}><button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">{label} <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                ))}
                <TableHead>Milestone</TableHead>
                <TableHead className="text-right">ชม.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const due = dueLabel(t.dueDate, t.status);
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => openEdit(t)}>
                    <TableCell className="max-w-[380px]">
                      <div className="flex items-center gap-2"><TypeBadge type={t.type} /><p className={cn("truncate font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</p></div>
                      {t.tags.length ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.tags.map((x) => `#${x}`).join(" ")}</p> : null}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={t.status} onChange={(e) => changeStatus(t, e.target.value as TaskStatus)} className="h-7 w-28 py-0 text-xs">
                        {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </Select>
                    </TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell className={cn("text-xs tabular", due.tone === "danger" ? "font-medium text-danger" : due.tone === "warning" ? "font-medium text-warning-foreground dark:text-warning" : "text-muted-foreground")}>
                      {t.dueDate ? format(new Date(t.dueDate), "d MMM yy", { locale: th }) : "—"}{t.status !== "DONE" && t.dueDate && due.tone !== "normal" ? ` · ${due.text}` : ""}
                    </TableCell>
                    <TableCell><MemberPill name={t.assignee?.name} color={t.assignee?.color} /></TableCell>
                    <TableCell>{t.milestone ? <MilestoneChip name={t.milestone.name} color={t.milestone.color} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right text-xs tabular text-muted-foreground">{t.estimateHours ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {TASK_STATUSES.map((col) => {
        const items = byCol.get(col)!;
        const isOver = over?.col === col;
        return (
          <div
            key={col}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!over || over.col !== col) setOver({ col, index: items.length }); }}
            onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver((o) => (o?.col === col ? null : o)); }}
            onDrop={(e) => { e.preventDefault(); drop(col, over?.col === col ? over.index : items.length); }}
            className={cn("flex w-[272px] shrink-0 flex-col rounded-lg border bg-muted/30 p-2 transition-colors md:w-[calc((100%-3rem)/5)] md:min-w-[232px]", isOver && "border-primary bg-primary/5")}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={col} />
                <span className="hidden text-[11px] text-muted-foreground xl:inline">{STATUS_HINT[col]}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs tabular text-muted-foreground">{items.length}</span>
                <button onClick={() => openNew({ status: col })} className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="เพิ่มงานในคอลัมน์นี้"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="flex min-h-[120px] flex-1 flex-col gap-2">
              {items.map((t, i) => (
                <React.Fragment key={t.id}>
                  {isOver && over!.index === i && dragId !== t.id ? <div className="h-1 rounded bg-primary/60" /> : null}
                  <div
                    draggable
                    onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); }}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const before = e.clientY < rect.top + rect.height / 2;
                      const idx = before ? i : i + 1;
                      if (!over || over.col !== col || over.index !== idx) setOver({ col, index: idx });
                    }}
                    ref={t.id === focusId ? (el) => { focusRef.current = el; } : undefined}
                  >
                    <TaskCard task={t} draggable dragging={dragId === t.id} focused={t.id === focusId} onClick={() => openEdit(t)} />
                  </div>
                </React.Fragment>
              ))}
              {isOver && over!.index >= items.length ? <div className="h-1 rounded bg-primary/60" /> : null}
              {items.length === 0 && !isOver ? <p className="rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">ลากการ์ดมาวางที่นี่</p> : null}
              <QuickAdd status={col} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuickAdd({ status }: { status: TaskStatus }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, start] = useTransition();
  const submit = () => {
    const t = title.trim();
    if (!t) return setOpen(false);
    start(async () => {
      const r = await quickCreateTask({ title: t, status });
      if (r.ok) {
        setTitle("");
        toast.success("เพิ่มงานแล้ว");
        router.refresh();
      } else toast.error(r.error);
    });
  };
  if (!open) return <Button variant="ghost" size="sm" className="mt-auto justify-start text-muted-foreground" onClick={() => setOpen(true)}><Plus /> เพิ่มงานเร็ว</Button>;
  return (
    <div className="mt-auto rounded-md border bg-card p-2 shadow-sm">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") { setOpen(false); setTitle(""); } }}
        placeholder="ชื่องาน แล้ว Enter"
        rows={2}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-1 flex gap-1">
        <Button size="sm" onClick={submit} loading={pending} disabled={!title.trim()}>เพิ่ม</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setTitle(""); }}>ยกเลิก</Button>
      </div>
    </div>
  );
}

export { isOverdue };
