"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase()!;
    const t = setTimeout(() => {
      client.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null);
      });
    }, 0);
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => {
      clearTimeout(t);
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">欢迎使用 Todos 应用</h1>
        {!isSupabaseConfigured ? (
          <div className="text-zinc-600 dark:text-zinc-400">
            请在项目根目录创建 .env.local 并填入 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启开发服务器。
          </div>
        ) : session ? (
          <div className="w-full max-w-lg rounded-lg border p-4">
            <div className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
              已登录：<span className="font-medium">{session.user.email || session.user.id}</span>
            </div>
            <div className="flex gap-3">
              <Link
                href="/todos"
                className="rounded-md bg-foreground px-4 py-2 text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                进入我的 Todos
              </Link>
              <Link
                href="/notes"
                className="rounded-md border px-4 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50"
              >
                查看每日笔记
              </Link>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="rounded-md border px-4 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] disabled:opacity-60"
              >
                退出登录
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg rounded-lg border p-6">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              登录后即可创建、勾选和删除你的待办事项。
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="rounded-md bg-foreground px-4 py-2 text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                去登录
              </Link>
              <Link
                href="/todos"
                className="rounded-md border px-4 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50"
              >
                先看看 Todos
              </Link>
              <Link
                href="/notes"
                className="rounded-md border px-4 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50"
              >
                查看每日笔记
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              提示：未登录时在 Todos 页面只能查看提示，登录后才会显示你的列表。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
