"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import TimeFilter, { TimeFilterValue } from "@/components/TimeFilter";

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
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({ type: "today" });

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
      // 移除 notes:refresh 派发，避免与依赖副作用重复触发
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
    let q = getSupabase()!
      .from("daily_notes")
      .select("id, content, created_at")
      .eq("user_id", session.user.id);
    // 时间范围筛选（YYYY-MM-DD）
    if (timeFilter.type !== "all") {
      const startStr = timeFilter.start;
      const endStr = timeFilter.end;
      if (startStr) q = q.gte("created_at", `${startStr} 00:00:00`);
      if (endStr) q = q.lte("created_at", `${endStr} 23:59:59`);
    }
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) setBanner({ type: "error", text: error.message });
    else setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const ready = timeFilter.type === "all" || (!!timeFilter.start && !!timeFilter.end);
    const t = setTimeout(() => { if (ready) fetchNotes(); }, 200);
    const onRefresh = () => fetchNotes();
    window.addEventListener("notes:refresh", onRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("notes:refresh", onRefresh);
    };
  }, [session, timeFilter]);

  const addNote = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!isSupabaseConfigured) {
      setBanner({ type: "error", text: "请配置 Supabase 环境变量" });
      toast.error("请配置 Supabase 环境变量");
      return;
    }
    if (!session) {
      setBanner({ type: "error", text: "请先登录再添加笔记" });
      toast.error("请先登录再添加笔记");
      return;
    }
    const { error } = await getSupabase()!
      .from("daily_notes")
      .insert({ content: trimmed, user_id: session.user.id });
    if (error) {
      setBanner({ type: "error", text: error.message });
      toast.error(error.message);
    } else {
      setContent("");
      setBanner({ type: "success", text: "已添加笔记" });
      toast.success("已添加笔记");
      window.dispatchEvent(new CustomEvent("notes:refresh"));
    }
  };

  const removeNote = async (id: number) => {
    if (!isSupabaseConfigured) {
      setBanner({ type: "error", text: "请配置 Supabase 环境变量" });
      toast.error("请配置 Supabase 环境变量");
      return;
    }
    if (!session?.user?.id) {
      setBanner({ type: "error", text: "请先登录再删除笔记" });
      toast.error("请先登录再删除笔记");
      return;
    }
    const { error } = await getSupabase()!
      .from("daily_notes")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("notes:refresh"));
  };

  return (
    <div className="font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8">
          {/* 顶部标题与快捷入口 */}
          <section className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">每日笔记</h1>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="btn btn-outline">返回首页</Link>
            </div>
          </section>

          {!isSupabaseConfigured ? (
            <div className="card p-4"><div className="text-sm opacity-70">请在 <span className="font-medium">.env.local</span> 配置 Supabase 环境变量</div></div>
          ) : !session ? (
            <div className="card p-4"><div className="text-sm opacity-70">请先登录以查看或添加你的每日笔记。<button onClick={() => router.push("/login")} className="ml-1 underline underline-offset-4">立即去登录</button></div></div>
          ) : (
            <>
              {banner && (<div className="card px-3 py-2 text-sm">{banner.text}</div>)}

              {/* 时间筛选组件 */}
              <TimeFilter value={timeFilter} onChange={setTimeFilter} />

              {/* 编辑与预览 */}
              <div className="card p-3 space-y-3">
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
                  className="input h-40"
                  aria-label="输入笔记内容"
                />
                <div className="flex items-center gap-2">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button onClick={addNote} disabled={!content.trim()} className="btn btn-primary">添加</button>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>
                      支持 Markdown（GFM），按 Ctrl/⌘+Enter 快速添加
                      <Tooltip.Arrow className="opacity-40" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <span className="text-xs opacity-60">{content.trim() ? "Ctrl/⌘+Enter 快速添加" : "请输入内容"}</span>
                </div>
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              </div>

              {loading ? (
                <div className="w-full space-y-2">
                  <div className="h-10 w-full animate-pulse skeleton" />
                  <div className="h-10 w-full animate-pulse skeleton" />
                </div>
              ) : notes.length === 0 ? (
                <div className="card p-4 text-sm opacity-70">暂无笔记，输入上方内容并点击“添加”来记录第一条。</div>
              ) : (
                <ul className="w-full space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="card flex items-center justify-between px-3 py-2">
                      <div className="prose prose-zinc dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.content}</ReactMarkdown>
                      </div>
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <button className="btn btn-outline text-sm">删除</button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                          <Dialog.Content className="card fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
                            <Dialog.Title className="text-base font-medium">确认删除</Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm opacity-70">此操作不可恢复，确定要删除这条笔记吗？</Dialog.Description>
                            <div className="mt-4 flex justify-end gap-2">
                              <Dialog.Close asChild>
                                <button className="btn btn-outline text-sm">取消</button>
                              </Dialog.Close>
                              <Dialog.Close asChild>
                                <button onClick={() => removeNote(n.id)} className="btn btn-danger text-sm">删除</button>
                              </Dialog.Close>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </Tooltip.Provider>
    </div>
  );
}