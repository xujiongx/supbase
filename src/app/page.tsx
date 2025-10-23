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
    <div className="font-sans space-y-10">
      {/* Hero 区域 */}
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">欢迎使用 Todos 应用</h1>
        <p className="text-sm md:text-base opacity-70">一个黑白极简的任务与笔记工具，支持 ☀︎/☾ 主题切换与 Markdown。</p>

        {/* 状态与快捷操作卡片 */}
        {!isSupabaseConfigured ? (
          <div className="card p-4">
            <div className="text-sm opacity-70">
              请在项目根目录创建 <span className="font-medium">.env.local</span> 并填入 <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span> 与 <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>，然后重启开发服务器。
            </div>
          </div>
        ) : session ? (
          <div className="card p-6 space-y-4">
            <div className="text-sm opacity-70">
              已登录：<span className="font-medium">{session.user.email || session.user.id}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/todos" className="btn btn-primary">进入我的 Todos</Link>
              <Link href="/notes" className="btn btn-outline">查看每日笔记</Link>
              <button onClick={signOut} disabled={signingOut} className="btn btn-outline">{signingOut ? "正在退出…" : "退出登录"}</button>
            </div>
          </div>
        ) : (
          <div className="card p-6 space-y-4">
            <p className="text-sm opacity-70">登录后即可创建、勾选和删除你的待办事项，并撰写每日笔记。</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary">去登录</Link>
              <Link href="/todos" className="btn btn-outline">先看看 Todos</Link>
              <Link href="/notes" className="btn btn-outline">查看每日笔记</Link>
            </div>
            <p className="text-xs opacity-60">提示：未登录时在 Todos 页面只能查看提示，登录后才会显示你的列表。</p>
          </div>
        )}
      </section>

      {/* 特性栅格 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">待办列表</h3>
          <p className="text-sm opacity-70">创建、勾选与删除，专注当下，清晰掌控任务。</p>
        </div>
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">每日笔记</h3>
          <p className="text-sm opacity-70">记录灵感与思考，支持 Markdown 与主题适配。</p>
        </div>
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">黑白主题</h3>
          <p className="text-sm opacity-70">☀︎/☾ 一键切换，优先你的选择，兼容系统偏好。</p>
        </div>
      </section>
    </div>
  );
}
