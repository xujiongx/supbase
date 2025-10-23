"use client";
import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export type TimeFilterValue = {
  type: "all" | "today" | "last7" | "last30" | "custom";
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
};

interface Props {
  value: TimeFilterValue;
  onChange: (next: TimeFilterValue) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium opacity-80">{children}</div>;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TimeFilter({ value, onChange }: Props) {
  const setPreset = (type: TimeFilterValue["type"]) => {
    const todayStr = formatDateLocal(new Date());
    if (type === "custom") {
      onChange({ type, start: value.start, end: value.end });
      return;
    }
    if (type === "today") {
      onChange({ type: "today", start: todayStr, end: todayStr });
      return;
    }
    if (type === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = formatDateLocal(d);
      onChange({ type: "last7", start: startStr, end: todayStr });
      return;
    }
    if (type === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const startStr = formatDateLocal(d);
      onChange({ type: "last30", start: startStr, end: todayStr });
      return;
    }
    // all
    onChange({ type: "all", start: undefined, end: undefined });
  };

  React.useEffect(() => {
    // 首次挂载时，根据当前 type 规范化填充缺失的 start/end，确保消费者可以直接使用
    const todayStr = formatDateLocal(new Date());
    if (value.type === "all") {
      onChange({ type: "today", start: todayStr, end: todayStr });
      return;
    }
    if (value.type === "today") {
      if (!value.start || !value.end) onChange({ type: "today", start: todayStr, end: todayStr });
      return;
    }
    if (value.type === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = formatDateLocal(d);
      if (!value.start || !value.end) onChange({ type: "last7", start: startStr, end: todayStr });
      return;
    }
    if (value.type === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const startStr = formatDateLocal(d);
      if (!value.start || !value.end) onChange({ type: "last30", start: startStr, end: todayStr });
      return;
    }
  }, []);

  const handleDateChange = (key: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange({ ...value, [key]: v });
  };

  const btnClass = (active: boolean) => (active ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm");

  return (
    <div className="card p-3 space-y-3">
      <SectionLabel>时间筛选</SectionLabel>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="选择时间范围">
        <button type="button" className={btnClass(value.type === "all")} onClick={() => setPreset("all")}>全部</button>
        <button type="button" className={btnClass(value.type === "today")} onClick={() => setPreset("today")}>今天</button>
        <button type="button" className={btnClass(value.type === "last7")} onClick={() => setPreset("last7")}>最近7天</button>
        <button type="button" className={btnClass(value.type === "last30")} onClick={() => setPreset("last30")}>最近30天</button>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button type="button" className={btnClass(value.type === "custom")} onClick={() => setPreset("custom")}>自定义</button>
          </Tooltip.Trigger>
          <Tooltip.Content className="card px-2 py-1 text-xs" sideOffset={6}>选择开始与结束日期<Tooltip.Arrow className="opacity-40" /></Tooltip.Content>
        </Tooltip.Root>
      </div>

      {value.type === "custom" && (
        <div className="flex items-center gap-2 flex-nowrap">
          <input
            type="date"
            className="input"
            value={value.start ?? ""}
            onChange={handleDateChange("start")}
            aria-label="开始日期"
          />
          <span className="opacity-60 whitespace-nowrap">至</span>
          <input
            type="date"
            className="input"
            value={value.end ?? ""}
            onChange={handleDateChange("end")}
            aria-label="结束日期"
          />
        </div>
      )}
    </div>
  );
}