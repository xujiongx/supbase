"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import * as Tooltip from "@radix-ui/react-tooltip";

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
    <div className="font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8">
          {/* 顶部标题与快捷入口 */}
          <section className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">登录</h1>
          </section>
          
          {banner && (<div className="card px-3 py-2 text-sm">{banner.text}</div>)}
          
          {!isSupabaseConfigured ? (
            <div className="card p-4"><div className="text-sm opacity-70">请在项目根目录创建 <span className="font-medium">.env.local</span> 并填入 <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span> 与 <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>，然后重启开发服务器。</div></div>
          ) : session ? (
            <div className="card flex items-center justify-between px-3 py-2">
              <span className="text-sm opacity-80">已登录：{session.user.email || session.user.id}</span>
              <button onClick={signOut} className="btn btn-outline text-sm">退出登录</button>
            </div>
          ) : (
            <div className="card p-3 space-y-3">
              <div className="flex w-full gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMagicLink(); }}
                  placeholder="输入邮箱以登录（魔法链接）"
                  className="input flex-1"
                  aria-label="邮箱"
                  type="email"
                />
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button onClick={sendMagicLink} disabled={loading || !isValidEmail(email.trim())} className="btn btn-primary">{loading ? "发送中..." : "发送登录链接"}</button>
                  </Tooltip.Trigger>
                  <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>我们会给你的邮箱发送登录链接<Tooltip.Arrow className="opacity-40" /></Tooltip.Content>
                </Tooltip.Root>
              </div>
              <p className="text-xs opacity-60">使用魔法链接登录，无需密码。</p>
            </div>
          )}
        </main>
      </Tooltip.Provider>
    </div>
  );
}