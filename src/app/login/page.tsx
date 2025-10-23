"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => {
      setBanner({ type: "success", text: "已登录，正在跳转到 Todos..." });
      router.replace("/todos");
    }, 100);
    return () => clearTimeout(t);
  }, [session, router]);

  const isValidEmail = (v: string) => v.includes("@") && v.includes(".");

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setBanner({ type: "error", text: "请输入有效的邮箱地址" });
      return;
    }
    if (!isSupabaseConfigured) {
      setBanner({ type: "error", text: "请先在 .env.local 配置 Supabase URL 和 anon key" });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const client = getSupabase()!;
      const { error } = await client.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setBanner({ type: "success", text: "登录链接已发送，请查收邮箱并点击链接完成登录" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBanner({ type: "error", text: msg || "发送失败" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const client = getSupabase()!;
    await client.auth.signOut();
    setBanner({ type: "success", text: "已退出登录" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start gap-6 py-24 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">登录</h1>
        <div className="flex gap-3">
          <Link href="/" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">返回首页</Link>
          <Link href="/todos" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">进入 Todos</Link>
        </div>

        {banner && (
          <div className={`w-full max-w-md rounded-md border px-3 py-2 text-sm ${banner.type === "success" ? "border-green-500 text-green-700 dark:text-green-400" : "border-red-500 text-red-700 dark:text-red-400"}`}>
            {banner.text}
          </div>
        )}

        {!isSupabaseConfigured ? (
          <div className="text-zinc-600 dark:text-zinc-400">
            请在项目根目录创建 .env.local 并填入 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启开发服务器。
          </div>
        ) : session ? (
          <div className="flex items-center justify-between w-full max-w-md rounded-md border px-3 py-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              已登录：{session.user.email || session.user.id}
            </span>
            <button onClick={signOut} className="rounded-md border px-2 py-1 text-sm hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]">
              退出登录
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full max-w-md">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMagicLink();
              }}
              placeholder="输入邮箱以登录（魔法链接）"
              className="flex-1 rounded-md border px-3 py-2 text-black dark:text-zinc-100 dark:bg-zinc-900"
            />
            <button
              onClick={sendMagicLink}
              disabled={loading || !isValidEmail(email.trim())}
              className="rounded-md bg-foreground px-4 py-2 text-background hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-60"
            >
              {loading ? "发送中..." : "发送登录链接"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}