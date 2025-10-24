"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";

export default function TopNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // 初始同步主题：优先 localStorage，其次系统偏好
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const systemPrefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enableDark = stored ? stored === "dark" : systemPrefersDark;
    setIsDark(enableDark);
    const html = document.documentElement;
    html.classList.toggle("dark", enableDark);
    html.setAttribute("data-theme", enableDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase()!;
    client.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      const t = setTimeout(() => setSession(s), 0);
      return () => clearTimeout(t);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => {
      sub.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // 根据输入设备与 UA 进行移动端判断：PC 端不展示汉堡菜单
    try {
      const coarse = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      const isMobileUA = /mobile|android|iphone|ipod|ipad|windows phone|blackberry/.test(ua);
      setIsMobileDevice(coarse || isMobileUA);
    } catch {
      setIsMobileDevice(false);
    }
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    setSigningOut(true);
    try {
      const client = getSupabase()!;
      await client.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const html = document.documentElement;
    html.classList.toggle("dark", next);
    html.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  const label = isDark ? "切换到浅色" : "切换到深色";
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 sm:gap-6">
        {/* 移动端汉堡菜单，仅在小屏显示 */}
        {isMobileDevice && (
          <button
            type="button"
            className="btn btn-ghost btn-sm px-2 py-1 sm:hidden"
            aria-label="打开菜单"
            onClick={() => setMobileOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
        )}
        <Link
          href="/"
          className="text-base sm:text-lg leading-none font-semibold tracking-tight"
        >
          朝暮记
        </Link>
        <nav className="hidden sm:flex items-center gap-4 md:gap-6 text-sm">
          <Link
            href="/todos"
            aria-current={pathname?.startsWith("/todos") ? "page" : undefined}
            className={
              pathname?.startsWith("/todos")
                ? "border-b-2 border-current"
                : "opacity-80 hover:opacity-100 hover:underline"
            }
          >
            每日代办
          </Link>
          <Link
            href="/notes"
            aria-current={pathname?.startsWith("/notes") ? "page" : undefined}
            className={
              pathname?.startsWith("/notes")
                ? "border-b-2 border-current"
                : "opacity-80 hover:opacity-100 hover:underline"
            }
          >
            每日笔记
          </Link>
        </nav>
      </div>

      {/* 移动端右侧：仅在小屏显示已登录用户或登录按钮，靠右 */}
      <div className="flex sm:hidden items-center gap-2 ml-auto">
        {isSupabaseConfigured ? (
          session ? (
            <span className="text-xs rounded-full border px-2 py-1 opacity-70 max-w-[50vw] truncate">
              {session.user.email || session.user.id}
            </span>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              登录
            </Link>
          )
        ) : (
          <span className="text-xs rounded-full border px-2 py-1 opacity-70">
            未配置 Supabase
          </span>
        )}
      </div>

      {/* 右侧控制区：在小屏隐藏，移动端通过抽屉操作 */}
      <div className="hidden sm:flex items-center gap-3">
        {!isSupabaseConfigured ? (
          <span className="text-xs rounded-full border px-2 py-1 opacity-70">
            未配置 Supabase
          </span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-xs rounded-full border px-2 py-1 opacity-70 max-w-[200px] truncate">
              {session.user.email || session.user.id}
            </span>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="btn btn-outline"
            >
              退出登录
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary">
            登录
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="btn btn-outline"
          aria-label={label}
          title={label}
        >
          <span aria-hidden="true">{isDark ? "☀︎" : "☾"}</span>
        </button>
      </div>

      {/* 移动端导航抽屉 */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content
            className="card fixed left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 p-4"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-base font-medium">导航</Dialog.Title>
            <nav className="mt-3 space-y-2">
              <Dialog.Close asChild>
                <Link href="/" className="btn btn-outline w-full">
                  首页
                </Link>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Link href="/todos" className="btn btn-outline w-full">
                  每日待办
                </Link>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Link href="/notes" className="btn btn-outline w-full">
                  每日笔记
                </Link>
              </Dialog.Close>
            </nav>
            <div className="mt-4 space-y-2">
              {isSupabaseConfigured && session ? (
                <Dialog.Close asChild>
                  <button onClick={signOut} className="btn btn-outline w-full">
                    退出登录
                  </button>
                </Dialog.Close>
              ) : (
                <Dialog.Close asChild>
                  <Link href="/login" className="btn btn-primary w-full">
                    登录
                  </Link>
                </Dialog.Close>
              )}
              <Dialog.Close asChild>
                <button
                  onClick={toggleTheme}
                  className="btn btn-outline w-full"
                >
                  切换主题
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-outline text-sm absolute top-2 right-2">
                关闭
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
