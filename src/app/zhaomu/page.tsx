"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { getSupabase } from "@/lib/supabaseClient";
import WeatherCard from "@/components/WeatherCard";
import CalendarCard from "@/components/CalendarCard";
import QRCode from "qrcode";

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

  // 使用独立组件替代内联状态

  // 天气和日历数据已移至独立组件

  const todayStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  // 分享图片：状态与方法
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // 分享链接和二维码
  const [shareUrl, setShareUrl] = useState<string>("");

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 6,
  ) {
    const words = text.split("");
    let line = "";
    let lines = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
        lines++;
        if (lines >= maxLines) break;
      } else {
        line = testLine;
      }
    }
    if (lines < maxLines) ctx.fillText(line, x, y);
  }

  async function generateShareImage() {
    try {
      setShareGenerating(true);
      setShareError(null);
      const width = 1080;
      const height = 1440;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 不支持");

      // 深灰渐变背景（不那么黑、更耐看）
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#141414");
      bgGradient.addColorStop(1, "#0f0f0f");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 白色细边框，保留安全区
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(36, 36, width - 72, height - 72, 16);
      ctx.stroke();

      // 统一安全边距
      const margin = 120;

      // 头部：左侧标题，右侧日期（白字）
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.font = "600 72px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("今朝·今日进度", margin, margin + 40);

      const dateTopStr = new Date().toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "long",
      });
      ctx.textAlign = "right";
      ctx.font = "500 32px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(dateTopStr, width - margin, margin + 40);

      // 头部与内容分隔线（白色低透明）
      ctx.textAlign = "left";
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, margin + 100);
      ctx.lineTo(width - margin, margin + 100);
      ctx.stroke();

      // 内容区域
      const contentX = margin;
      let contentY = margin + 180;
      const contentWidth = width - margin * 2;
      const lineHeight = 72;

      // 待办
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 64px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("待办", contentX, contentY);
      contentY += lineHeight;

      ctx.font = "500 48px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(`完成 ${todosCompleted}/${todosTotal}`, contentX, contentY);
      contentY += Math.round(lineHeight * 0.9);

      // 待办列表
      ctx.font = "500 44px system-ui, -apple-system, Segoe UI, Roboto";
      const todoTextX = contentX + 40;
      const todoLineStep = 64;
      if (todosToday.length > 0) {
        const maxTodoItems = 4;
        todosToday.slice(0, maxTodoItems).forEach((t) => {
          ctx.globalAlpha = t.is_complete ? 0.55 : 1;
          ctx.fillText(t.is_complete ? "✓" : "•", contentX, contentY);
          wrapText(
            ctx,
            t.title,
            todoTextX,
            contentY,
            contentWidth - 60,
            todoLineStep,
            1,
          );
          ctx.globalAlpha = 1;
          contentY += todoLineStep;
        });
      } else {
        ctx.globalAlpha = 0.7;
        ctx.fillText("今天还没有待办", contentX, contentY);
        ctx.globalAlpha = 1;
        contentY += todoLineStep;
      }

      contentY += lineHeight;

      // 笔记
      ctx.font = "600 64px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("笔记", contentX, contentY);
      contentY += lineHeight;

      ctx.font = "500 48px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(`新增 ${notesTotal} 条`, contentX, contentY);
      contentY += Math.round(lineHeight * 0.9);

      ctx.font = "500 44px system-ui, -apple-system, Segoe UI, Roboto";
      const noteTextX = contentX + 40;
      const noteLineStep = 64;
      if (notesToday.length > 0) {
        const maxNoteItems = 3;
        notesToday.slice(0, maxNoteItems).forEach((n) => {
          ctx.fillText("•", contentX, contentY);
          wrapText(
            ctx,
            n.content,
            noteTextX,
            contentY,
            contentWidth - 60,
            noteLineStep,
            1,
          );
          contentY += noteLineStep;
        });
      } else {
        ctx.globalAlpha = 0.7;
        ctx.fillText("今天还没有笔记", contentX, contentY);
        ctx.globalAlpha = 1;
        contentY += noteLineStep;
      }

      // 分享链接
      const shareLink = window.location.href;
      setShareUrl(shareLink);

      // 二维码与签名位置修正：统一按边距锚定
      const qrSize = 180;
      const qrX = width - margin - qrSize;
      const qrY = height - margin - qrSize;

      try {
        const qrCodeUrl = await QRCode.toDataURL(shareLink, {
          width: qrSize,
          margin: 1,
          color: { dark: "#ffffff", light: "#000000" },
        });
        const qrImage = new Image();
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve;
          qrImage.onerror = reject;
          qrImage.src = qrCodeUrl;
        });
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // 标签置于二维码上方，避免触底
        ctx.font = "500 24px system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("扫码访问", qrX + qrSize / 2, qrY - 16);
        ctx.textAlign = "left";
      } catch (qrError) {
        console.error("二维码生成失败", qrError);
      }

      // 签名固定左下角
      ctx.textAlign = "left";
      ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("由 朝暮记 生成", margin, height - margin);

      const url = canvas.toDataURL("image/png");
      setShareImageUrl(url);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setShareGenerating(false);
    }
  }

  function downloadShareImage() {
    if (!shareImageUrl) return;
    const a = document.createElement("a");
    a.href = shareImageUrl;
    a.download = `今朝进度_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  async function copyShareImageToClipboard() {
    if (!shareImageUrl || !("clipboard" in navigator)) return;
    const res = await fetch(shareImageUrl);
    const blob = await res.blob();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    } catch (e) {
      setShareError("复制到剪贴板失败，请尝试下载后手动分享");
    }
  }

  async function copyShareUrlToClipboard() {
    if (!shareUrl || !("clipboard" in navigator)) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // 显示成功消息
      setShareError(null);
      alert("已复制链接到剪贴板");
    } catch (e) {
      // 显示错误消息
      setShareError(
        "复制链接失败：" + (e instanceof Error ? e.message : "未知错误"),
      );
    }
  }

  async function systemShareImage() {
    if (!shareImageUrl || !("share" in navigator)) return;
    const res = await fetch(shareImageUrl);
    const blob = await res.blob();
    const file = new File(
      [blob],
      `今朝进度_${new Date().toISOString().slice(0, 10)}.png`,
      {
        type: "image/png",
      },
    );
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      setShareError("当前设备不支持图片分享，请下载图片后手动分享");
      return;
    }
    try {
      await navigator.share({ files: [file], title: "今朝 · 今日进度" });
    } catch {
      // 用户取消或失败，无需处理
    }
  }

  return (
    <div className="font-sans space-y-8">
      <section className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          今朝
        </h1>
        <p className="text-sm opacity-70">当天信息 · {todayStr}</p>
      </section>

      {/* 顶部：天气与万年历（对所有用户可见） */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* 今日天气 */}
        <WeatherCard />

        {/* 今日万年历/节气 */}
        <CalendarCard />
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

      {/* 分享区块：生成图片用于社交平台分享 */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📣</span>
            <h2 className="text-base md:text-lg font-medium">分享今日进度</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateShareImage}
              disabled={shareGenerating}
              className="btn btn-primary"
            >
              {shareGenerating ? "生成中..." : "生成分享图片"}
            </button>
            <button
              onClick={downloadShareImage}
              disabled={!shareImageUrl}
              className="btn btn-outline"
            >
              下载图片
            </button>
          </div>
        </div>
        {shareError && (
          <div className="card px-3 py-2 text-sm">{shareError}</div>
        )}
        {shareImageUrl ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-4">
              <img
                src={shareImageUrl}
                alt="今日进度分享图片预览"
                className="w-full max-w-xl rounded-md border"
              />
              {shareUrl && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-600">分享链接：{shareUrl}</p>
                  <button
                    onClick={copyShareUrlToClipboard}
                    className="btn btn-sm btn-outline w-fit"
                  >
                    复制链接
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyShareImageToClipboard}
                className="btn btn-outline"
              >
                复制到剪贴板
              </button>
              <button onClick={systemShareImage} className="btn btn-outline">
                通过系统分享
              </button>
              <button onClick={downloadShareImage} className="btn btn-outline">
                下载图片
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-60">
            生成后将显示预览，并可下载或直接分享。
          </div>
        )}
      </section>
    </div>
  );
}
