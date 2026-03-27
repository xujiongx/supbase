import type { Metadata, Viewport } from "next";
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

/** 输入法弹出时收缩可视区域，避免键盘盖住底部弹窗里的输入区 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-dvh max-h-dvh flex-col overflow-hidden antialiased`}
      >
        <Analytics />
        <Tooltip.Provider delayDuration={200}>
          {/* 全局顶部导航（右上角登录/退出），页面主体使用 children */}
          <header className="sticky top-0 z-50 w-full border-b border-subtle bg-background/85 backdrop-blur-md backdrop-saturate-150 transition-[background] duration-200">
            <div className="mx-auto max-w-screen-2xl px-3 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:py-3 sm:pt-3">
              <TopNav />
            </div>
          </header>
          <main className="mx-auto min-h-0 w-full max-w-screen-2xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-8 sm:px-6 md:py-10">
            {children}
          </main>
          <Toaster richColors={false} position="top-right" closeButton offset={16} />
        </Tooltip.Provider>
      </body>
    </html>
  );
}
