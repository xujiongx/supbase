"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { getSupabase } from "@/lib/supabaseClient";

type Todo = {
  id: number;
  title: string;
  is_complete: boolean;
  created_at: string;
};

type Note = {
  id: number;
  content: string;
  created_at: string;
};

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export default function ZhaomuPage() {
  const { session, isSupabaseConfigured } = useSupabaseSession();
  const [loading, setLoading] = useState({
    todos: false,
    notes: false,
    quote: true,
  });
  const [error, setError] = useState<{
    todos?: string;
    notes?: string;
    quote?: string;
  }>({});

  const [todosToday, setTodosToday] = useState<Todo[]>([]);
  const [notesToday, setNotesToday] = useState<Note[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      return;
    }
    const { startISO, endISO } = getTodayBounds();

    // 今日待办
    (async () => {
      setLoading((l) => ({ ...l, todos: true }));
      const { data, error } = await getSupabase()!
        .from("todos")
        .select("id, title, is_complete, created_at")
        .eq("user_id", session.user.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });
      if (error) setError((e) => ({ ...e, todos: error.message }));
      setTodosToday(Array.isArray(data) ? (data as Todo[]) : []);
      setLoading((l) => ({ ...l, todos: false }));
    })();

    // 今日笔记
    (async () => {
      setLoading((l) => ({ ...l, notes: true }));
      const { data, error } = await getSupabase()!
        .from("daily_notes")
        .select("id, content, created_at")
        .eq("user_id", session.user.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });
      if (error) setError((e) => ({ ...e, notes: error.message }));
      setNotesToday(Array.isArray(data) ? (data as Note[]) : []);
      setLoading((l) => ({ ...l, notes: false }));
    })();
  }, [session, isSupabaseConfigured]);

  const todosCompleted = todosToday.filter((t) => t.is_complete).length;
  const todosTotal = todosToday.length;
  const notesTotal = notesToday.length;

  const todayStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  return (
    <div className="font-sans space-y-8">
      <section className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          今朝
        </h1>
        <p className="text-sm opacity-70">当天信息 · {todayStr}</p>
      </section>

      {/* 配置或登录状态 */}
      {!session ? (
        <div className="card p-4 text-sm opacity-80">
          请先登录以查看你的当天数据。
          <Link href="/login" className="ml-1 underline underline-offset-4">
            立即登录
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* 今日概览：待办 */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <h2 className="text-base md:text-lg font-medium">今日待办</h2>
            </div>
            {loading.todos ? (
              <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
            ) : error.todos ? (
              <div className="card px-3 py-2 text-sm">{error.todos}</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  总数：{todosTotal}，已完成：{todosCompleted}
                </div>
                {todosToday.length > 0 ? (
                  <ul className="space-y-1">
                    {todosToday.slice(0, 5).map((t) => (
                      <li key={t.id} className="text-sm">
                        <span
                          className={
                            t.is_complete ? "line-through opacity-60" : ""
                          }
                        >
                          {t.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm opacity-60">今天还没有待办</div>
                )}
                <Link
                  href="/todos"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  去管理今日待办
                </Link>
              </div>
            )}
          </div>

          {/* 今日概览：笔记 */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <h2 className="text-base md:text-lg font-medium">今日笔记</h2>
            </div>
            {loading.notes ? (
              <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
            ) : error.notes ? (
              <div className="card px-3 py-2 text-sm">{error.notes}</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">新增：{notesTotal} 条</div>
                {notesToday.length > 0 ? (
                  <ul className="space-y-1">
                    {notesToday.slice(0, 3).map((n) => (
                      <li
                        key={n.id}
                        className="text-sm line-clamp-1 opacity-80"
                      >
                        {n.content}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm opacity-60">今天还没有笔记</div>
                )}
                <Link
                  href="/notes"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  去记录今日笔记
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
