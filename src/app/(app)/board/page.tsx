import type { Metadata } from "next";
import type { Priority, TaskType } from "@prisma/client";
import { PageHeader } from "@/components/shared/page";
import { currentMember } from "@/lib/member";
import { listTasks, taskOptions } from "@/server/queries/tasks";
import { BoardView } from "./board-view";
import { BoardToolbar } from "./board-toolbar";

export const metadata: Metadata = { title: "บอร์ดงาน" };
export const dynamic = "force-dynamic";

export default async function BoardPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams;
  const me = await currentMember();
  const assignee = sp.assignee === "me" ? (me?.id ?? "none") : sp.assignee;
  const [tasks, options] = await Promise.all([
    listTasks({ q: sp.q, assignee, milestone: sp.milestone, type: sp.type as TaskType | undefined, priority: sp.priority as Priority | undefined }),
    taskOptions(),
  ]);
  const view = sp.view === "list" ? "list" : "kanban";
  return (
    <div>
      <PageHeader title="บอร์ดงาน" description="ลากการ์ดเพื่อเปลี่ยนสถานะ · คลิกการ์ดเพื่อแก้ไข · กด N เพื่อสร้างงานใหม่" />
      <BoardToolbar options={options} meId={me?.id ?? null} view={view} total={tasks.length} />
      <BoardView tasks={tasks} view={view} focusId={sp.task} />
    </div>
  );
}
