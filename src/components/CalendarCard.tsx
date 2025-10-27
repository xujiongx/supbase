"use client";

import { useEffect, useState } from "react";

// 日历相关类型定义
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

export type CalendarData = {
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

type CalendarCardProps = {
  onCalendarChange?: (calendar: CalendarData | null) => void;
};

export default function CalendarCard({ onCalendarChange }: CalendarCardProps) {
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // 当日历数据变化时通知父组件
  useEffect(() => {
    if (onCalendarChange) {
      onCalendarChange(calendar);
    }
  }, [calendar]);

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/calendar");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setCalendar(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "万年历获取失败");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">📅</span>
        <h2 className="text-base md:text-lg font-medium">
          今日万年历/节气
        </h2>
      </div>
      {loading ? (
        <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
      ) : error ? (
        <div className="card px-3 py-2 text-sm">{error}</div>
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
  );
}