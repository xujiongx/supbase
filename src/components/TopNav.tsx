"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // 初始同步主题：优先 localStorage，其次系统偏好
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const systemPrefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enableDark = stored ? stored === "dark" : systemPrefersDark;
    setIsDark(enableDark);
    const html = document.documentElement;
    html.classList.toggle("dark", enableDark); // 兼容 Tailwind 暗色选择器
    html.setAttribute("data-theme", enableDark ? "dark" : "light"); // 覆盖系统偏好
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
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          我的应用
        </Link>
        <nav className="hidden sm:flex items-center gap-2 md:gap-6 text-sm">
          <Link
            href="/todos"
            aria-current={pathname?.startsWith("/todos") ? "page" : undefined}
            className={
              pathname?.startsWith("/todos")
                ? "border-b-2 border-current"
                : "opacity-80 hover:opacity-100 hover:underline"
            }
          >
            Todos
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

      <div className="flex items-center gap-3">
        {!isSupabaseConfigured ? (
          <span className="text-xs rounded-full border px-2 py-1 opacity-70">
            未配置 Supabase
          </span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-xs rounded-full border px-2 py-1 opacity-70">
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
    </div>
  );
}
