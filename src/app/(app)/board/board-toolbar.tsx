"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KanbanSquare, List, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PRIORITIES, PRIORITY_LABEL, TASK_TYPES, TYPE_LABEL } from "@/lib/constants";
import type { TaskOptions } from "@/server/queries/tasks";

export function BoardToolbar({ options, meId, view, total }: { options: TaskOptions; meId: string | null; view: "kanban" | "list"; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");

  const set = React.useCallback(
    (params: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(params)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp],
  );

  // debounce search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) set({ q });
    }, 250);
    return () => clearTimeout(t);
  }, [q, set, sp]);

  const sel = "h-8 w-auto min-w-[120px] py-0 text-xs";
  const hasFilter = ["q", "assignee", "milestone", "type", "priority"].some((k) => sp.get(k));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหางาน / แท็ก…" className="h-8 w-52 pl-8 text-xs" />
      </div>
      <Select value={sp.get("assignee") ?? ""} onChange={(e) => set({ assignee: e.target.value })} className={sel}>
        <option value="">ทุกคน</option>
        {meId ? <option value="me">งานของฉัน</option> : null}
        <option value="none">ยังไม่มอบหมาย</option>
        {options.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </Select>
      <Select value={sp.get("milestone") ?? ""} onChange={(e) => set({ milestone: e.target.value })} className={sel}>
        <option value="">ทุก milestone</option>
        <option value="none">ไม่มี milestone</option>
        {options.milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </Select>
      <Select value={sp.get("type") ?? ""} onChange={(e) => set({ type: e.target.value })} className={sel}>
        <option value="">ทุกประเภท</option>
        {TASK_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
      </Select>
      <Select value={sp.get("priority") ?? ""} onChange={(e) => set({ priority: e.target.value })} className={sel}>
        <option value="">ทุกความสำคัญ</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </Select>
      {hasFilter ? (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: null, assignee: null, milestone: null, type: null, priority: null }); }}><X /> ล้างตัวกรอง</Button>
      ) : null}
      <span className="text-xs tabular text-muted-foreground">{total} งาน</span>
      <div className="ml-auto inline-flex rounded-md border bg-background p-0.5">
        {([["kanban", KanbanSquare, "บอร์ด"], ["list", List, "รายการ"]] as const).map(([v, Icon, label]) => (
          <button key={v} onClick={() => set({ view: v === "kanban" ? null : v })} className={cn("inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
