"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

/**
 * 小屏底栏：`fixed; bottom: 0` 在部分机型上会叠在系统键盘下面。
 * 用 visualViewport 计算键盘占用的底部空隙，抬高弹层并限制 max-height。
 */
export function useBoardSheetViewportStyle(enabled: boolean): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setStyle(undefined);
      return;
    }
    if (typeof window === "undefined") return;
    const narrowMq = window.matchMedia("(max-width: 639px)");
    if (!narrowMq.matches) {
      setStyle(undefined);
      return;
    }

    const vv = window.visualViewport;

    const apply = () => {
      const innerH = window.innerHeight;
      if (!vv) {
        setStyle({
          maxHeight: `${Math.max(160, Math.round(innerH * 0.88))}px`,
          bottom: 0,
          top: "auto",
        });
        return;
      }

      const vvTop = vv.offsetTop;
      const vvH = vv.height;
      const bottomInset = Math.max(0, Math.round(innerH - vvTop - vvH));
      const margin = 10;
      const maxH = Math.max(120, Math.floor(vvH - margin));

      setStyle({
        maxHeight: `${maxH}px`,
        bottom: bottomInset > 0 ? `${bottomInset}px` : "0px",
        top: "auto",
      });
    };

    const schedule = () => requestAnimationFrame(apply);

    apply();
    /** 键盘动画过程中 innerHeight/visualViewport 会晚几帧才稳定 */
    const lateChecks = [120, 280, 480].map((ms) =>
      window.setTimeout(() => requestAnimationFrame(apply), ms),
    );

    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);

    const onMq = () => {
      if (!narrowMq.matches) setStyle(undefined);
      else apply();
    };
    narrowMq.addEventListener("change", onMq);

    return () => {
      lateChecks.forEach(clearTimeout);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      narrowMq.removeEventListener("change", onMq);
    };
  }, [enabled]);

  return style;
}
