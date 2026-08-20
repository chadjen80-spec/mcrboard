import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page";
import { currentMember } from "@/lib/member";
import { listMembers } from "@/server/queries/overview";
import { listTasks } from "@/server/queries/tasks";
import { TeamView } from "./team-view";

export const metadata: Metadata = { title: "ทีม" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, tasks, me] = await Promise.all([listMembers(), listTasks({ hideDone: true }), currentMember()]);
  return (
    <div>
      <PageHeader title="ทีมงาน" description="สมาชิกทีม, บทบาท และภาระงานของแต่ละคน · เพิ่มชื่อทุกคนที่นี่แล้วให้แต่ละคนเลือกชื่อตัวเองที่มุมขวาบน" />
      <TeamView members={members} tasks={tasks} meId={me?.id ?? null} />
    </div>
  );
}
