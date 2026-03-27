"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Eye, Plus, StickyNote, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { boardDayNoonISO, formatDateKey } from "@/lib/boardCalendar";

export type BoardTodo = {
  id: number;
  title: string;
  is_complete: boolean;
  created_at: string;
};

export type BoardNote = {
  id: number;
  content: string;
  created_at: string;
};

type Props = {
  date: Date;
  inMonth: boolean;
  todos: BoardTodo[];
  notes: BoardNote[];
  session: Session | null;
  compact?: boolean;
  /** 移动端「每周」纵列为整宽卡片时的舒适布局 */
  weekStacked?: boolean;
};

function firstLine(text: string, max = 48) {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  return line.length > max ? line.slice(0, max) + "…" : line;
}

export default function BoardDayCell({
  date,
  inMonth,
  todos,
  notes,
  session,
  compact = false,
  weekStacked = false,
}: Props) {
  const dateKey = formatDateKey(date);
  const rootRef = useRef<HTMLDivElement>(null);
  const [todoDraft, setTodoDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNote, setEditingNote] = useState<BoardNote | null>(null);
  const [previewNote, setPreviewNote] = useState<BoardNote | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<BoardTodo | null>(null);
  const [todoQuickOpen, setTodoQuickOpen] = useState(false);
  const noteAreaRef = useRef<HTMLTextAreaElement>(null);
  const todoQuickInputRef = useRef<HTMLInputElement>(null);

  const canEdit = !!session && isSupabaseConfigured && inMonth;
  const mutedCell = !inMonth;

  const scrollCellIntoView = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
  }, []);

  useEffect(() => {
    if (!noteOpen) return;
    const id = window.requestAnimationFrame(() => {
      noteAreaRef.current?.focus();
      try {
        const len = noteAreaRef.current?.value.length ?? 0;
        noteAreaRef.current?.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [noteOpen]);

  useEffect(() => {
    if (!todoQuickOpen) return;
    const id = window.requestAnimationFrame(() => todoQuickInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [todoQuickOpen]);

  useEffect(() => {
    if (noteOpen) scrollCellIntoView();
  }, [noteOpen, scrollCellIntoView]);

  useEffect(() => {
    if (todoQuickOpen) scrollCellIntoView();
  }, [todoQuickOpen, scrollCellIntoView]);

  useEffect(() => {
    if (previewNote) scrollCellIntoView();
  }, [previewNote, scrollCellIntoView]);

  useEffect(() => {
    if (deletingTodo) scrollCellIntoView();
  }, [deletingTodo, scrollCellIntoView]);

  const addTodo = async () => {
    const t = todoDraft.trim();
    if (!t || !session || !canEdit) return;
    const { error } = await getSupabase()!.from("todos").insert({
      title: t,
      user_id: session.user.id,
      created_at: boardDayNoonISO(date),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTodoDraft("");
    setTodoQuickOpen(false);
    toast.success("已添加待办");
    window.dispatchEvent(new CustomEvent("todos:refresh"));
  };

  const toggleTodo = async (row: BoardTodo) => {
    if (!session || !canEdit) return;
    const { error } = await getSupabase()!
      .from("todos")
      .update({ is_complete: !row.is_complete })
      .eq("id", row.id)
      .eq("user_id", session.user.id);
    if (error) toast.error(error.message);
    else {
      window.dispatchEvent(new CustomEvent("todos:refresh"));
    }
  };

  const removeTodo = async (id: number) => {
    if (!session) return;
    const { error } = await getSupabase()!
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("已删除");
      window.dispatchEvent(new CustomEvent("todos:refresh"));
    }
    setDeletingTodo(null);
  };

  const saveNote = async () => {
    const c = noteDraft.trim();
    if (!c || !session || !canEdit) return;
    if (editingNote) {
      const { error } = await getSupabase()!
        .from("daily_notes")
        .update({ content: c })
        .eq("id", editingNote.id)
        .eq("user_id", session.user.id);
      if (error) toast.error(error.message);
      else {
        toast.success("已保存");
        setNoteOpen(false);
        setEditingNote(null);
        setNoteDraft("");
        window.dispatchEvent(new CustomEvent("notes:refresh"));
      }
    } else {
      const { error } = await getSupabase()!.from("daily_notes").insert({
        content: c,
        user_id: session.user.id,
        created_at: boardDayNoonISO(date),
      });
      if (error) toast.error(error.message);
      else {
        toast.success("已添加笔记");
        setNoteOpen(false);
        setNoteDraft("");
        window.dispatchEvent(new CustomEvent("notes:refresh"));
      }
    }
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteDraft("");
    setNoteOpen(true);
  };

  const openEditNote = (n: BoardNote) => {
    setEditingNote(n);
    setNoteDraft(n.content);
    setNoteOpen(true);
  };

  const weekShort = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  const dayNum = date.getDate();

  const padClass = compact
    ? "p-2.5 max-sm:p-2 sm:p-2.5"
    : weekStacked
      ? "p-4 md:p-4"
      : "p-2 sm:p-3";

  const listMaxH = compact
    ? "min-h-32 max-h-60 sm:max-h-52"
    : weekStacked
      ? "min-h-52 max-h-[min(52vh,28rem)] md:min-h-56 md:max-h-[min(64vh,38rem)]"
      : "min-h-44 max-h-[min(48vh,24rem)] sm:max-h-[min(52vh,28rem)]";

  return (
    <div
      ref={rootRef}
      data-board-day={dateKey}
      className={[
        "flex min-h-0 min-w-0 flex-col rounded-lg border transition-[border-color,background-color] duration-150",
        weekStacked ? "min-h-[19rem] w-full md:min-h-[20rem]" : "",
        compact ? "min-h-0" : "",
        mutedCell
          ? "border-transparent bg-[color-mix(in_srgb,var(--muted)_25%,transparent)] opacity-60"
          : "border-subtle bg-background active:border-foreground/40 md:hover:border-foreground",
        padClass,
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
      ].join(" ")}
    >
      <div
        className={[
          "mb-2 flex shrink-0 items-baseline justify-between gap-2 border-b border-subtle pb-2",
          compact ? "text-[11px] sm:text-xs" : "text-sm sm:text-sm",
        ].join(" ")}
      >
        <span
          className={
            inMonth ? "font-semibold tabular-nums" : "tabular-nums text-muted-foreground"
          }
        >
          {compact ? (
            <>
              <span className="text-muted-foreground">周{weekShort}</span> · {dayNum}
            </>
          ) : (
            <>
              {date.getMonth() + 1} 月 {dayNum} 日{" "}
              <span className="font-normal text-muted-foreground">
                周{weekShort}
              </span>
            </>
          )}
        </span>
        {!mutedCell ? (
          <span className="hidden font-mono text-[0.65rem] text-muted-foreground opacity-70 sm:inline">
            {dateKey.slice(5)}
          </span>
        ) : null}
      </div>

      <ul
        className={[
          "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
          listMaxH,
        ].join(" ")}
      >
        {todos.map((t) => (
          <li
            key={`t-${t.id}`}
            className="flex items-start gap-2 rounded-md px-0.5 py-0.5 active:bg-[color-mix(in_srgb,var(--muted)_45%,transparent)]"
          >
            <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center self-start touch-manipulation">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 rounded border-subtle accent-foreground"
                checked={t.is_complete}
                disabled={!canEdit}
                onChange={() => canEdit && toggleTodo(t)}
                aria-label={t.title}
              />
            </label>
            <span
              className={[
                "min-w-0 flex-1 break-words py-2 leading-snug [overflow-wrap:anywhere]",
                compact ? "text-xs sm:text-xs" : "text-sm sm:text-sm",
                t.is_complete ? "text-muted-foreground line-through" : "",
              ].join(" ")}
            >
              {t.title}
            </span>
            {canEdit ? (
              <button
                type="button"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-lg leading-none text-muted-foreground touch-manipulation active:bg-muted"
                onClick={() => setDeletingTodo(t)}
                aria-label={`删除「${t.title}」`}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
        {notes.map((n) => (
          <li key={`n-${n.id}`} className="flex min-w-0 items-stretch gap-1">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && openEditNote(n)}
              className={[
                "min-h-10 min-w-0 flex-1 break-words rounded-md border border-dashed border-subtle px-2.5 py-2 text-left leading-snug touch-manipulation [overflow-wrap:anywhere] active:bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] disabled:cursor-default disabled:opacity-70 sm:min-h-11 sm:px-3 sm:py-2.5",
                compact ? "text-xs sm:text-xs" : "text-sm sm:text-sm",
              ].join(" ")}
            >
              <span className="text-muted-foreground">※ </span>
              {firstLine(n.content, compact ? 52 : 56) || "（空）"}
            </button>
            <button
              type="button"
              className="btn btn-ghost flex min-h-10 w-9 shrink-0 touch-manipulation items-center justify-center rounded-md border border-dashed border-subtle p-0 sm:min-h-11 sm:w-10"
              aria-label="Markdown 预览"
              title="预览"
              onClick={(e) => {
                e.preventDefault();
                setPreviewNote(n);
              }}
            >
              <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="mt-2 flex shrink-0 items-center justify-end gap-1 border-t border-subtle pt-2">
          <button
            type="button"
            className="btn btn-ghost flex h-10 w-10 touch-manipulation items-center justify-center rounded-md p-0 sm:h-9 sm:w-9"
            aria-label="添加待办"
            title="添加待办"
            onClick={() => setTodoQuickOpen(true)}
          >
            <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-ghost flex h-10 w-10 touch-manipulation items-center justify-center rounded-md p-0 sm:h-9 sm:w-9"
            aria-label="写笔记"
            title="写笔记（Markdown）"
            onClick={openNewNote}
          >
            <StickyNote className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : inMonth ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {!session ? "登录后可编辑" : !isSupabaseConfigured ? "未配置 Supabase" : null}
        </p>
      ) : null}

      <Dialog.Root open={!!deletingTodo} onOpenChange={(o) => !o && setDeletingTodo(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 z-100 bg-black/50" />
          <Dialog.Content
            className="card board-dialog-panel board-dialog-panel--sm border-subtle shadow-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-semibold">删除待办</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-ghost -mr-1 -mt-1 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md p-0 sm:hidden"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              确定删除「{deletingTodo?.title}」？
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-outline min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto">
                  取消
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-danger min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                  onClick={() => deletingTodo && removeTodo(deletingTodo.id)}
                >
                  删除
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={todoQuickOpen}
        onOpenChange={(open) => {
          setTodoQuickOpen(open);
          if (!open) setTodoDraft("");
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 z-100 bg-black/50" />
          <Dialog.Content
            className="card board-dialog-panel board-dialog-panel--sm border-subtle shadow-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-semibold">添加待办 · {dateKey}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-ghost -mr-1 -mt-1 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md p-0 sm:hidden"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <input
              ref={todoQuickInputRef}
              value={todoDraft}
              onChange={(e) => setTodoDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo();
              }}
              placeholder="待办标题…"
              className="input mt-4 min-h-11 w-full text-base sm:text-sm"
              aria-label="待办标题"
              enterKeyHint="done"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-outline min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto">
                  取消
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="btn btn-primary min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                disabled={!todoDraft.trim()}
                onClick={addTodo}
              >
                添加
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!previewNote} onOpenChange={(o) => !o && setPreviewNote(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 z-100 bg-black/50" />
          <Dialog.Content
            className="card board-dialog-panel border-subtle shadow-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="pr-2 text-base font-semibold leading-snug">
                笔记预览 · {dateKey}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-ghost -mr-1 -mt-1 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md p-0 sm:hidden"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <div className="prose prose-sm prose-zinc dark:prose-invert mt-4 max-h-[min(65dvh,32rem)] max-w-none overflow-y-auto overscroll-contain pr-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewNote?.content ?? ""}
              </ReactMarkdown>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-outline min-h-10 touch-manipulation sm:min-h-9">
                  关闭
                </button>
              </Dialog.Close>
              {previewNote && canEdit ? (
                <button
                  type="button"
                  className="btn btn-primary min-h-10 touch-manipulation sm:min-h-9"
                  onClick={() => {
                    const row = previewNote;
                    setPreviewNote(null);
                    openEditNote(row);
                  }}
                >
                  编辑
                </button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={noteOpen}
        onOpenChange={(open) => {
          setNoteOpen(open);
          if (!open) {
            setEditingNote(null);
            setNoteDraft("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-animate fixed inset-0 z-100 bg-black/50" />
          <Dialog.Content
            className="card board-dialog-panel border-subtle shadow-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="pr-2 text-base font-semibold leading-snug">
                {editingNote ? "编辑笔记" : "新建笔记"} · {dateKey}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-ghost -mr-1 -mt-1 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md p-0 sm:hidden"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-3">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-muted-foreground">编辑</p>
                <textarea
                  ref={noteAreaRef}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="input min-h-40 w-full resize-y text-base sm:min-h-52 sm:text-sm"
                  placeholder="支持 Markdown（GFM）…"
                  aria-label="笔记内容"
                />
              </div>
              <div className="min-h-0 min-w-0 rounded-md border border-dashed border-subtle bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-3 sm:min-h-52 sm:p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">预览</p>
                <div className="prose prose-sm prose-zinc dark:prose-invert max-h-[min(42dvh,18rem)] max-w-none overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(50vh,22rem)]">
                  {noteDraft.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {noteDraft}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无内容</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-outline min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto">
                  取消
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="btn btn-primary min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                disabled={!noteDraft.trim()}
                onClick={saveNote}
              >
                保存
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
