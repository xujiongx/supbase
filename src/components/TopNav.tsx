"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Menu, Moon, Sun, X } from "lucide-react";

const MOBILE_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "首页" },
  { href: "/zhaomu", label: "今朝" },
  { href: "/todos", label: "每日待办" },
  { href: "/notes", label: "每日笔记" },
  { href: "/discover", label: "每日发现" },
];

function pathnameMatchesHref(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** 登录展示用字符串：优先 user.email，其次 metadata / identities */
function sessionAccountLabel(user: User): string {
  const direct = typeof user.email === "string" ? user.email.trim() : "";
  if (direct) return direct;
  const meta = user.user_metadata;
  if (meta && typeof meta.email === "string" && meta.email.trim()) {
    return meta.email.trim();
  }
  if (Array.isArray(user.identities)) {
    for (const row of user.identities) {
      const ie = row?.identity_data?.email;
      if (typeof ie === "string" && ie.trim()) return ie.trim();
    }
  }
  return typeof user.id === "string" ? user.id : "";
}

/** 头像内单字：取 @ 前首字母；纯 Latin 小写则大写，便于稳定显示 */
function accountAvatarInitial(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) return "?";
  const at = trimmed.indexOf("@");
  const local = (at === -1 ? trimmed : trimmed.slice(0, at)).trim();
  if (!local) return "?";
  const cp = local.codePointAt(0);
  if (cp === undefined) return "?";
  const ch = String.fromCodePoint(cp);
  /* ASCII a-z */
  if (ch >= "a" && ch <= "z") return ch.toUpperCase();
  return ch;
}

