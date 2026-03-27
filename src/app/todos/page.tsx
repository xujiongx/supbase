"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import TimeFilter, { TimeFilterValue } from "@/components/TimeFilter";

interface Todo {
  id: number;
  title: string;
  is_complete: boolean;
  created_at: string;
}

export default function TodosPage() {
  const router = useRouter();
  const { session, isSupabaseConfigured } = useSupabaseSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    type: "today",
  });

  const fetchTodos = async () => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let q = getSupabase()!
      .from("todos")
      .select("id, title, is_complete, created_at")
      .eq("user_id", session.user.id);

    // 统一消费组件提供的 start/end（YYYY-MM-DD），仅当 type!==all 时应用时间条件
    const startStr = timeFilter.start?.trim();
    const endStr = timeFilter.end?.trim();

    if (timeFilter.type !== "all") {
      if (startStr) {
        const s = new Date(startStr);
        s.setHours(0, 0, 0, 0);
        q = q.gte("created_at", s.toISOString());
      }
      if (endStr) {
        const e = new Date(endStr);
        e.setHours(23, 59, 59, 999);
        q = q.lte("created_at", e.toISOString());
      }
    }

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) {
      setBanner({ type: "error", text: error.message });
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const ready =
      timeFilter.type === "all" || (!!timeFilter.start && !!timeFilter.end);
    const t = setTimeout(() => {
      if (ready) fetchTodos();
    }, 200);
    const onRefresh = () => fetchTodos();
    window.addEventListener("todos:refresh", onRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("todos:refresh", onRefresh);
    };
  }, [session, timeFilter]);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!isSupabaseConfigured) {
      setBanner({
        type: "error",
        text: "请先在 .env.local 填写 Supabase URL 和 anon key",
      });
      return;
    }
    if (!session) {
      setBanner({ type: "error", text: "请先登录再添加待办" });
      return;
    }
    const { error } = await getSupabase()!
      .from("todos")
      .insert({ title: trimmed, user_id: session.user.id });
    if (error) setBanner({ type: "error", text: error.message });
    else {
      setTitle("");
      setBanner({ type: "success", text: "已添加待办" });
      window.dispatchEvent(new CustomEvent("todos:refresh"));
    }
  };

  const toggleComplete = async (todo: Todo) => {
    if (!isSupabaseConfigured) {
      setBanner({
        type: "error",
        text: "请先在 .env.local 填写 Supabase URL 和 anon key",
      });
      return;
    }
    if (!session?.user?.id) {
      setBanner({ type: "error", text: "请先登录再更新待办" });
      return;
    }
    const { error } = await getSupabase()!
      .from("todos")
      .update({ is_complete: !todo.is_complete })
      .eq("id", todo.id)
      .eq("user_id", session.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("todos:refresh"));
  };

  const removeTodo = async (id: number) => {
    if (!isSupabaseConfigured) {
      setBanner({
        type: "error",
        text: "请先在 .env.local 填写 Supabase URL 和 anon key",
      });
      return;
    }
    if (!session?.user?.id) {
      setBanner({ type: "error", text: "请先登录再删除待办" });
      return;
    }
    const { error } = await getSupabase()!
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("todos:refresh"));
  };

  return (
    <div className="page-shell font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8 md:space-y-10">
          <header className="space-y-5">
            <div>
              <h1 className="page-title">每日待办</h1>
              <p className="page-lede">
                勾选完成、删繁就简，按时间范围筛选你的记录。
              </p>
            </div>
            <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          </header>

          {!session ? (
            <div className="card card-interactive p-5">
              <p className="text-sm text-muted-foreground">
                请先登录以查看你的待办。
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

              <div className="card p-4 md:p-5">
                <div className="flex w-full gap-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="输入新的待办..."
                    className="input flex-1"
                    aria-label="输入新的待办"
                  />
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={handleAdd}
                        disabled={!title.trim()}
                        className="btn btn-primary"
                      >
                        添加
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="tooltip-content z-50"
                      sideOffset={6}
                    >
                      按 Enter 快速添加
                      <Tooltip.Arrow className="fill-[var(--color-border)]" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </div>

              {/* 列表或占位 */}
              {loading ? (
                <div className="w-full space-y-2">
                  <div className="h-10 w-full animate-pulse skeleton" />
                  <div className="h-10 w-full animate-pulse skeleton" />
                  <div className="h-10 w-full animate-pulse skeleton" />
                </div>
              ) : todos.length === 0 ? (
                <div className="card card-interactive p-5 text-sm text-muted-foreground">
                  暂无待办，输入上方文本并点击「添加」创建第一条。
                </div>
              ) : (
                <ul className="w-full space-y-2">
                  {todos.map((t) => (
                    <li
                      key={t.id}
                      className="card card-interactive flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <input
                              type="checkbox"
                              aria-label={t.title}
                              checked={t.is_complete}
                              onChange={() => toggleComplete(t)}
                            />
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            className="tooltip-content z-50"
                            sideOffset={6}
                          >
                            {t.is_complete ? "标记为未完成" : "标记为完成"}
                            <Tooltip.Arrow className="fill-[var(--color-border)]" />
                          </Tooltip.Content>
                        </Tooltip.Root>
                        <span
                          className={
                            t.is_complete ? "line-through opacity-60" : ""
                          }
                        >
                          {t.title}
                        </span>
                      </div>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            onClick={() => setDeletingTodo(t)}
                            className="btn btn-danger text-sm"
                          >
                            删除
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          className="tooltip-content z-50"
                          sideOffset={6}
                        >
                          删除该待办
                          <Tooltip.Arrow className="fill-[var(--color-border)]" />
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </li>
                  ))}
                </ul>
              )}

              {/* 删除确认对话框 */}
              <Dialog.Root
                open={!!deletingTodo}
                onOpenChange={(open) => {
                  if (!open) setDeletingTodo(null);
                }}
              >
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 bg-black/50 backdrop-blur-sm" />
                  <Dialog.Content className="card dialog-content-animate fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 p-5 shadow-none">
                    <Dialog.Title className="text-lg font-medium">
                      确认删除
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                      该操作不可撤销，是否删除「{deletingTodo?.title}」？
                    </Dialog.Description>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                      <Dialog.Close asChild>
                        <button className="btn btn-outline">取消</button>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <button
                          className="btn btn-danger"
                          onClick={() =>
                            deletingTodo && removeTodo(deletingTodo.id)
                          }
                        >
                          删除
                        </button>
                      </Dialog.Close>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </>
          )}
        </main>
      </Tooltip.Provider>
    </div>
  );
}
