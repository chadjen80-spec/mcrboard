/* eslint-disable no-console */
import { PrismaClient, type MemberRole, type Priority, type TaskStatus, type TaskType } from "@prisma/client";
import { addDays, setHours, setMinutes, startOfDay, subDays } from "date-fns";

const db = new PrismaClient();
const J = (v: unknown) => JSON.stringify(v);

async function main() {
  const today = startOfDay(new Date());
  const at = (dayOffset: number, h = 10, m = 0) => setMinutes(setHours(addDays(today, dayOffset), h), m);

  console.log("→ resetting database");
  for (const t of ["activity", "comment", "task", "event", "milestone", "member"] as const) {
    // @ts-expect-error dynamic delegate
    await db[t].deleteMany();
  }

  // ── Members ─────────────────────────────────────────────
  const memberSeed: { name: string; role: MemberRole; color: string }[] = [
    { name: "Nok", role: "LEAD", color: "#6366f1" },
    { name: "Ploy", role: "PLANNER", color: "#ec4899" },
    { name: "Bank", role: "SCRIPTER", color: "#3b82f6" },
    { name: "Mint", role: "ARTIST", color: "#f59e0b" },
    { name: "Tae", role: "UI", color: "#10b981" },
    { name: "Fah", role: "QA", color: "#ef4444" },
  ];
  const members = [];
  for (const m of memberSeed) members.push(await db.member.create({ data: m }));
  const [nok, ploy, bank, mint, tae, fah] = members;

  // ── Milestones (Floating Market roadmap) ───────────────
  const m5 = await db.milestone.create({ data: { name: "M5 · Live Release", description: "Build ที่ปล่อยจริงบน MSW", status: "DONE", color: "#10b981", order: 5, startDate: subDays(today, 40), endDate: subDays(today, 12) } });
  const m6 = await db.milestone.create({ data: { name: "M6 · Polish & Balance", description: "ปรับ balance / เก็บ bug หลัง release", status: "DONE", color: "#14b8a6", order: 6, startDate: subDays(today, 12), endDate: subDays(today, 2) } });
  const m7 = await db.milestone.create({ data: { name: "M7 · Duel Room", description: "ห้องดวลแบบ synchronized seeded race (2 ผู้เล่น)", status: "ACTIVE", color: "#6366f1", order: 7, startDate: subDays(today, 2), endDate: addDays(today, 19) } });
  const m8 = await db.milestone.create({ data: { name: "M8 · Season Event", description: "อีเวนต์ตามฤดูกาล + ranking reward", status: "PLANNED", color: "#f59e0b", order: 8, startDate: addDays(today, 20), endDate: addDays(today, 45) } });

  // ── Tasks ───────────────────────────────────────────────
  type T = { title: string; type: TaskType; status: TaskStatus; priority: Priority; assignee?: string; milestone?: string; due?: number; start?: number; est?: number; tags?: string[]; desc?: string; files?: string[]; checklist?: { text: string; done: boolean }[] };
  const taskSeed: T[] = [
    // M6 done
    { title: "แก้ bug Check In ลบ nested scripts", type: "SCRIPT", status: "DONE", priority: "URGENT", assignee: bank.id, milestone: m6.id, due: -6, est: 4, tags: ["maker", "hotfix"], files: ["RootDesk/MyDesk/SpawnHelperLogic.mlua"] },
    { title: "ปรับ pivot_y sprite ตัวละคร UGC ไม่ให้จมพื้น", type: "ART", status: "DONE", priority: "HIGH", assignee: mint.id, milestone: m6.id, due: -5, est: 2, tags: ["sprite"] },
    { title: "Balance ราคาสินค้าตลาดน้ำรอบ 2", type: "DESIGN", status: "DONE", priority: "MEDIUM", assignee: ploy.id, milestone: m6.id, due: -3, est: 3 },
    // M7 active
    { title: "DuelRoomLogic: สร้างห้อง + seed sync ระหว่าง 2 client", type: "SCRIPT", status: "DOING", priority: "URGENT", assignee: bank.id, milestone: m7.id, start: -2, due: 4, est: 12, tags: ["multiplayer", "sync"], desc: "ใช้ @Sync seed จาก server → client ทั้งสองฝั่งต้องได้ลำดับสินค้าเหมือนกัน\nตรวจ ExecSpace ให้ครบ", files: ["RootDesk/MyDesk/DuelRoomLogic.mlua", "RootDesk/MyDesk/DataStorageLogic.mlua"], checklist: [{ text: "สร้าง Room และ join 2 ผู้เล่น", done: true }, { text: "Sync seed ไป client", done: true }, { text: "นับถอยหลังเริ่มพร้อมกัน", done: false }, { text: "ทดสอบ 2 client จริง", done: false }] },
    { title: "UI หน้าห้องดวล: รายชื่อ 2 ฝั่ง + countdown + ปุ่ม Ready", type: "UI", status: "DOING", priority: "HIGH", assignee: tae.id, milestone: m7.id, start: -1, due: 5, est: 8, tags: ["hud"], files: ["ui/DuelRoom.ui"], checklist: [{ text: "Layout popup", done: true }, { text: "bind ปุ่ม Ready → DuelRoomLogic", done: false }] },
    { title: "Sprite เอฟเฟกต์ชนะ/แพ้ท้ายเกมดวล", type: "ART", status: "TODO", priority: "MEDIUM", assignee: mint.id, milestone: m7.id, due: 7, est: 5, tags: ["vfx"] },
    { title: "ออกแบบ reward table ของโหมดดวล", type: "DESIGN", status: "REVIEW", priority: "HIGH", assignee: ploy.id, milestone: m7.id, due: 2, est: 3, desc: "ดราฟต์อยู่ใน Docs/M7-Duel-Rewards.md รอ Nok รีวิว" },
    { title: "Playtest 2-client Duel Room รอบแรก", type: "QA", status: "TODO", priority: "HIGH", assignee: fah.id, milestone: m7.id, due: 6, est: 2, tags: ["playtest"] },
    { title: "Map ห้องดวล: วาง spawn point 2 จุด + กล้อง", type: "MAP", status: "TODO", priority: "MEDIUM", assignee: bank.id, milestone: m7.id, due: 8, est: 4, files: ["map/DuelRoom.map"] },
    { title: "SFX นับถอยหลัง + เสียงชนะ", type: "SOUND", status: "BACKLOG", priority: "LOW", milestone: m7.id, due: 12, est: 2 },
    { title: "Leaderboard โหมดดวล (ใช้ ranking package)", type: "SCRIPT", status: "BACKLOG", priority: "MEDIUM", assignee: bank.id, milestone: m7.id, due: 16, est: 6, tags: ["msw-packages"] },
    { title: "เขียน release note M7 + ภาพโปรโมท", type: "DOCS", status: "BACKLOG", priority: "LOW", assignee: nok.id, milestone: m7.id, due: 18, est: 2 },
    // M8 planned
    { title: "GDD อีเวนต์ฤดูกาล (Season Event)", type: "DESIGN", status: "BACKLOG", priority: "MEDIUM", assignee: ploy.id, milestone: m8.id, due: 24, est: 8 },
    { title: "Concept art ธีมฤดูกาล", type: "ART", status: "BACKLOG", priority: "LOW", assignee: mint.id, milestone: m8.id, due: 28, est: 6 },
    // No milestone / misc
    { title: "เปิด bug: ปุ่ม Buy ค้างเมื่อกดรัว", type: "QA", status: "TODO", priority: "HIGH", assignee: fah.id, due: 1, est: 1, tags: ["bug"], desc: "เกิดบน mobile เมื่อกดปุ่มซื้อเร็ว ๆ 3 ครั้ง" },
    { title: "สำรอง RootDesk ก่อน Check In ทุกครั้ง (ทำเป็น checklist ทีม)", type: "DOCS", status: "DONE", priority: "MEDIUM", assignee: nok.id, due: -1, est: 1 },
    { title: "อัปเดต Docs/ROADMAP หลังจบ M6", type: "DOCS", status: "TODO", priority: "LOW", assignee: nok.id, due: 0, est: 1 },
  ];

  let order = 0;
  for (const t of taskSeed) {
    const done = t.status === "DONE";
    await db.task.create({
      data: {
        title: t.title,
        description: t.desc ?? null,
        type: t.type,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assignee ?? null,
        creatorId: nok.id,
        milestoneId: t.milestone ?? null,
        startDate: t.start !== undefined ? at(t.start, 9) : null,
        dueDate: t.due !== undefined ? at(t.due, 18) : null,
        estimateHours: t.est ?? null,
        tagsJson: J(t.tags ?? []),
        checklistJson: J((t.checklist ?? []).map((c, i) => ({ id: `c${i}`, ...c }))),
        filesJson: J(t.files ?? []),
        order: order++,
        completedAt: done ? at(t.due ?? -1, 17) : null,
        createdAt: subDays(today, 10),
      },
    });
  }

  // ── Comments ────────────────────────────────────────────
  const duel = await db.task.findFirst({ where: { title: { startsWith: "DuelRoomLogic" } } });
  if (duel) {
    await db.comment.create({ data: { taskId: duel.id, authorId: nok.id, body: "อย่าลืมว่า OnMapEnter ไม่ fire บน @Logic — ใช้ component บน map entity แทนนะ", createdAt: subDays(today, 1) } });
    await db.comment.create({ data: { taskId: duel.id, authorId: bank.id, body: "รับทราบ ย้าย countdown ไปไว้ใน DuelRoomComponent แล้ว เหลือทดสอบ 2 client", createdAt: today } });
  }

  // ── Events ──────────────────────────────────────────────
  await db.event.createMany({
    data: [
      { title: "Stand-up ทีม", kind: "MEETING", startAt: at(0, 10), endAt: at(0, 10, 30), milestoneId: m7.id },
      { title: "รีวิว reward table M7", kind: "MEETING", startAt: at(2, 14), endAt: at(2, 15), milestoneId: m7.id },
      { title: "Playtest Duel Room (2 client)", kind: "PLAYTEST", startAt: at(6, 19), endAt: at(6, 21), milestoneId: m7.id, description: "ต้องการ 2 เครื่อง / 2 account" },
      { title: "Code freeze M7", kind: "DEADLINE", startAt: at(17, 0), allDay: true, milestoneId: m7.id },
      { title: "Release M7 · Duel Room", kind: "RELEASE", startAt: at(19, 0), allDay: true, milestoneId: m7.id },
      { title: "Kick-off M8 Season Event", kind: "MEETING", startAt: at(20, 13), endAt: at(20, 14), milestoneId: m8.id },
    ],
  });

  // ── Activity ────────────────────────────────────────────
  await db.activity.createMany({
    data: [
      { actorId: nok.id, action: "milestone.update", entityType: "milestone", entityId: m6.id, summary: "ปิด milestone M6 · Polish & Balance", createdAt: subDays(today, 2) },
      { actorId: bank.id, action: "task.move", entityType: "task", entityId: duel?.id ?? "", summary: "ย้าย “DuelRoomLogic: สร้างห้อง + seed sync” → กำลังทำ", createdAt: subDays(today, 1) },
      { actorId: ploy.id, action: "task.move", entityType: "task", entityId: "", summary: "ย้าย “ออกแบบ reward table ของโหมดดวล” → รอรีวิว", createdAt: today },
    ],
  });

  console.log(`✓ seeded ${members.length} members, 4 milestones, ${taskSeed.length} tasks, 6 events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
