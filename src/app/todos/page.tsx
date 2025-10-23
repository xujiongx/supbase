"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";

interface Todo {
  id: number;
  title: string;
  is_complete: boolean;
  created_at: string;
}

export default function TodosPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

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
      window.dispatchEvent(new CustomEvent("todos:refresh"));
    });
    return () => {
      clearTimeout(t);
      sub.subscription?.unsubscribe();
    };
  }, []);

  const fetchTodos = async () => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return;
    }
    const { data, error } = await getSupabase()!
      .from("todos")
      .select("id, title, is_complete, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setBanner({ type: "error", text: error.message });
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchTodos();
    }, 0);
    const onRefresh = () => fetchTodos();
    window.addEventListener("todos:refresh", onRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("todos:refresh", onRefresh);
    };
  }, [session]);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!isSupabaseConfigured) {
      setBanner({ type: "error", text: "请先在 .env.local 填写 Supabase URL 和 anon key" });
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
      setBanner({ type: "error", text: "请先在 .env.local 填写 Supabase URL 和 anon key" });
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
      setBanner({ type: "error", text: "请先在 .env.local 填写 Supabase URL 和 anon key" });
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
    <div className="font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8">
          {/* 顶部标题与快捷入口 */}
          <section className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Todos</h1>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="btn btn-outline">返回首页</Link>
            </div>
          </section>

          {/* 状态说明或登录提示 */}
          {!isSupabaseConfigured ? (
            <div className="card p-4">
              <div className="text-sm opacity-70">
                请在项目根目录创建 <span className="font-medium">.env.local</span> 并填入 <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span> 与 <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>，然后重启开发服务器。
              </div>
            </div>
          ) : !session ? (
            <div className="card p-4">
              <div className="text-sm opacity-70">
                请先登录以查看你的待办。
                <button onClick={() => router.push("/login")} className="ml-1 underline underline-offset-4">立即去登录</button>
              </div>
            </div>
          ) : (
            <>
              {banner && (
                <div className="card px-3 py-2 text-sm">
                  {banner.text}
                </div>
              )}

              {/* 添加待办 */}
              <div className="card p-3">
                <div className="flex w-full gap-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                    placeholder="输入新的待办..."
                    className="input flex-1"
                    aria-label="输入新的待办"
                  />
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button onClick={handleAdd} disabled={!title.trim()} className="btn btn-primary">添加</button>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>按 Enter 快速添加<Tooltip.Arrow className="opacity-40" /></Tooltip.Content>
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
                <div className="card p-4 text-sm opacity-70">
                  暂无待办，输入上方文本并点击“添加”来创建你的第一个待办。
                </div>
              ) : (
                <ul className="w-full space-y-2">
                  {todos.map((t) => (
                    <li key={t.id} className="card flex items-center justify-between px-3 py-2">
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
                          <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>{t.is_complete ? "标记为未完成" : "标记为完成"}<Tooltip.Arrow className="opacity-40" /></Tooltip.Content>
                        </Tooltip.Root>
                        <span className={t.is_complete ? "line-through opacity-60" : ""}>{t.title}</span>
                      </div>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button onClick={() => setDeletingTodo(t)} className="btn btn-danger text-sm">删除</button>
                        </Tooltip.Trigger>
                        <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>删除该待办<Tooltip.Arrow className="opacity-40" /></Tooltip.Content>
                      </Tooltip.Root>
                    </li>
                  ))}
                </ul>
              )}

              {/* 删除确认对话框 */}
              <Dialog.Root open={!!deletingTodo} onOpenChange={(open) => { if (!open) setDeletingTodo(null); }}>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                  <Dialog.Content className="card fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
                    <Dialog.Title className="text-lg font-medium">确认删除</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm opacity-70">该操作不可撤销，是否删除「{deletingTodo?.title}」？</Dialog.Description>
                    <div className="mt-4 flex justify-end gap-2">
                      <Dialog.Close asChild>
                        <button className="btn btn-outline">取消</button>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <button
                          className="btn btn-danger"
                          onClick={() => deletingTodo && removeTodo(deletingTodo.id)}
                        >删除</button>
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