export default function TopNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const systemPrefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    try {
      const coarse =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches;
      const ua =
        typeof navigator !== "undefined"
          ? navigator.userAgent.toLowerCase()
          : "";
      const isMobileUA =
        /mobile|android|iphone|ipod|ipad|windows phone|blackberry/.test(ua);
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

  const mobileAccountLabel = session
    ? sessionAccountLabel(session.user)
    : "";
  const mobileAvatarLetter = session
    ? accountAvatarInitial(mobileAccountLabel)
    : "";

  return (
    <div className="flex w-full items-center justify-between gap-2 sm:gap-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-0 sm:flex-initial sm:gap-6">
        {isMobileDevice ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-subtle bg-[color-mix(in_srgb,var(--muted)_45%,var(--background))] touch-manipulation transition-colors [-webkit-tap-highlight-color:transparent] active:bg-muted sm:hidden"
            aria-label="打开菜单"
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
        <Link
          href="/"
          className="min-w-0 truncate text-base font-semibold leading-none tracking-tight transition-opacity hover:opacity-75 sm:text-lg"
        >
          朝暮记
        </Link>
        <nav className="hidden sm:flex items-center gap-1 md:gap-2 text-sm">
          <Link
            href="/zhaomu"
            aria-current={
              pathname?.startsWith("/zhaomu") ? "page" : undefined
            }
            className={`nav-link rounded-sm px-2 py-1 ${
              pathname?.startsWith("/zhaomu") ? "nav-link-active" : ""
            }`}
          >
            今朝
          </Link>
          <Link
            href="/todos"
            aria-current={pathname?.startsWith("/todos") ? "page" : undefined}
            className={`nav-link rounded-sm px-2 py-1 ${
              pathname?.startsWith("/todos") ? "nav-link-active" : ""
            }`}
          >
            每日待办
          </Link>
          <Link
            href="/notes"
            aria-current={pathname?.startsWith("/notes") ? "page" : undefined}
            className={`nav-link rounded-sm px-2 py-1 ${
              pathname?.startsWith("/notes") ? "nav-link-active" : ""
            }`}
          >
            每日笔记
          </Link>
          <Link
            href="/discover"
            aria-current={
              pathname?.startsWith("/discover") ? "page" : undefined
            }
            className={`nav-link rounded-sm px-2 py-1 ${
              pathname?.startsWith("/discover") ? "nav-link-active" : ""
            }`}
          >
            每日发现
          </Link>
        </nav>
      </div>

      {/* 移动端右侧：紧凑账户状态 / 登录 */}
      <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
        {session ? (
          <>
            <span className="sr-only">{mobileAccountLabel}</span>
            <div
              key={`${session.user.id}-${mobileAvatarLetter}`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full border border-subtle bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]"
              title={mobileAccountLabel}
              aria-hidden
            >
              <span
                className="select-none text-base font-semibold leading-none tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                {mobileAvatarLetter}
              </span>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="btn btn-primary btn-sm px-3.5 py-1.5 text-xs touch-manipulation [-webkit-tap-highlight-color:transparent]"
          >
            登录
          </Link>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-3">
        {session ? (
          <div className="flex items-center gap-3">
            <span className="max-w-[200px] truncate rounded-full border border-subtle px-2 py-1 text-xs text-muted-foreground">
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
          <span className="flex items-center" aria-hidden>
            {isDark ? (
              <Sun className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.75} />
            )}
          </span>
        </button>
      </div>

      {isMobileDevice ? (
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="nav-drawer-overlay fixed inset-0 z-[100] bg-black/60" />
            <Dialog.Content
              className="card nav-drawer-content fixed inset-x-0 bottom-0 z-[101] max-h-[min(90dvh,100dvh)] w-full touch-manipulation overflow-y-auto rounded-b-none rounded-t-2xl border-b-0 border-subtle p-0 shadow-none [-webkit-overflow-scrolling:touch]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {/* 把手：示意可自底部滑出 */}
              <div
                className="flex justify-center pt-2 pb-1"
                aria-hidden
              >
                <div className="h-1 w-10 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_35%,transparent)]" />
              </div>
              <div className="sticky top-0 z-10 border-b border-subtle bg-background px-4 pb-3 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Dialog.Title className="text-base font-semibold tracking-tight">
                      菜单
                    </Dialog.Title>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      朝暮记 · 导航与显示
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-subtle bg-background touch-manipulation transition-colors [-webkit-tap-highlight-color:transparent] active:bg-muted"
                      aria-label="关闭菜单"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              <nav className="px-2 py-2" aria-label="主导航">
                <ul className="space-y-0.5">
                  {MOBILE_LINKS.map(({ href, label: itemLabel }) => {
                    const active = pathnameMatchesHref(pathname, href);
                    return (
                      <li key={href}>
                        <Dialog.Close asChild>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={[
                              "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors [-webkit-tap-highlight-color:transparent] active:opacity-80",
                              active
                                ? "bg-[color-mix(in_srgb,var(--muted)_70%,var(--background))] text-foreground"
                                : "text-foreground hover:bg-muted/90",
                            ].join(" ")}
                          >
                            {itemLabel}
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${active ? "text-foreground opacity-50" : "text-muted-foreground"}`}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </Link>
                        </Dialog.Close>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="space-y-2 border-t border-subtle px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                {session ? (
                  <p className="break-all text-xs leading-relaxed text-muted-foreground">
                    {session.user.email || session.user.id}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  {isSupabaseConfigured && session ? (
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        onClick={signOut}
                        disabled={signingOut}
                        className="btn btn-outline w-full justify-center touch-manipulation"
                      >
                        退出登录
                      </button>
                    </Dialog.Close>
                  ) : (
                    <Dialog.Close asChild>
                      <Link
                        href="/login"
                        className="btn btn-primary w-full justify-center touch-manipulation"
                      >
                        登录
                      </Link>
                    </Dialog.Close>
                  )}
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="btn btn-outline flex w-full items-center justify-center gap-2 touch-manipulation"
                    >
                      {isDark ? (
                        <Sun className="h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <Moon className="h-4 w-4" strokeWidth={1.75} />
                      )}
                      {isDark ? "浅色模式" : "深色模式"}
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </div>
  );
}
