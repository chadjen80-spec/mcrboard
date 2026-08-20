"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Menu, Moon, Plus, Sun, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/shared/badges";
import { useTaskDialog } from "@/components/tasks/task-dialog-provider";
import { selectMember } from "@/server/actions/members";
import { ROLE_LABEL } from "@/lib/constants";
import type { MemberRole } from "@prisma/client";
import { NAV } from "./nav";

export interface ShellMember {
  id: string;
  name: string;
  color: string;
  role: MemberRole;
}

export function AppShell({ me, members, projectName, children }: { me: ShellMember | null; members: ShellMember[]; projectName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { openNew } = useTaskDialog();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("mswpm:sidebar") === "1");
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      localStorage.setItem("mswpm:sidebar", c ? "0" : "1");
      return !c;
    });

  const pick = async (id: string | null) => {
    const r = await selectMember({ id });
    if (r.ok) {
      toast.success(id ? `สวัสดี ${members.find((m) => m.id === id)?.name ?? ""}` : "ออกจากโหมดสมาชิกแล้ว");
      router.refresh();
    } else toast.error(r.error);
  };

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2 border-b px-3", collapsed && "justify-center")}>
        <Image src="/logo-light.png" alt="MCR" width={32} height={32} priority className="h-8 w-8 shrink-0 object-contain dark:hidden" />
        <Image src="/logo-dark.png" alt="MCR" width={32} height={32} priority className="hidden h-8 w-8 shrink-0 object-contain dark:block" />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">MCR Project Hub</p>
            <p className="truncate text-[11px] text-muted-foreground">{projectName}</p>
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {NAV.map((item, i) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const showSection = item.section && !collapsed;
          return (
            <React.Fragment key={item.href}>
              {showSection ? <p className={cn("px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", i > 0 && "pt-3")}>{item.section}</p> : item.section && i > 0 ? <div className="mx-3 my-2 h-px bg-border" /> : null}
              <Link
                href={item.href}
                onClick={() => setMobileNav(false)}
                className={cn("mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors", active ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground", collapsed && "justify-center px-0")}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {!collapsed && item.hint ? <span className="ml-auto text-[10px] text-muted-foreground/70">{item.hint}</span> : null}
              </Link>
            </React.Fragment>
          );
        })}
      </div>
      {!collapsed ? (
        <div className="mx-3 mb-2 hidden shrink-0 rounded-md border bg-card p-2.5 text-[11px] text-muted-foreground [@media(min-height:640px)]:block">
          <p className="font-medium text-foreground">คีย์ลัด</p>
          <p className="mt-1"><kbd className="rounded border bg-muted px-1 font-mono">N</kbd> สร้างการ์ดงาน</p>
          <p><kbd className="rounded border bg-muted px-1 font-mono">Ctrl+↵</kbd> บันทึกในฟอร์ม</p>
        </div>
      ) : null}
      <div className={cn("border-t p-2", collapsed && "flex justify-center")}>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
          {!collapsed ? "ย่อเมนู" : null}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn("hidden shrink-0 border-r bg-sidebar transition-[width] md:block", collapsed ? "w-14" : "w-56")}>{sidebar}</aside>
      {mobileNav ? (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar shadow-xl" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-4">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileNav(true)} aria-label="Menu"><Menu /></Button>
          <Button size="sm" onClick={() => openNew()}><Plus /> สร้างการ์ดงาน <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] opacity-70 sm:inline">N</kbd></Button>
          <div className="ml-auto flex items-center gap-1">
            <Hint label="สลับธีม">
              <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                <Sun className="hidden dark:block" />
                <Moon className="dark:hidden" />
              </Button>
            </Hint>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("ml-1 flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent", !me && "border-dashed text-muted-foreground")}>
                  {me ? <MemberAvatar name={me.name} color={me.color} size="sm" /> : <UserRound className="h-4 w-4" />}
                  <span className="hidden sm:inline">{me ? me.name : "คุณคือใคร?"}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground">เลือกชื่อตัวเอง — ใช้ระบุว่าใครสร้าง/ย้าย/คอมเมนต์งาน</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {members.map((m) => (
                  <DropdownMenuItem key={m.id} onSelect={() => pick(m.id)}>
                    <MemberAvatar name={m.name} color={m.color} size="xs" />
                    <span className="flex-1">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</span>
                    {me?.id === m.id ? <Check className="h-3.5 w-3.5" /> : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/team")}>จัดการสมาชิกทีม…</DropdownMenuItem>
                {me ? <DropdownMenuItem onSelect={() => pick(null)}>ไม่ระบุตัวตน</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
