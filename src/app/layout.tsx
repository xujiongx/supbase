import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "../components/TopNav";
import { Toaster } from "sonner";
import * as Tooltip from "@radix-ui/react-tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todos App",
  description: "Next.js + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Tooltip.Provider delayDuration={200}>
          {/* 全局顶部导航（右上角登录/退出），页面主体使用 children */}
          <header className="card fixed top-0 z-50 w-full bg-background">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <TopNav />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <Toaster richColors position="top-right" />
        </Tooltip.Provider>
      </body>
    </html>
  );
}
