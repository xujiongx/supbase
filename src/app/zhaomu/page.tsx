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

  // 新增：天气与万年历数据状态
  const [weather, setWeather] = useState<{
    temp?: string;
    feelsLike?: string;
    text?: string;
    windDir?: string;
    windScale?: string;
    windSpeed?: string;
    humidity?: string;
    precip?: string;
    pressure?: string;
    vis?: string;
    cloud?: string;
    dew?: string;
    obsTime?: string;
    updateTime?: string;
    fxLink?: string;
  } | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loadingExtra, setLoadingExtra] = useState({
    weather: false,
    calendar: false,
  });
  const [errorExtra, setErrorExtra] = useState<{
    weather?: string;
    calendar?: string;
  }>({});

  // 拉取天气与万年历（不依赖登录）
  useEffect(() => {
    const getCoords = (): Promise<{ lat: number; lon: number } | null> => {
      return new Promise((resolve) => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
          resolve(null);
          return;
        }
        const geo = navigator.geolocation;
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, 5000);
        geo.getCurrentPosition(
          (pos) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            const { latitude, longitude } = pos.coords || {};
            if (
              typeof latitude === "number" &&
              typeof longitude === "number" &&
              Number.isFinite(latitude) &&
              Number.isFinite(longitude)
            ) {
              resolve({ lat: latitude, lon: longitude });
            } else {
              resolve(null);
            }
          },
          () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 4500, maximumAge: 600000 },
        );
      });
    };

    const fetchWeather = async (coords?: { lat: number; lon: number }) => {
      setLoadingExtra((l) => ({ ...l, weather: true }));
      try {
        const params = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";
        const res = await fetch(`/api/qweather${params}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setWeather({
          ...json.now,
          updateTime: json.updateTime,
          fxLink: json.fxLink,
        });
      } catch (e) {
        setErrorExtra((er) => ({
          ...er,
          weather: e instanceof Error ? e.message : "天气获取失败",
        }));
      } finally {
        setLoadingExtra((l) => ({ ...l, weather: false }));
      }
    };

    const fetchCalendar = async () => {
      setLoadingExtra((l) => ({ ...l, calendar: true }));
      try {
        const res = await fetch("/api/calendar");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setCalendar(json);
      } catch (e) {
        setErrorExtra((er) => ({
          ...er,
          calendar: e instanceof Error ? e.message : "万年历获取失败",
        }));
      } finally {
        setLoadingExtra((l) => ({ ...l, calendar: false }));
      }
    };

    (async () => {
      const coords = await getCoords().catch(() => null);
      await fetchWeather(coords ?? undefined);
      fetchCalendar();
    })();
  }, []);

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

      // 背景渐变
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#111827");
      grad.addColorStop(1, "#1f2937");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 标题
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("今朝·今日进度", 60, 120);

      // 日期
      ctx.font = "500 36px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText(todayStr, 60, 175);

      // 分割线
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 200);
      ctx.lineTo(width - 60, 200);
      ctx.stroke();

      // 天气
      ctx.font = "500 36px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#ffffff";
      const weatherTitleY = 270;
      ctx.fillText("天气", 60, weatherTitleY);
      ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto";
      const weatherText = weather
        ? `${weather.text ?? "-"} ${weather.temp ?? "-"}℃ 体感 ${
            weather.feelsLike ?? "-"
          }℃ 风向 ${weather.windDir ?? "-"} 风力 ${weather.windScale ?? "-"}`
        : "暂无天气信息";
      wrapText(ctx, weatherText, 60, weatherTitleY + 48, width - 120, 44, 2);

      // 万年历
      const calBaseY = weatherTitleY + 150;
      ctx.font = "500 36px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("万年历", 60, calBaseY);
      ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto";
      const lunarLine = calendar?.lunarText
        ? `农历：${calendar.lunarText}`
        : calendar?.lunar
        ? `农历：${calendar.lunar?.cnYear ?? ""}年 ${
            calendar.lunar?.cnMonth ?? ""
          }${calendar.lunar?.cnDay ?? ""}`
        : "农历：-";
      wrapText(ctx, lunarLine, 60, calBaseY + 48, width - 120, 44, 2);
      if (calendar?.cyclical) {
        const cyc = `干支：${calendar.cyclical.year ?? "-"}年 ${
          calendar.cyclical.month ?? "-"
        }月 ${calendar.cyclical.day ?? "-"}日`;
        wrapText(ctx, cyc, 60, calBaseY + 96, width - 120, 44, 1);
      }
      if (calendar?.almanacSummary) {
        const summ = `宜：${calendar.almanacSummary.yi ?? "-"}；忌：${
          calendar.almanacSummary.ji ?? "-"
        }`;
        wrapText(ctx, summ, 60, calBaseY + 144, width - 120, 44, 2);
      }

      // 待办
      const todosBaseY = calBaseY + 240;
      ctx.font = "500 36px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("待办", 60, todosBaseY);
      ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto";
      const todosLine = `完成 ${todosCompleted}/${todosTotal}`;
      ctx.fillText(todosLine, 60, todosBaseY + 48);
      const listTodos = todosToday.slice(0, 5);
      ctx.font = "400 30px system-ui, -apple-system, Segoe UI, Roboto";
      let yTodo = todosBaseY + 92;
      listTodos.forEach((t) => {
        const prefix = t.is_complete ? "✅ " : "• ";
        wrapText(ctx, prefix + t.title, 60, yTodo, width - 120, 42, 2);
        yTodo += 60;
      });
      if (listTodos.length === 0) {
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("今天还没有待办", 60, yTodo);
        ctx.fillStyle = "#ffffff";
      }

      // 笔记
      const notesBaseY = todosBaseY + 420;
      ctx.font = "500 36px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("笔记", 60, notesBaseY);
      ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto";
      const notesLine = `新增 ${notesTotal} 条`;
      ctx.fillText(notesLine, 60, notesBaseY + 48);
      const listNotes = notesToday.slice(0, 3);
      ctx.font = "400 30px system-ui, -apple-system, Segoe UI, Roboto";
      let yNote = notesBaseY + 92;
      listNotes.forEach((n) => {
        wrapText(ctx, "• " + n.content, 60, yNote, width - 120, 42, 2);
        yNote += 60;
      });
      if (listNotes.length === 0) {
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("今天还没有笔记", 60, yNote);
        ctx.fillStyle = "#ffffff";
      }

      // 署名
      ctx.font = "400 28px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("由 朝暮记 生成", 60, height - 60);

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
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (e) {
      setShareError("复制到剪贴板失败，请尝试下载后手动分享");
    }
  }

  async function systemShareImage() {
    if (!shareImageUrl || !("share" in navigator)) return;
    const res = await fetch(shareImageUrl);
    const blob = await res.blob();
    const file = new File([blob], `今朝进度_${new Date().toISOString().slice(0, 10)}.png`, {
      type: "image/png",
    });
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
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h2 className="text-base md:text-lg font-medium">今日天气</h2>
          </div>
          {loadingExtra.weather ? (
            <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
          ) : errorExtra.weather ? (
            <div className="card px-3 py-2 text-sm">{errorExtra.weather}</div>
          ) : weather ? (
            <div className="text-sm space-y-1">
              <div>
                温度：{weather.temp}℃，体感：{weather.feelsLike}℃，天气：
                {weather.text}
              </div>
              <div>
                风向：{weather.windDir}，风力：{weather.windScale}级
                {weather.windSpeed ? `，风速：${weather.windSpeed} km/h` : ""}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {weather.humidity && <div>湿度：{weather.humidity}%</div>}
                {weather.pressure && <div>气压：{weather.pressure} hPa</div>}
                {weather.precip && <div>降水：{weather.precip} mm</div>}
                {weather.vis && <div>能见度：{weather.vis} km</div>}
                {weather.cloud && <div>云量：{weather.cloud}%</div>}
                {weather.dew && <div>露点：{weather.dew}℃</div>}
              </div>
              {weather.obsTime && (
                <div className="opacity-60">观测：{weather.obsTime}</div>
              )}
              {weather.updateTime && (
                <div className="opacity-60">更新：{weather.updateTime}</div>
              )}
              {weather.fxLink && (
                <div>
                  <a
                    href={weather.fxLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                    aria-label="在和风天气查看详情"
                  >
                    在和风天气查看详情
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm opacity-60">暂无天气信息</div>
          )}
        </div>

        {/* 今日万年历/节气 */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="text-base md:text-lg font-medium">
              今日万年历/节气
            </h2>
          </div>
          {loadingExtra.calendar ? (
            <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
          ) : errorExtra.calendar ? (
            <div className="card px-3 py-2 text-sm">{errorExtra.calendar}</div>
          ) : calendar ? (
            <div className="text-sm space-y-1">
              {calendar.date && (
                <div>
                  日期：{calendar.date}（{calendar.week}）
                  {calendar.enWeek ? ` / ${calendar.enWeek}` : ""}
                </div>
              )}
              {(calendar.lunarText || calendar?.lunar) && (
                <div>
                  农历：
                  {calendar.lunarText ||
                    `${calendar?.lunar?.cnYear}年 ${calendar?.lunar?.cnMonth}${calendar?.lunar?.cnDay}`} {" "}
                  {calendar?.lunar?.hour ? `（${calendar.lunar.hour}）` : ""}
                </div>
              )}
              {calendar?.lunar?.zodiac && (
                <div>生肖：{calendar?.lunar?.zodiac}</div>
              )}
              {calendar.astro && <div>星座：{calendar.astro}</div>}
              {calendar.cyclical && (
                <div>
                  干支：{calendar.cyclical.year}年 {calendar.cyclical.month}月 {" "}
                  {calendar.cyclical.day}日
                </div>
              )}
              {calendar.enMonth && <div>英文月份：{calendar.enMonth}</div>}
              {typeof calendar?.dayInYear === "number" &&
                typeof calendar?.weekInYear === "number" && (
                  <div>
                    本年第 {calendar.dayInYear} 天，第 {calendar.weekInYear} 周
                    {calendar.julianDay
                      ? `；儒略日：${calendar.julianDay}`
                      : ""}
                  </div>
                )}
              {calendar.festivals && calendar.festivals.length > 0 && (
                <div>节日：{calendar.festivals.join("、")}</div>
              )}
              {calendar?.lunar && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {calendar.lunar.yuexiang && (
                    <div>月相：{calendar.lunar.yuexiang}</div>
                  )}
                  {calendar.lunar.wuhou && (
                    <div>物候：{calendar.lunar.wuhou}</div>
                  )}
                  {calendar.lunar.shujiu && (
                    <div>数九：{calendar.lunar.shujiu}</div>
                  )}
                  {calendar.lunar.sanfu && (
                    <div>三伏：{calendar.lunar.sanfu}</div>
                  )}
                </div>
              )}
              {calendar.almanac && (
                <div className="space-y-1">
                  <div>
                    宜：{calendar.almanac.yi}；忌：{calendar.almanac.ji}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {calendar.almanac.chong && (
                      <div>冲：{calendar.almanac.chong}</div>
                    )}
                    {calendar.almanac.sha && (
                      <div>煞：{calendar.almanac.sha}</div>
                    )}
                    {calendar.almanac.nayin && (
                      <div>纳音：{calendar.almanac.nayin}</div>
                    )}
                    {calendar.almanac.shiershen && (
                      <div>十二神：{calendar.almanac.shiershen}</div>
                    )}
                    {calendar.almanac.xingxiu && (
                      <div>星宿：{calendar.almanac.xingxiu}</div>
                    )}
                    {calendar.almanac.zheng && (
                      <div>值日星：{calendar.almanac.zheng}</div>
                    )}
                    {calendar.almanac.shou && (
                      <div>值日神：{calendar.almanac.shou}</div>
                    )}
                    {calendar.almanac.liuyao && (
                      <div>六曜：{calendar.almanac.liuyao}</div>
                    )}
                    {calendar.almanac.jiuxing && (
                      <div>九星：{calendar.almanac.jiuxing}</div>
                    )}
                    {calendar.almanac.taisui && (
                      <div>太岁方位：{calendar.almanac.taisui}</div>
                    )}
                  </div>
                  {calendar.almanac.jishenfangwei && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {calendar.almanac.jishenfangwei.xi && (
                        <div>喜神：{calendar.almanac.jishenfangwei.xi}</div>
                      )}
                      {calendar.almanac.jishenfangwei.yanggui && (
                        <div>
                          阳贵：{calendar.almanac.jishenfangwei.yanggui}
                        </div>
                      )}
                      {calendar.almanac.jishenfangwei.yingui && (
                        <div>阴贵：{calendar.almanac.jishenfangwei.yingui}</div>
                      )}
                      {calendar.almanac.jishenfangwei.fu && (
                        <div>福神：{calendar.almanac.jishenfangwei.fu}</div>
                      )}
                      {calendar.almanac.jishenfangwei.cai && (
                        <div>财神：{calendar.almanac.jishenfangwei.cai}</div>
                      )}
                    </div>
                  )}
                  {Array.isArray(calendar.almanac.pengzubaiji) &&
                    calendar.almanac.pengzubaiji.length > 0 && (
                      <ul className="list-disc pl-5">
                        {calendar.almanac.pengzubaiji.map(
                          (t: string, idx: number) => (
                            <li key={idx} className="opacity-80">
                              {t}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm opacity-60">暂无万年历信息</div>
          )}
        </div>
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
            <img
              src={shareImageUrl}
              alt="今日进度分享图片预览"
              className="w-full max-w-xl rounded-md border"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyShareImageToClipboard}
                className="btn btn-outline"
              >
                复制到剪贴板
              </button>
              <button
                onClick={systemShareImage}
                className="btn btn-outline"
              >
                通过系统分享
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-60">
            生成后将显示预览，并可下载或直接分享。
          </div>
        )}
      </section>

      {/* 天气与万年历：已移至顶部展示 */}
    </div>
  );
}

// ...
// 追加：万年历类型定义，避免使用 any
type CalendarJishenFangwei = {
  xi?: string;
  yanggui?: string;
  yingui?: string;
  fu?: string;
  cai?: string;
};

type CalendarAlmanac = {
  yi?: string;
  ji?: string;
  chong?: string;
  sha?: string;
  nayin?: string;
  shiershen?: string;
  xingxiu?: string;
  zheng?: string;
  shou?: string;
  liuyao?: string;
  jiuxing?: string;
  taisui?: string;
  jishenfangwei?: CalendarJishenFangwei;
  pengzubaiji?: string[];
};

type CalendarLunar = {
  zodiac?: string;
  year?: number;
  month?: number;
  day?: number;
  cnYear?: string;
  cnMonth?: string;
  cnDay?: string;
  cyclicalYear?: string;
  cyclicalMonth?: string;
  cyclicalDay?: string;
  hour?: string;
  maxDayInMonth?: number;
  leapMonth?: number;
  yuexiang?: string;
  wuhou?: string;
  shujiu?: string;
  sanfu?: string;
  solarTerms?: Record<string, string>;
};

type CalendarData = {
  year?: number;
  leapYear?: boolean;
  month?: number;
  maxDayInMonth?: number;
  enMonth?: string;
  astro?: string;
  cnWeek?: string;
  enWeek?: string;
  weekInYear?: number;
  day?: number;
  dayInYear?: number;
  julianDay?: number;
  hour?: number;
  minute?: number;
  second?: number;
  festivals?: string[];
  lunar?: CalendarLunar;
  almanac?: CalendarAlmanac;
  date?: string;
  week?: string;
  lunarText?: string;
  cyclical?: { year?: string; month?: string; day?: string };
  almanacSummary?: { yi?: string; ji?: string; chong?: string; sha?: string };
};
