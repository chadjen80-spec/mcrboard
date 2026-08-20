import { db } from "@/lib/db";
import { currentMember } from "@/lib/member";
import { taskOptions } from "@/server/queries/tasks";
import { AppShell } from "@/components/layout/app-shell";
import { TaskDialogProvider } from "@/components/tasks/task-dialog-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, members, options] = await Promise.all([
    currentMember(),
    db.member.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, role: true } }),
    taskOptions(),
  ]);
  const projectName = process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Floating Market · MSW";
  return (
    <TaskDialogProvider options={options} meId={me?.id ?? null}>
      <AppShell me={me ? { id: me.id, name: me.name, color: me.color, role: me.role } : null} members={members} projectName={projectName}>
        {children}
      </AppShell>
    </TaskDialogProvider>
  );
}
