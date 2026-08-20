import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/misc";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MCR Project Hub", template: "%s · MCR Project Hub" },
  description: "บอร์ดมอบหมายงาน + ปฏิทิน/ไทม์ไลน์ สำหรับทีมพัฒนาเกม MapleStory Worlds",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="bottom-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
