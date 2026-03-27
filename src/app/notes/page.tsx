"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
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
  const { session, isSupabaseConfigured } = useSupabaseSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    type: "today",
  });

  const fetchNotes = async () => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    const ready =
      timeFilter.type === "all" || (!!timeFilter.start && !!timeFilter.end);
    const t = setTimeout(() => {
      if (ready) fetchNotes();
    }, 200);
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
    <div className="page-shell font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8 md:space-y-10">
          <header className="space-y-2">
            <h1 className="page-title">每日笔记</h1>
            <p className="page-lede">
              Markdown（GFM）书写，所见即预览，按时间回顾记录。
            </p>
          </header>

          {!session ? (
            <div className="card card-interactive p-5">
              <p className="text-sm text-muted-foreground">
                请先登录以查看或添加笔记。
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="link-inline ml-1"
                >
                  去登录
                </button>
              </p>
            </div>
          ) : (
            <>
              {banner && (
                <div
                  role="status"
                  className={`banner ${
                    banner.type === "success"
                      ? "banner-success"
                      : "banner-error"
                  }`}
                >
                  {banner.text}
                </div>
              )}

              <TimeFilter value={timeFilter} onChange={setTimeFilter} />

              <div className="card space-y-4 p-4 md:p-5">
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
                  className="input min-h-[10rem]"
                  aria-label="输入笔记内容"
                />
                <div className="flex items-center gap-2">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={addNote}
                        disabled={!content.trim()}
                        className="btn btn-primary"
                      >
                        添加
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="tooltip-content z-50"
                      sideOffset={6}
                    >
                      支持 Markdown（GFM），按 Ctrl/⌘+Enter 快速添加
                      <Tooltip.Arrow className="fill-[var(--color-border)]" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <span className="text-xs text-muted-foreground">
                    {content.trim()
                      ? "Ctrl/⌘+Enter 快速添加"
                      : "请输入内容"}
                  </span>
                </div>
                <div className="rounded-md border border-dashed border-subtle bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    预览
                  </p>
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
                </div>
              </div>

              {loading ? (
                <div className="w-full space-y-2">
                  <div className="h-10 w-full animate-pulse skeleton" />
                  <div className="h-10 w-full animate-pulse skeleton" />
                </div>
              ) : notes.length === 0 ? (
                <div className="card card-interactive p-5 text-sm text-muted-foreground">
                  暂无笔记，输入上方内容并点击「添加」记录第一条。
                </div>
              ) : (
                <ul className="w-full space-y-3">
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="card card-interactive flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="prose prose-sm prose-zinc dark:prose-invert min-w-0 max-w-none flex-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {n.content}
                        </ReactMarkdown>
                      </div>
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <button className="btn btn-outline btn-sm shrink-0 self-start sm:self-center">
                            删除
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 bg-black/50 backdrop-blur-sm" />
                          <Dialog.Content className="card dialog-content-animate fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 p-5 shadow-none">
                            <Dialog.Title className="text-base font-semibold tracking-tight">
                              确认删除
                            </Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                              此操作不可恢复，确定要删除这条笔记吗？
                            </Dialog.Description>
                            <div className="mt-6 flex flex-wrap justify-end gap-2">
                              <Dialog.Close asChild>
                                <button className="btn btn-outline text-sm">
                                  取消
                                </button>
                              </Dialog.Close>
                              <Dialog.Close asChild>
                                <button
                                  onClick={() => removeNote(n.id)}
                                  className="btn btn-danger text-sm"
                                >
                                  删除
                                </button>
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
