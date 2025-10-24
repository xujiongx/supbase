"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";

export default function DiscoverPage() {
  // 数据状态
  const [quote, setQuote] = useState<{
    text: string;
    from?: string;
    fromWho?: string;
  } | null>(null);
  const [music, setMusic] = useState<{
    name: string;
    artist: string;
    artwork?: string;
    url?: string;
  } | null>(null);
  const [movie, setMovie] = useState<{
    title: string;
    overview?: string;
    poster?: string;
    url?: string;
  } | null>(null);
  // 加载状态（移除 image 的同步设置）
  const [loading, setLoading] = useState({
    quote: true,
    music: true,
    movie: true,
  });
  const [error, setError] = useState<{
    quote?: string;
    image?: string;
    music?: string;
    movie?: string;
  }>({});
  // 每日一图：通过 onLoad/onError 控制加载状态
  const [imageReady, setImageReady] = useState(false);
  const imageUrl = "https://picsum.photos/1200/800";

  useEffect(() => {
    // 每日一言（Hitokoto）
    fetch("https://v1.hitokoto.cn/?encode=json")
      .then((r) => r.json())
      .then((d) => {
        setQuote({ text: d.hitokoto, from: d.from, fromWho: d.from_who });
      })
      .catch(() => setError((e) => ({ ...e, quote: "加载失败" })))
      .finally(() => setLoading((l) => ({ ...l, quote: false })));

    // 每日一电影（TMDB Trending，通过后端代理，避免暴露密钥）
    fetch("/api/discover/movie")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.item) {
          const imgBase = "https://image.tmdb.org/t/p/w500";
          setMovie({
            title: d.item.title || d.item.name,
            overview: d.item.overview,
            poster: d.item.poster_path
              ? imgBase + d.item.poster_path
              : undefined,
            url: d.item.id
              ? `https://www.themoviedb.org/movie/${d.item.id}`
              : undefined,
          });
        } else {
          setError((e) => ({
            ...e,
            movie:
              d?.reason === "missing_key" ? "未配置TMDB_API_KEY" : "加载失败",
          }));
        }
      })
      .catch(() => setError((e) => ({ ...e, movie: "加载失败" })))
      .finally(() => setLoading((l) => ({ ...l, movie: false })));

    // 每日一音乐（通过后端代理，避免 CORS）
    fetch("/api/discover/music")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.item) {
          setMusic({
            name: d.item.name,
            artist: d.item.artist,
            artwork: d.item.artwork,
            url: d.item.url,
          });
        } else {
          setError((e) => ({ ...e, music: d?.message || "加载失败" }));
        }
      })
      .catch(() => setError((e) => ({ ...e, music: "加载失败" })))
      .finally(() => setLoading((l) => ({ ...l, music: false })));

    // 预加载图片，避免 onLoad 因缓存或重定向导致未触发
    try {
      const img = new Image();
      img.src = imageUrl + `?t=${Date.now()}`;
      img.onload = () => setImageReady(true);
      img.onerror = () => setError((e) => ({ ...e, image: "加载失败" }));
    } catch {}
  }, []);

  return (
    <div className="font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8">
          {/* 顶部标题与说明 */}
          <section className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              每日发现
            </h1>
          </section>

          {/* 分类模块 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* 每日一言 */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h2 className="text-base md:text-lg font-medium">每日一言</h2>
                </div>
              </div>
              {/* 样式优化：更突出引文与出处 */}
              {loading.quote ? (
                <div className="card px-3 py-2 text-sm opacity-70">
                  加载中...
                </div>
              ) : quote ? (
                <div className="space-y-3">
                  <div className="card relative p-4 rounded-md">
                    <span className="absolute left-3 top-2 text-2xl opacity-40">
                      “
                    </span>
                    <p className="text-sm leading-relaxed pl-5 pr-2">
                      {quote.text}
                    </p>
                    <span className="absolute right-3 bottom-2 text-2xl opacity-40">
                      ”
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center rounded-full border  px-2 py-0.5 text-[0.75rem] md:text-xs leading-none ">
                      <span className="mr-1 opacity-60">作者</span>
                      <span className="truncate max-w-[10rem]">
                        {quote.fromWho || "佚名"}
                      </span>
                    </span>
                    <span className="inline-flex items-center rounded-full border  px-2 py-0.5 text-[0.75rem] md:text-xs leading-none ">
                      <span className="mr-1 opacity-60">来源</span>
                      <span className="truncate max-w-[12rem]">
                        {quote.from || "未知来源"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="card px-3 py-2 text-sm">
                  加载失败，请稍后再试。
                </div>
              )}
            </div>

            {/* 每日一图 */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🖼️</span>
                  <h2 className="text-base md:text-lg font-medium">每日一图</h2>
                </div>
              </div>
              {/* 动态内容：图片加载完成后再显示 */}
              {error.image ? (
                <div className="card px-3 py-2 text-sm">
                  加载失败，请稍后再试。
                </div>
              ) : (
                <div className="overflow-hidden rounded-md relative">
                  {!imageReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                      <div className="card px-3 py-2 text-sm opacity-70">
                        加载中...
                      </div>
                    </div>
                  ) : null}
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt="每日一图"
                    className="w-full h-auto object-cover aspect-[4/3]"
                    onLoad={() => setImageReady(true)}
                    onError={() =>
                      setError((e) => ({ ...e, image: "加载失败" }))
                    }
                  />
                </div>
              )}
            </div>

            {/* 每日一音乐 */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎵</span>
                  <h2 className="text-base md:text-lg font-medium">
                    每日一音乐
                  </h2>
                </div>
              </div>
              {/* 动态内容 */}
              {loading.music ? (
                <div className="card px-3 py-2 text-sm opacity-70">
                  加载中...
                </div>
              ) : music ? (
                <div className="flex items-center gap-3">
                  {music.artwork ? (
                    <img
                      src={music.artwork}
                      alt={music.name}
                      className="w-14 h-14 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{music.name}</div>
                    <div className="text-xs opacity-60">{music.artist}</div>
                    {music.url ? (
                      <a
                        href={music.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary"
                      >
                        在 Apple Music 打开
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="card px-3 py-2 text-sm">
                  {error.music || "加载失败，请稍后再试。"}
                </div>
              )}
            </div>

            {/* 每日一电影 */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎬</span>
                  <h2 className="text-base md:text-lg font-medium">
                    每日一电影
                  </h2>
                </div>
              </div>
              {/* 动态内容 */}
              {loading.movie ? (
                <div className="card px-3 py-2 text-sm opacity-70">
                  加载中...
                </div>
              ) : movie ? (
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-24 h-36 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{movie.title}</div>
                    <div className="text-xs opacity-60 line-clamp-3">
                      {movie.overview}
                    </div>
                    {movie.url ? (
                      <a
                        href={movie.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary"
                      >
                        查看详情
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="card px-3 py-2 text-sm">
                  {error.movie || "加载失败，请稍后再试。"}
                </div>
              )}
            </div>
          </section>

        </main>
      </Tooltip.Provider>
    </div>
  );
}
