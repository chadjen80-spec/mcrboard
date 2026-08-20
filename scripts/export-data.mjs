/* eslint-disable no-console */
// Export ALL rows to prisma/backup-data.json (run while provider is still sqlite,
// BEFORE `prisma generate` for postgres). Import later with scripts/import-data.mjs.
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const db = new PrismaClient();
const out = {};
for (const t of ["member", "milestone", "task", "comment", "event", "activity"]) {
  out[t] = await db[t].findMany();
  console.log(`${t}: ${out[t].length} rows`);
}
writeFileSync(new URL("../prisma/backup-data.json", import.meta.url), JSON.stringify(out, null, 1), "utf-8");
console.log("→ prisma/backup-data.json written");
await db.$disconnect();
