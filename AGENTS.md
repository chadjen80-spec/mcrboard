<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MSW Project Hub — project notes for agents

- This is a plain **Next.js 16 web app** (team project-management tool for the MapleStory Worlds game project). It is NOT an MSW game workspace: no mLua / UI-file / map-file authoring happens here, so do not load MSW skills for it.
- Style + conventions mirror `C:\MCR\marketing-os` (see its `docs/CONVENTIONS.md`). Read `README.md` here for the page map and folder layout.
- Dev: `npm run dev` -> http://localhost:3100 - `npm run db:push` - `npm run db:seed` (seed wipes all rows).
- Server actions: no auth layer; pattern is `safeAction(async () => { zod.parse -> prisma -> logActivity -> revalidatePath })`.
- Identity = cookie `mswpm_member` (see `src/lib/member.ts`); `currentMember()` may be null - always handle that.
- Labels/colours live in `src/lib/constants.ts`; UI text is Thai-first.
