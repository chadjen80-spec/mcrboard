# MSW Project Hub

เว็บจัดการโปรเจคสำหรับทีมพัฒนาเกม **MapleStory Worlds** — การ์ดมอบหมายงาน (Kanban) + ปฏิทิน/ไทม์ไลน์ทีม
ออกแบบให้ **เร็วและใช้ง่าย**: ไม่มีรหัสผ่าน (เลือกชื่อตัวเองแล้วใช้ได้เลย), กด `N` สร้างการ์ดได้ทุกหน้า, ลาก-วางเพื่อเปลี่ยนสถานะ/เลื่อนวัน

สไตล์และโครงสร้างโค้ดอิงจาก `C:\MCR\marketing-os` (Next.js 16 App Router · React 19 · Tailwind v4 · Prisma 6 / SQLite · zod · lucide · sonner)

## เริ่มใช้งาน

```bash
npm install
npm run db:push      # สร้าง prisma/dev.db
npm run db:seed      # ข้อมูลตัวอย่าง (ทีม 6 คน, milestone M5–M8, งาน 17 ใบ, กิจกรรม 6 รายการ)
npm run dev          # http://localhost:3100
```

เปิดเว็บ → มุมขวาบน **“คุณคือใคร?”** → เลือกชื่อตัวเอง (เพิ่ม/แก้สมาชิกได้ที่หน้า **ทีม**)

## หน้าต่าง ๆ

| หน้า | ใช้ทำอะไร |
|---|---|
| **ภาพรวม** `/dashboard` | KPI งานค้าง/เลยกำหนด/ครบกำหนดใน 7 วัน, งานของฉัน, milestone ที่ active, กิจกรรม 14 วัน, ภาระงานทีม, ความเคลื่อนไหวล่าสุด |
| **บอร์ดงาน** `/board` | Kanban 5 คอลัมน์ (Backlog / รอทำ / กำลังทำ / รอรีวิว / เสร็จแล้ว) ลาก-วางเรียงลำดับได้, quick-add ท้ายคอลัมน์, โหมดรายการ (ตาราง+เรียง), ตัวกรอง: ค้นหา / ผู้รับผิดชอบ / milestone / ประเภท / ความสำคัญ |
| **ปฏิทิน** `/calendar` | มุมมองเดือน/สัปดาห์ แสดงกำหนดส่งงาน (สีตามประเภท) + กิจกรรมทีม (ประชุม / Playtest / Release / Deadline) · ลากการ์ด/กิจกรรมเพื่อเลื่อนวัน · กด + ในช่องวันเพื่อเพิ่ม |
| **ไทม์ไลน์** `/timeline` | Gantt แบบง่าย จัดกลุ่มตาม milestone: แถบ milestone (พร้อม % เสร็จ), แถบงาน (วันเริ่ม–กำหนดส่ง) หรือจุด (มีแค่กำหนดส่ง), ธง release/deadline, เส้นวันนี้ · ลากแถบซ้าย-ขวาเพื่อเลื่อนทั้งงาน |
| **Milestones** `/milestones` | สร้าง/แก้ M1, M2, … พร้อมช่วงวัน สี สถานะ; ดูความคืบหน้า, ชม.ที่เหลือ, งานเลยกำหนด; กางดูงานในแต่ละช่วง |
| **ทีม** `/team` | สมาชิก + บทบาท (Lead / Game Designer / Scripter / Artist / UI / Level / Sound / QA), ภาระงานรายคน, มอบหมายงานตรงจากการ์ดสมาชิก |

### การ์ดงาน (Task) มีอะไรบ้าง
ชื่อ · รายละเอียด · **ประเภทงานแบบ MSW** (Script .mlua / Model / UI .ui / Map .map / Art / Sound / Game Design / QA / Docs) · สถานะ · ความสำคัญ · ผู้รับผิดชอบ · milestone · วันเริ่ม / กำหนดส่ง · ประมาณเวลา (ชม.) · แท็ก · **checklist** · **ไฟล์ใน workspace** (เช่น `RootDesk/MyDesk/DuelRoomLogic.mlua`) · **คอมเมนต์** (ระบุชื่อผู้เขียนจากตัวตนที่เลือก)

### คีย์ลัด
- `N` — สร้างการ์ดงาน (ทุกหน้า)
- `Ctrl+Enter` — บันทึกในฟอร์ม
- `Enter` — ส่งคอมเมนต์ / เพิ่ม checklist / quick-add

## สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` / `build` / `start` | Next.js (พอร์ต 3100) |
| `npm run typecheck` / `lint` | TypeScript + ESLint |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma (seed จะ **ล้างข้อมูลทั้งหมด** แล้วใส่ตัวอย่างใหม่) |

## แจ้งเตือน Discord เมื่อถูกมอบหมายงาน

ตั้งค่าครั้งเดียว:

1. ใน Discord server ของทีม: **Server Settings → Integrations → Webhooks → New Webhook** เลือก channel ที่ต้องการ แล้ว **Copy Webhook URL**
2. ใส่ใน `.env` แล้ว restart dev server:
   ```
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/…"
   APP_URL="http://<ip-เครื่องที่รัน>:3100"   # ใช้สร้างลิงก์เปิดการ์ดในข้อความแจ้งเตือน
   ```
