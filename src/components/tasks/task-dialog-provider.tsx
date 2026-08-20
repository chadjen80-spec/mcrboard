"use client";

import * as React from "react";
import type { TaskItem, TaskOptions } from "@/server/queries/tasks";
import { TaskDialog, type TaskDefaults } from "./task-dialog";

interface Ctx {
  options: TaskOptions;
  meId: string | null;
  openNew: (defaults?: TaskDefaults) => void;
  openEdit: (task: TaskItem) => void;
}
const TaskDialogContext = React.createContext<Ctx | null>(null);

export function useTaskDialog() {
  const ctx = React.useContext(TaskDialogContext);
  if (!ctx) throw new Error("useTaskDialog must be used inside TaskDialogProvider");
  return ctx;
}

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
};

export function TaskDialogProvider({ options, meId, children }: { options: TaskOptions; meId: string | null; children: React.ReactNode }) {
  const [state, setState] = React.useState<{ key: number; task: TaskItem | null; defaults?: TaskDefaults; open: boolean }>({ key: 0, task: null, open: false });

  const openNew = React.useCallback((defaults?: TaskDefaults) => setState((s) => ({ key: s.key + 1, task: null, defaults, open: true })), []);
  const openEdit = React.useCallback((task: TaskItem) => setState((s) => ({ key: s.key + 1, task, open: true })), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && !state.open) {
        e.preventDefault();
        openNew();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, state.open]);

  const value = React.useMemo<Ctx>(() => ({ options, meId, openNew, openEdit }), [options, meId, openNew, openEdit]);

  return (
    <TaskDialogContext.Provider value={value}>
      {children}
      {state.open ? <TaskDialog key={state.key} options={options} meId={meId} task={state.task} defaults={state.defaults} open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))} /> : null}
    </TaskDialogContext.Provider>
  );
}
