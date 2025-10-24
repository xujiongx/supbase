import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") ?? "101010100"; // 默认北京
  const key = process.env.QWEATHER_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "QWeather 未配置，请设置环境变量 QWEATHER_KEY" },
      { status: 500 }
    );
  }

  const url = `https://mb3yfr58p2.re.qweatherapi.com/v7/weather/now?key=${key}&location=${encodeURIComponent(
    location
  )}`;

  try {
    const res = await fetch(url, {
      // 缓存 10 分钟，降低调用频率
      next: { revalidate: 600 },
    });
    const data = await res.json();

    if (data.code !== "200") {
      return NextResponse.json(
        { error: "QWeather 返回错误", data },
        { status: 500 }
      );
    }

    const now = data.now || {};
    return NextResponse.json({
      now: {
        temp: now.temp,
        text: now.text,
        windDir: now.windDir,
        windScale: now.windScale,
      },
      updateTime: data.updateTime,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}