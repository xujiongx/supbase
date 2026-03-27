"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import {
  formatDateKey,
  dateKeyFromISO,
  getMonthGridCells,
  getWeekdayLabels,
  getWeekDays,
  weekRangeBounds,
} from "@/lib/boardCalendar";
import BoardDayCell, {
  type BoardNote,
  type BoardTodo,
} from "@/components/kanban/BoardDayCell";

type Mode = "week" | "month";

function useBoardData(
  session: ReturnType<typeof useSupabaseSession>["session"],
  rangeStart: Date,
  rangeEnd: Date,
  enabled: boolean,
) {
  const [todos, setTodos] = useState<BoardTodo[]>([]);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!enabled || !session) {
        setTodos([]);
        setNotes([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const startISO = rangeStart.toISOString();
        const endISO = rangeEnd.toISOString();
        const client = getSupabase()!;

        const [tRes, nRes] = await Promise.all([
          client
            .from("todos")
            .select("id, title, is_complete, created_at")
            .eq("user_id", session.user.id)
            .gte("created_at", startISO)
            .lte("created_at", endISO)
            .order("created_at", { ascending: false }),
          client
            .from("daily_notes")
            .select("id, content, created_at")
            .eq("user_id", session.user.id)
            .gte("created_at", startISO)
            .lte("created_at", endISO)
            .order("created_at", { ascending: false }),
        ]);

        if (tRes.error) console.error(tRes.error);
        if (nRes.error) console.error(nRes.error);
        setTodos((tRes.data as BoardTodo[]) ?? []);
        setNotes((nRes.data as BoardNote[]) ?? []);
      } finally {
        setLoading(false);
      }
    },
    [enabled, session, rangeStart, rangeEnd],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load(true);
    };
    window.addEventListener("todos:refresh", onRefresh);
    window.addEventListener("notes:refresh", onRefresh);
    return () => {
      window.removeEventListener("todos:refresh", onRefresh);
      window.removeEventListener("notes:refresh", onRefresh);
    };
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, { todos: BoardTodo[]; notes: BoardNote[] }>();
    for (const t of todos) {
      const k = dateKeyFromISO(t.created_at);
      const row = map.get(k) ?? { todos: [], notes: [] };
      row.todos.push(t);
      map.set(k, row);
    }
    for (const n of notes) {
      const k = dateKeyFromISO(n.created_at);
      const row = map.get(k) ?? { todos: [], notes: [] };
      row.notes.push(n);
      map.set(k, row);
    }
    for (const [, v] of map) {
      v.todos.sort((a, b) => b.id - a.id);
      v.notes.sort((a, b) => b.id - a.id);
    }
    return map;
  }, [todos, notes]);

  return { loading, byDay };
}

