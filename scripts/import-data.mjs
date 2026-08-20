/* eslint-disable no-console */
// Import prisma/backup-data.json into the CURRENT DATABASE_URL (Neon Postgres).
// Run AFTER: provider=postgresql + `npx prisma db push`.
// Refuses to run if the target DB already has members (avoids double-import).
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();
const data = JSON.parse(readFileSync(new URL("../prisma/backup-data.json", import.meta.url), "utf-8"));

const existing = await db.member.count();
if (existing > 0) {
  console.error(`target DB already has ${existing} members — refusing to import. (empty the DB first if you really mean to re-import)`);
  process.exit(1);
}

// FK order: members & milestones → tasks & events → comments & activity
for (const t of ["member", "milestone", "task", "event", "comment", "activity"]) {
  const rows = data[t] ?? [];
  if (rows.length) await db[t].createMany({ data: rows });
  console.log(`${t}: ${rows.length} imported`);
}
console.log("✓ done");
await db.$disconnect();