3. (แนะนำ) หน้า **ทีม → แก้ไข** สมาชิกแต่ละคน ใส่ **Discord User ID** เพื่อให้แจ้งเตือนแบบ @mention จริง ๆ (Discord → Settings → Advanced → เปิด Developer Mode → คลิกขวาชื่อตัวเอง → Copy User ID) — ถ้าเว้นว่างจะแสดงเป็นชื่อหนา ๆ แทน

พฤติกรรม: แจ้งเตือนเมื่อ **สร้างการ์ดพร้อมผู้รับผิดชอบ** หรือ **เปลี่ยนผู้รับผิดชอบเป็นคนใหม่** (ระบุว่า "ย้ายมาให้") · ไม่แจ้งเมื่อมอบหมายให้ตัวเอง · ข้อความมีลิงก์เปิดการ์ด, ประเภท, ความสำคัญ, กำหนดส่ง, milestone · ถ้า webhook ล่มหรือไม่ได้ตั้งค่า ระบบทำงานต่อตามปกติ (best-effort)

## Deploy ขึ้น Vercel (สถานะปัจจุบัน: ใช้ Postgres แล้ว)

โปรเจคนี้สลับเป็น `provider = "postgresql"` แล้ว — ทั้ง local dev และ Vercel ใช้ฐานข้อมูล Neon ตัวเดียวกัน

**ครั้งแรก (ทำครั้งเดียว):**

1. สมัคร [Neon](https://neon.tech) (ฟรี) → สร้างโปรเจค → คัดลอก **connection string**
2. วางใน `.env` ที่ `DATABASE_URL=""` แล้วรัน:
   ```bash
   npx prisma db push        # สร้างตาราง
   npm run db:import         # ย้ายข้อมูลเดิมจาก prisma/backup-data.json เข้า Neon
   npm run dev               # ใช้งาน local ต่อได้ตามปกติ (ข้อมูลอยู่บน Neon แล้ว)
   ```
3. Push โค้ดขึ้น GitHub (`.env`, `dev.db`, `backup-data.json` ถูก gitignore — ไม่หลุดขึ้น repo)
4. [Vercel](https://vercel.com) → **Add New Project** → Import repo → ใส่ Environment Variables:
   - `DATABASE_URL` = connection string ของ Neon
   - `DISCORD_WEBHOOK_URL` = webhook ของทีม
   - `APP_URL` = `https://<ชื่อโปรเจค>.vercel.app` (ลิงก์ในแจ้งเตือน Discord)
   - `NEXT_PUBLIC_PROJECT_NAME` = `Floating Market · MSW`
5. Deploy — หลังจากนั้น push GitHub = deploy อัตโนมัติ

ข้อมูลเดิมจาก SQLite ถูกสำรองไว้ที่ `prisma/backup-data.json` (สร้างใหม่ได้ด้วย `npm run db:export` ตอน provider ยังเป็น sqlite) และไฟล์ `prisma/dev.db` เดิมยังอยู่ ไม่ถูกลบ

> ⚠️ เว็บไม่มีระบบล็อกอิน — บน Vercel ใครมี URL ก็เข้าได้ ถ้าต้องการให้เพิ่มรหัสผ่านทีม แจ้งได้

## ใช้งานร่วมกันทั้งทีม (แบบ LAN เดิม)
- รันบนเครื่องเดียวในวง LAN แล้วให้ทุกคนเปิด `http://<ip-เครื่องนั้น>:3100` (Next แสดง Network URL ตอน `npm run dev`)
- ตัวตนเป็นแค่คุกกี้ (ไม่มีรหัสผ่าน) — เหมาะกับทีมภายใน ถ้าต้องการล็อกอินจริงค่อยเพิ่ม layer auth แบบใน marketing-os

## โครงสร้างโค้ด

```
src/app/(app)/<route>/page.tsx      server component อ่านข้อมูล → ส่งให้ client view
src/app/(app)/<route>/*-view.tsx    client component ("use client") ของหน้านั้น
src/components/tasks/               TaskDialog (ฟอร์มการ์ดงาน + checklist + ไฟล์ + คอมเมนต์), TaskDialogProvider (เปิดจากทุกหน้า + hotkey N), TaskCard
src/components/layout/              AppShell (sidebar + topbar + member switcher), nav.ts
src/components/shared/              badges.tsx (Status/Priority/Type/Milestone/Event/MemberAvatar), page.tsx (PageHeader/Stat/EmptyState/Progress)
src/components/ui/                  primitives (copy จาก marketing-os)
src/server/actions/*.ts             "use server" mutations: zod → prisma → activity log → revalidatePath, คืน ActionResult {ok,data}|{ok,error}
src/server/queries/*.ts             read-only data access
src/lib/constants.ts                label/สี ของ status, priority, type, role, event kind (แก้ภาษา/สีที่นี่ที่เดียว)
src/lib/member.ts                   ตัวตนปัจจุบัน (cookie mswpm_member)
prisma/schema.prisma                Member · Milestone · Task · Comment · Event · Activity
```

## เพิ่มฟีเจอร์ (convention เดียวกับ marketing-os)
1. เพิ่ม/แก้ model ใน `prisma/schema.prisma` → `npm run db:push`
2. query ใน `src/server/queries/`, action ใน `src/server/actions/` (ห่อด้วย `safeAction`, เรียก `logActivity`, `revalidatePath`)
3. หน้าใหม่ใน `src/app/(app)/<route>/page.tsx` + เพิ่มเมนูใน `src/components/layout/nav.ts`
4. `npm run typecheck && npm run lint`
