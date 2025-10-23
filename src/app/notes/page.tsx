"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Note {
  id: number;
  content: string;
  created_at: string;
}

export default function NotesPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const t0 = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t0);
    }
    const client = getSupabase()!;
    const t = setTimeout(() => {
      client.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null);
      });
    }, 0);
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      window.dispatchEvent(new CustomEvent("notes:refresh"));
    });
    return () => {
      clearTimeout(t);
      sub.subscription?.unsubscribe();
    };
  }, []);

  const fetchNotes = async () => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return;
    }
    const { data, error } = await getSupabase()!
      .from("daily_notes")
      .select("id, content, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) setBanner({ type: "error", text: error.message });
    else setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchNotes(), 0);
    const onRefresh = () => fetchNotes();
    window.addEventListener("notes:refresh", onRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("notes:refresh", onRefresh);
    };
  }, [session]);

  const addNote = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!isSupabaseConfigured) {
      setBanner({ type: "error", text: "请配置 Supabase 环境变量" });
      return;
    }
    if (!session) {
      setBanner({ type: "error", text: "请先登录再添加笔记" });
      return;
    }
    const { error } = await getSupabase()!
      .from("daily_notes")
      .insert({ content: trimmed, user_id: session.user.id });
    if (error) setBanner({ type: "error", text: error.message });
    else {
      setContent("");
      setBanner({ type: "success", text: "已添加笔记" });
      window.dispatchEvent(new CustomEvent("notes:refresh"));
    }
  };

  const removeNote = async (id: number) => {
    const { error } = await getSupabase()!
      .from("daily_notes")
      .delete()
      .eq("id", id)
      .eq("user_id", session!.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("notes:refresh"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start gap-6 py-24 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">每日笔记</h1>
        <div className="flex gap-3">
          <Link href="/" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">返回首页</Link>
          <Link href="/todos" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">Todos</Link>
        </div>

        {!isSupabaseConfigured ? (
          <div className="text-zinc-600 dark:text-zinc-400">请在 .env.local 配置 Supabase 环境变量</div>
        ) : !session ? (
          <div className="text-zinc-600 dark:text-zinc-400">请先登录以查看或添加你的每日笔记</div>
        ) : (
          <>
            {banner && (
              <div className={`w-full max-w-md rounded-md border px-3 py-2 text-sm ${banner.type === "success" ? "border-green-500 text-green-700 dark:text-green-400" : "border-red-500 text-red-700 dark:text-red-400"}`}>
                {banner.text}
              </div>
            )}

            {/* 多行 textarea + react-markdown 预览 */}
            <div className="w-full space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                placeholder="支持 Markdown（GFM），按 Ctrl/⌘+Enter 快速添加"
                className="w-full h-40 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] px-3 py-2 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addNote}
                  disabled={!content.trim()}
                  className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-60"
                >
                  添加
                </button>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{content.trim() ? "" : "请输入内容"}</span>
              </div>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>

            {loading ? (
              <div className="w-full space-y-2">
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-zinc-600 dark:text-zinc-400">暂无笔记，输入上方内容并点击“添加”来记录第一条。</div>
            ) : (
              <ul className="w-full space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.content}</ReactMarkdown>
                    </div>
                    <button
                      onClick={() => removeNote(n.id)}
                      className="rounded-md border px-2 py-1 text-sm hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}