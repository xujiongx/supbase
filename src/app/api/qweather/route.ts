import { formatTime } from "@/utils"
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const locationFromQuery = searchParams.get("location");
  const key = process.env.QWEATHER_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "QWeather 未配置，请设置环境变量 QWEATHER_KEY" },
      { status: 500 },
    );
  }

  const tryFetchNow = async (location: string) => {
    const url = `https://mb3yfr58p2.re.qweatherapi.com/v7/weather/now?key=${key}&location=${encodeURIComponent(
      location,
    )}`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    return { ok: data?.code === "200", data } as const;
  };

  const lookupLocationIdByCoords = async (lat: number, lon: number) => {
    // 依据官方文档，坐标使用“经度,纬度”(lon,lat)顺序，且最多保留两位小数
    const lonFix = Number.isFinite(lon) ? Number(lon.toFixed(2)) : lon;
    const latFix = Number.isFinite(lat) ? Number(lat.toFixed(2)) : lat;

    // 优先使用城市查询（city lookup），成功则直接返回城市 LocationID
    const cityUrl = `https://mb3yfr58p2.re.qweatherapi.com/geo/v2/city/lookup?key=${key}&location=${lonFix},${latFix}`;
    const resCity = await fetch(cityUrl, { next: { revalidate: 86400 } });
    const jsonCity = await resCity.json();
    const cityList = Array.isArray(jsonCity?.location) ? jsonCity.location : [];
    if (cityList.length > 0 && typeof cityList[0]?.id === "string") {
      return String(cityList[0].id);
    }
    return null;
  };

  const hasValidCoords = (() => {
    if (!latStr || !lonStr) return false;
    const lat = Number(latStr);
    const lon = Number(lonStr);
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180
    );
  })();

  try {
    if (hasValidCoords) {
      const lat = Number(latStr!);
      const lon = Number(lonStr!);
      const id = await lookupLocationIdByCoords(lat, lon);
      if (!id) {
        return NextResponse.json(
          { error: "地点解析失败或不被支持" },
          { status: 400 },
        );
      }
      const idRes = await tryFetchNow(id);
      if (!idRes.ok) {
        return NextResponse.json(
          { error: "QWeather 返回错误", data: idRes.data },
          { status: 500 },
        );
      }
  
      const now = idRes.data.now || {};
      return NextResponse.json({
        now: {
          temp: now.temp,
          feelsLike: now.feelsLike,
          text: now.text,
          windDir: now.windDir,
          windScale: now.windScale,
          windSpeed: now.windSpeed,
          humidity: now.humidity,
          precip: now.precip,
          pressure: now.pressure,
          vis: now.vis,
          cloud: now.cloud,
          dew: now.dew,
          obsTime: formatTime(now.obsTime),
        },
        updateTime: formatTime(idRes.data.updateTime),
        fxLink: idRes.data.fxLink,
      });
    }

    // 无坐标：使用显式 location 或默认北京
    const locationParam = locationFromQuery ?? "101010100";
    const fallback = await tryFetchNow(locationParam);

    if (!fallback.ok) {
      return NextResponse.json(
        { error: "QWeather 返回错误", data: fallback.data },
        { status: 500 },
      );
    }
    const now = fallback.data.now || {};
    return NextResponse.json({
      now: {
        temp: now.temp,
        feelsLike: now.feelsLike,
        text: now.text,
        windDir: now.windDir,
        windScale: now.windScale,
        windSpeed: now.windSpeed,
        humidity: now.humidity,
        precip: now.precip,
        pressure: now.pressure,
        vis: now.vis,
        cloud: now.cloud,
        dew: now.dew,
        obsTime: formatTime(now.obsTime),
      },
      updateTime: formatTime(fallback.data.updateTime),
      fxLink: fallback.data.fxLink,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
