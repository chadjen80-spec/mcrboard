import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page";
import { listMilestones } from "@/server/queries/overview";
import { listTasks } from "@/server/queries/tasks";
import { MilestonesView } from "./milestones-view";

export const metadata: Metadata = { title: "Milestones" };
export const dynamic = "force-dynamic";

export default async function MilestonesPage() {
  const [milestones, tasks] = await Promise.all([listMilestones(), listTasks()]);
  return (
    <div>
      <PageHeader title="Milestones / Phases" description="แบ่งงานเป็นช่วง (M1, M2, …) ติดตามความคืบหน้าและกำหนดส่งของแต่ละช่วง" />
      <MilestonesView milestones={milestones} tasks={tasks} />
    </div>
  );
}
