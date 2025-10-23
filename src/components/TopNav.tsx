"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function TopNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase()!;
    // 初始化获取会话
    client.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      // 异步调度，避免同步 setState 的警告
      const t = setTimeout(() => setSession(s), 0);
      return () => clearTimeout(t);
    });
    // 监听会话变化
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

  return (
    <div className="flex items-center justify-between">
      {/* 左侧品牌与导航 */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold text-black dark:text-zinc-50">
          我的应用
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/todos" className="text-zinc-700 hover:underline dark:text-zinc-300">
            Todos
          </Link>
          <Link href="/notes" className="text-zinc-700 hover:underline dark:text-zinc-300">
            每日笔记
          </Link>
        </nav>
      </div>

      {/* 右上角登录/退出 UI */}
      <div className="flex items-center gap-3">
        {!isSupabaseConfigured ? (
          <span className="text-xs text-zinc-600 dark:text-zinc-400">未配置 Supabase</span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {session.user.email || session.user.id}
            </span>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="rounded-md border px-3 py-1 text-sm hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] disabled:opacity-60"
            >
              退出登录
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-foreground px-3 py-1 text-sm text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            登录
          </Link>
        )}
      </div>
    </div>
  );
}