export default function KanbanPage() {
  const { session, isSupabaseConfigured } = useSupabaseSession();
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekRangeBounds(weekDays),
    [weekDays],
  );

  const monthY = anchor.getFullYear();
  const monthM = anchor.getMonth();
  const monthCells = useMemo(
    () => getMonthGridCells(monthY, monthM),
    [monthY, monthM],
  );

  const monthBounds = useMemo(() => {
    const first = monthCells[0].date;
    const last = monthCells[monthCells.length - 1].date;
    const s = new Date(first);
    s.setHours(0, 0, 0, 0);
    const e = new Date(last);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }, [monthCells]);

  const rangeStart = mode === "week" ? weekStart : monthBounds.start;
  const rangeEnd = mode === "week" ? weekEnd : monthBounds.end;

  const { loading, byDay } = useBoardData(
    session,
    rangeStart,
    rangeEnd,
    !!session && isSupabaseConfigured,
  );

  const shiftWeek = (delta: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + delta * 7);
    setAnchor(d);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(monthY, monthM + delta, 1);
    setAnchor(d);
  };

  const goToday = () => setAnchor(new Date());

  const monthTitle = `${monthY}年${monthM + 1}月`;
  const weekTitle = `${formatDateKey(weekDays[0])} ～ ${formatDateKey(weekDays[6])}`;

  const labels = getWeekdayLabels();

  return (
    <div className="page-shell font-sans">
      <main className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-[color-mix(in_srgb,var(--muted)_45%,transparent)]">
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <h1 className="page-title">看板</h1>
          </div>
          <p className="page-lede max-w-none">
            按周或按月查看格子；在对应日期下添加待办与笔记（写入该日时间管理，便于回顾）。
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div
              className="time-filter-bar w-full sm:w-fit"
              role="tablist"
              aria-label="看板视图"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "week" ? "true" : "false"}
                className={
                  mode === "week"
                    ? "btn btn-primary min-h-10 flex-1 touch-manipulation border-transparent sm:min-h-0 sm:flex-initial"
                    : "btn btn-ghost min-h-10 flex-1 touch-manipulation border-transparent sm:min-h-0 sm:flex-initial"
                }
                onClick={() => setMode("week")}
              >
                每周
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "month" ? "true" : "false"}
                className={
                  mode === "month"
                    ? "btn btn-primary min-h-10 flex-1 touch-manipulation border-transparent sm:min-h-0 sm:flex-initial"
                    : "btn btn-ghost min-h-10 flex-1 touch-manipulation border-transparent sm:min-h-0 sm:flex-initial"
                }
                onClick={() => setMode("month")}
              >
                每月
              </button>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-start">
              {mode === "week" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center p-0 [-webkit-tap-highlight-color:transparent] sm:h-9 sm:w-9"
                    onClick={() => shiftWeek(-1)}
                    aria-label="上一周"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                  <span className="min-w-0 flex-1 text-center text-xs tabular-nums text-muted-foreground sm:min-w-48 sm:text-sm">
                    {weekTitle}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center p-0 [-webkit-tap-highlight-color:transparent] sm:h-9 sm:w-9"
                    onClick={() => shiftWeek(1)}
                    aria-label="下一周"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center p-0 [-webkit-tap-highlight-color:transparent] sm:h-9 sm:w-9"
                    onClick={() => shiftMonth(-1)}
                    aria-label="上一月"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                  <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-24">
                    {monthTitle}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center p-0 [-webkit-tap-highlight-color:transparent] sm:h-9 sm:w-9"
                    onClick={() => shiftMonth(1)}
                    aria-label="下一月"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-outline min-h-10 flex-1 touch-manipulation px-3 sm:min-h-9 sm:flex-initial"
                onClick={goToday}
              >
                今天
              </button>
            </div>
          </div>
        </header>

        {!session ? (
          <div className="card card-interactive p-5 text-sm text-muted-foreground">
            请先
            <Link href="/login" className="link-inline mx-1">
              登录
            </Link>
            后使用看板；数据与每日待办、每日笔记互通。
          </div>
        ) : null}

        {session && !isSupabaseConfigured ? (
          <div className="banner banner-error text-sm">
            请配置 Supabase 环境变量后刷新页面。
          </div>
        ) : null}

        {loading && session && mode === "week" ? (
          <>
            <div className="flex animate-pulse flex-col gap-3 md:hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-md border border-subtle bg-muted"
                />
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] md:gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 rounded-lg border border-subtle bg-muted"
                />
              ))}
            </div>
          </>
        ) : null}

        {loading && session && mode === "month" ? (
          <>
            <div className="flex animate-pulse flex-col gap-3 md:hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-lg border border-subtle bg-muted"
                />
              ))}
            </div>
            <div className="hidden animate-pulse gap-2 md:grid md:grid-cols-7 md:gap-3">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square min-h-[7.5rem] rounded-md border border-subtle bg-muted md:min-h-32"
                />
              ))}
            </div>
          </>
        ) : null}

        {!loading && session && mode === "week" ? (
          <div className="space-y-2">
            <div className="flex flex-col gap-3 md:hidden">
              {weekDays.map((d) => {
                const k = formatDateKey(d);
                const bundle = byDay.get(k) ?? { todos: [], notes: [] };
                return (
                  <BoardDayCell
                    key={k}
                    date={d}
                    inMonth
                    todos={bundle.todos}
                    notes={bundle.notes}
                    session={session}
                    compact={false}
                    weekStacked
                  />
                );
              })}
            </div>
            <div className="hidden md:grid md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] md:gap-3">
              {weekDays.map((d) => {
                const k = formatDateKey(d);
                const bundle = byDay.get(k) ?? { todos: [], notes: [] };
                return (
                  <BoardDayCell
                    key={k}
                    date={d}
                    inMonth
                    todos={bundle.todos}
                    notes={bundle.notes}
                    session={session}
                    compact={false}
                    weekStacked
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {!loading && session && mode === "month" ? (
          <>
            {/* 小屏：当月按日纵向卡片，避免 7 列挤压与按钮重叠 */}
            <div className="flex flex-col gap-3 md:hidden">
              <p className="text-xs text-muted-foreground">
                {monthTitle} · 共{" "}
                {monthCells.filter((c) => c.inMonth).length} 天
              </p>
              {monthCells
                .filter((c) => c.inMonth)
                .map(({ date: d }) => {
                  const k = formatDateKey(d);
                  const bundle = byDay.get(k) ?? { todos: [], notes: [] };
                  return (
                    <BoardDayCell
                      key={k}
                      date={d}
                      inMonth
                      todos={bundle.todos}
                      notes={bundle.notes}
                      session={session}
                      weekStacked
                    />
                  );
                })}
            </div>

            <div className="hidden space-y-2 md:block">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
                {labels.map((lb) => (
                  <div key={lb} className="py-1">
                    {lb}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {monthCells.map(({ date: d, inMonth }) => {
                  const k = formatDateKey(d);
                  const bundle = byDay.get(k) ?? { todos: [], notes: [] };
                  return (
                    <BoardDayCell
                      key={k}
                      date={d}
                      inMonth={inMonth}
                      todos={bundle.todos}
                      notes={bundle.notes}
                      session={session}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
