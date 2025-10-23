"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

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
    const { error } = await getSupabase()!
      .from("todos")
      .update({ is_complete: !todo.is_complete })
      .eq("id", todo.id)
      .eq("user_id", session!.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("todos:refresh"));
  };

  const removeTodo = async (id: number) => {
    const { error } = await getSupabase()!
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", session!.user.id);
    if (error) setBanner({ type: "error", text: error.message });
    else window.dispatchEvent(new CustomEvent("todos:refresh"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start gap-6 py-24 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">Todos</h1>
        <div className="flex gap-3">
          <Link href="/" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">返回首页</Link>
          <Link href="/login" className="rounded-md border px-3 py-2 hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] text-black dark:text-zinc-50">登录</Link>
        </div>

        {!isSupabaseConfigured ? (
          <div className="text-zinc-600 dark:text-zinc-400">
            请在项目根目录创建 .env.local 并填入 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启开发服务器。
          </div>
        ) : !session ? (
          <div className="text-zinc-600 dark:text-zinc-400">
            请先登录以查看你的待办。或
            <button
              onClick={() => router.push("/login")}
              className="ml-1 underline underline-offset-4 text-black dark:text-zinc-100"
            >
              立即去登录
            </button>
          </div>
        ) : (
          <>
            {banner && (
              <div className={`w-full max-w-md rounded-md border px-3 py-2 text-sm ${banner.type === "success" ? "border-green-500 text-green-700 dark:text-green-400" : "border-red-500 text-red-700 dark:text-red-400"}`}>
                {banner.text}
              </div>
            )}

            <div className="flex w-full gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="输入新的待办..."
                className="flex-1 rounded-md border px-3 py-2 text-black dark:text-zinc-100 dark:bg-zinc-900"
              />
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="rounded-md bg-foreground px-4 py-2 text-background hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-60"
              >
                添加
              </button>
            </div>

            {loading ? (
              <div className="w-full space-y-2">
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ) : todos.length === 0 ? (
              <div className="text-zinc-600 dark:text-zinc-400">
                暂无待办，输入上方文本并点击“添加”来创建你的第一个待办。
              </div>
            ) : (
              <ul className="w-full space-y-2">
                {todos.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={t.is_complete}
                        onChange={() => toggleComplete(t)}
                      />
                      <span className={t.is_complete ? "line-through text-zinc-500" : ""}>
                        {t.title}
                      </span>
                    </div>
                    <button
                      onClick={() => removeTodo(t.id)}
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