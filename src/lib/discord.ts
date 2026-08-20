import "server-only";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { Priority, TaskType } from "@prisma/client";
import { PRIORITY_LABEL, TYPE_COLOR, TYPE_LABEL } from "./constants";

// Discord notifications are best-effort: never throw into the calling action,
// and become a no-op when DISCORD_WEBHOOK_URL is not configured.

const PRIORITY_EMOJI: Record<Priority, string> = { LOW: "🟢", MEDIUM: "🔵", HIGH: "🟠", URGENT: "🔴" };

export interface AssignmentNotice {
  taskId: string;
  title: string;
  type: TaskType;
  priority: Priority;
  dueDate: Date | null;
  milestoneName?: string | null;
  assignee: { name: string; discordId?: string | null };
  assigner?: string | null; // who assigned it (current member name)
  reassigned?: boolean;
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

export async function notifyAssignment(n: AssignmentNotice): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  const mention = n.assignee.discordId ? `<@${n.assignee.discordId}>` : `**${n.assignee.name}**`;
  const colorHex = TYPE_COLOR[n.type] ?? "#6366f1";
  const fields = [
    { name: "ประเภท", value: TYPE_LABEL[n.type], inline: true },
    { name: "ความสำคัญ", value: `${PRIORITY_EMOJI[n.priority]} ${PRIORITY_LABEL[n.priority]}`, inline: true },
    { name: "กำหนดส่ง", value: n.dueDate ? format(n.dueDate, "EEE d MMM yyyy", { locale: th }) : "ไม่ระบุ", inline: true },
  ];
  if (n.milestoneName) fields.push({ name: "Milestone", value: n.milestoneName, inline: true });

  const payload = {
    // content is the only part that actually pings the user
    content: `📌 ${mention} ${n.reassigned ? "ได้รับมอบหมายงาน (ย้ายมาให้)" : "ได้รับมอบหมายงานใหม่"}${n.assigner ? ` จาก **${n.assigner}**` : ""}`,
    embeds: [
      {
        title: n.title.slice(0, 256),
        url: `${appUrl()}/board?task=${n.taskId}`,
        color: parseInt(colorHex.replace("#", ""), 16),
        fields,
        footer: { text: "MSW Project Hub" },
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: ["users"] },
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[discord] webhook responded", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[discord] notify failed", e);
  }
}
