import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "../components/TopNav";
import { Toaster } from "sonner";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "朝暮记",
  description: "朝暮记，记录美好生活",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Analytics />
        <Tooltip.Provider delayDuration={200}>
          {/* 全局顶部导航（右上角登录/退出），页面主体使用 children */}
          <header className="sticky top-0 z-50 w-full border-b border-subtle bg-background">
            <div className="mx-auto max-w-7xl px-4 py-3">
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
