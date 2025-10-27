"use client";

import { useEffect, useState } from "react";

type WeatherData = {
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
};

type WeatherCardProps = {
  onWeatherChange?: (weather: WeatherData | null) => void;
};

export default function WeatherCard({ onWeatherChange }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // 当天气数据变化时通知父组件
  useEffect(() => {
    if (onWeatherChange) {
      onWeatherChange(weather);
    }
  }, [weather]);

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
      setLoading(true);
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
        setError(e instanceof Error ? e.message : "天气获取失败");
      } finally {
        setLoading(false);
      }
    };

    (async () => {
      const coords = await getCoords().catch(() => null);
      await fetchWeather(coords ?? undefined);
    })();
  }, []);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">☀️</span>
        <h2 className="text-base md:text-lg font-medium">今日天气</h2>
      </div>
      {loading ? (
        <div className="card px-3 py-2 text-sm opacity-70">加载中...</div>
      ) : error ? (
        <div className="card px-3 py-2 text-sm">{error}</div>
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
  );
}