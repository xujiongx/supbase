export const formatTime = (raw?: string, tz: string = "Asia/Shanghai") => {
  if (!raw || typeof raw !== "string") return undefined;
  try {
    const d = new Date(raw);
    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const yyyy = get("year");
    const MM = get("month");
    const dd = get("day");
    const HH = get("hour");
    const mm = get("minute");
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
  } catch {
    return raw.replace("T", " ").replace(/([+-]\d{2}:\d{2}|Z)$/i, "");
  }
};