import { NextResponse } from "next/server";

// 简化的万年历/节气代理：可替换为你选择的供应商
// 这里先用 Timeless 免费接口作为示例（支持2099），可后续切换到你选择的正式服务
// 注意：如供应商需要密钥，请改为服务端请求并从环境变量读取密钥

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // yyyy-mm-dd，可选
  const target = date ? `https://api.timelessq.com/time?datetime=${encodeURIComponent(date)}` : `https://api.timelessq.com/time`;

  try {
    const res = await fetch(target, { next: { revalidate: 3600 } }); // 缓存1小时
    const json = await res.json();
    if (json.errno !== 0) {
      return NextResponse.json({ error: "Calendar API 返回错误", data: json }, { status: 500 });
    }
    const data = json.data;
    const payload = {
      date: data.year && data.month && data.day ? `${data.year}-${String(data.month).padStart(2,"0")}-${String(data.day).padStart(2,"0")}` : undefined,
      week: data.cnWeek,
      lunar: data.lunar ? `${data.lunar.cnYear}年 ${data.lunar.cnMonth}${data.lunar.cnDay}` : undefined,
      zodiac: data.lunar?.zodiac,
      cyclical: {
        year: data.lunar?.cyclicalYear,
        month: data.lunar?.cyclicalMonth,
        day: data.lunar?.cyclicalDay,
      },
      solarTerms: data.lunar?.solarTerms || {},
      almanac: {
        yi: data.almanac?.yi,
        ji: data.almanac?.ji,
        chong: data.almanac?.chong,
        sha: data.almanac?.sha,
      },
      festivals: data.festivals || [],
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}