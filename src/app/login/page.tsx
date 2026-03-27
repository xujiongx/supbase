"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import * as Tooltip from "@radix-ui/react-tooltip";

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 新增：邮箱验证码相关状态
  const [otpToken, setOtpToken] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

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
      setBanner({ type: "success", text: "已登录，正在跳转到首页..." });
      router.replace("/");
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
      setBanner({
        type: "error",
        text: "请先在 .env.local 配置 Supabase URL 和 anon key",
      });
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
      setBanner({
        type: "success",
        text: "登录链接已发送，请查收邮箱并点击链接完成登录",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBanner({ type: "error", text: msg || "发送失败" });
    } finally {
      setLoading(false);
    }
  };

  // 新增：发送邮箱验证码
  const sendEmailOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setBanner({ type: "error", text: "请输入有效的邮箱地址" });
      return;
    }
    if (!isSupabaseConfigured) {
      setBanner({
        type: "error",
        text: "请先在 .env.local 配置 Supabase URL 和 anon key",
      });
      return;
    }
    if (otpCooldown > 0) return;
    setOtpSending(true);
    setBanner(null);
    try {
      const client = getSupabase()!;
      const { error } = await client.auth.signInWithOtp({
        email: trimmed,
      });
      if (error) throw error;
      setBanner({ type: "success", text: "验证码已发送，请查收邮箱并输入 6 位验证码" });
      setOtpToken("");
      setOtpCooldown(60);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBanner({ type: "error", text: msg || "发送失败" });
    } finally {
      setOtpSending(false);
    }
  };

  // 新增：验证邮箱验证码
  const verifyEmailOtp = async () => {
    const trimmed = email.trim();
    const token = otpToken.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setBanner({ type: "error", text: "请输入有效的邮箱地址" });
      return;
    }
    if (!token) {
      setBanner({ type: "error", text: "请输入 6 位验证码" });
      return;
    }
    if (!isSupabaseConfigured) {
      setBanner({
        type: "error",
        text: "请先在 .env.local 配置 Supabase URL 和 anon key",
      });
      return;
    }
    setOtpVerifying(true);
    setBanner(null);
    try {
      const client = getSupabase()!;
      const { data, error } = await client.auth.verifyOtp({
        email: trimmed,
        token,
        type: "email",
      });
      if (error) throw error;
      if (data?.session) {
        setBanner({ type: "success", text: "验证成功，正在登录..." });
        // 会由 onAuthStateChange 自动设置 session 并跳转
      } else {
        setBanner({ type: "error", text: "验证失败，请重试" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBanner({ type: "error", text: msg || "验证失败" });
    } finally {
      setOtpVerifying(false);
    }
  };

  // 新增：验证码发送倒计时
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const signOut = async () => {
    const client = getSupabase()!;
    await client.auth.signOut();
    setBanner({ type: "success", text: "已退出登录" });
  };

  return (
    <div className="page-shell font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="mx-auto max-w-lg space-y-8 md:space-y-10">
          <header className="space-y-2">
            <h1 className="page-title">登录</h1>
            <p className="page-lede">
              使用邮箱验证码或魔法链接，无密码即可进入朝暮记。
            </p>
          </header>

          {banner && (
            <div
              role="status"
              className={`banner ${
                banner.type === "success" ? "banner-success" : "banner-error"
              }`}
            >
              {banner.text}
            </div>
          )}

          {session ? (
            <div className="card card-interactive flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                已登录：{session.user.email || session.user.id}
              </span>
              <button onClick={signOut} className="btn btn-outline shrink-0">
                退出登录
              </button>
            </div>
          ) : (
            <>
              <div className="card space-y-4 p-5 md:p-6">
                <div>
                  <h2 className="text-sm font-medium tracking-tight">
                    魔法链接
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    邮件内点击链接即可完成登录。
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMagicLink();
                    }}
                    placeholder="邮箱地址"
                    className="input flex-1"
                    aria-label="邮箱（魔法链接）"
                    type="email"
                  />
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={sendMagicLink}
                        disabled={loading || !isValidEmail(email.trim())}
                        className="btn btn-primary sm:w-auto sm:shrink-0"
                      >
                        {loading ? "发送中…" : "发送链接"}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="tooltip-content z-50"
                      sideOffset={6}
                    >
                      我们会向该邮箱发送登录链接
                      <Tooltip.Arrow className="fill-[var(--color-border)]" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </div>

              <div className="card space-y-4 p-5 md:p-6">
                <div>
                  <h2 className="text-sm font-medium tracking-tight">
                    邮箱验证码
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    查收邮件，输入 6 位数字完成验证。
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendEmailOtp();
                    }}
                    placeholder="邮箱地址"
                    className="input flex-1"
                    aria-label="邮箱（验证码）"
                    type="email"
                  />
                  <button
                    onClick={sendEmailOtp}
                    disabled={
                      otpSending ||
                      !isValidEmail(email.trim()) ||
                      otpCooldown > 0
                    }
                    className="btn btn-primary sm:w-auto sm:shrink-0"
                  >
                    {otpSending
                      ? "发送中…"
                      : otpCooldown > 0
                        ? `重新发送（${otpCooldown}s）`
                        : "发送验证码"}
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") verifyEmailOtp();
                    }}
                    placeholder="6 位验证码"
                    className="input flex-1 tracking-widest"
                    aria-label="验证码"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                  />
                  <button
                    onClick={verifyEmailOtp}
                    disabled={
                      otpVerifying ||
                      !isValidEmail(email.trim()) ||
                      !otpToken.trim()
                    }
                    className="btn btn-outline sm:w-auto sm:shrink-0"
                  >
                    {otpVerifying ? "验证中…" : "验证登录"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </Tooltip.Provider>
    </div>
  );
}
