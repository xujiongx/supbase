"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowLeft, KeyRound, Link2, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      setBanner({
        type: "success",
        text: "验证码已发送，请查收邮箱并输入 6 位验证码",
      });
      setOtpToken("");
      setOtpCooldown(60);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBanner({ type: "error", text: msg || "发送失败" });
    } finally {
      setOtpSending(false);
    }
  };

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

  const emailOk = isValidEmail(email.trim());

  return (
    <div className="page-shell font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="mx-auto w-full max-w-md pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6 md:space-y-8">
          <nav aria-label="返回">
            <Link
              href="/"
              className="link-inline inline-flex items-center gap-1.5 text-sm text-muted-foreground touch-manipulation [-webkit-tap-highlight-color:transparent]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              返回首页
            </Link>
          </nav>

          <header className="space-y-2">
            <h1 className="page-title">登录</h1>
            <p className="page-lede max-w-none">
              无密码登录：填写邮箱后任选魔法链接或验证码，与朝暮记数据安全同步。
            </p>
          </header>

          {!isSupabaseConfigured ? (
            <div
              role="alert"
              className="banner banner-error text-sm leading-relaxed"
            >
              未检测到 Supabase 配置。请在项目根目录创建{" "}
              <code className="rounded border border-subtle bg-muted px-1 py-0.5 font-mono text-xs">
                .env.local
              </code>{" "}
              并填写{" "}
              <code className="rounded border border-subtle bg-muted px-1 py-0.5 font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              与{" "}
              <code className="rounded border border-subtle bg-muted px-1 py-0.5 font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>
              。
            </div>
          ) : null}

          {banner ? (
            <div
              role="status"
              className={`banner ${
                banner.type === "success" ? "banner-success" : "banner-error"
              }`}
            >
              {banner.text}
            </div>
          ) : null}

          {session ? (
            <div className="card card-interactive flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  当前账号
                </p>
                <p className="break-all text-sm text-foreground">
                  {session.user.email || session.user.id}
                </p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="btn btn-outline shrink-0 touch-manipulation"
              >
                退出登录
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-subtle px-5 py-5 md:px-6 md:py-6">
                <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                    <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  邮箱
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  以下两种方式共用同一邮箱，无需重复填写。
                </p>
                <label htmlFor="login-email" className="sr-only">
                  邮箱地址
                </label>
                <input
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input mt-4 w-full"
                  aria-label="邮箱地址"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="border-b border-subtle px-5 py-5 md:px-6 md:py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-subtle bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                    <KeyRound
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-sm font-medium tracking-tight">
                      邮箱验证码
                    </h2>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      向同一邮箱发送 6 位数字，在下方输入后完成登录。
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={sendEmailOtp}
                    disabled={otpSending || !emailOk || otpCooldown > 0}
                    className="btn btn-primary w-full touch-manipulation sm:w-auto sm:min-w-34 sm:shrink-0"
                  >
                    {otpSending
                      ? "发送中…"
                      : otpCooldown > 0
                        ? `重新发送（${otpCooldown}s）`
                        : "发送验证码"}
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") verifyEmailOtp();
                    }}
                    placeholder="6 位验证码"
                    className="input min-h-11 w-full flex-1 text-center text-base tracking-[0.35em] sm:text-left sm:tracking-widest"
                    aria-label="验证码"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={8}
                  />
                  <button
                    type="button"
                    onClick={verifyEmailOtp}
                    disabled={otpVerifying || !emailOk || !otpToken.trim()}
                    className="btn btn-outline w-full touch-manipulation sm:w-auto sm:shrink-0"
                  >
                    {otpVerifying ? "验证中…" : "验证并登录"}
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 md:px-6 md:py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-subtle bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                    <Link2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-sm font-medium tracking-tight">
                      魔法链接
                    </h2>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      向邮箱发送登录链接，在邮件中打开即可（适合已安装邮件 App
                      的设备）。
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        onClick={sendMagicLink}
                        disabled={loading || !emailOk}
                        className="btn btn-primary w-full touch-manipulation sm:w-auto sm:shrink-0"
                      >
                        {loading ? "发送中…" : "发送登录链接"}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="tooltip-content z-50 max-w-[min(100vw-2rem,18rem)] px-2.5 py-2 text-left text-xs leading-relaxed"
                      sideOffset={8}
                    >
                      会向该邮箱发送一封含登录按钮的邮件
                      <Tooltip.Arrow className="fill-[var(--color-border)]" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            登录即表示你理解本应用通过 Supabase 处理身份验证；遇到问题请检查垃圾箱或稍后再试。
          </p>
        </main>
      </Tooltip.Provider>
    </div>
  );
}
