"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import { Sparkles, ImageIcon, Music2, Clapperboard } from "lucide-react";

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
    <div className="page-shell font-sans">
      <Tooltip.Provider delayDuration={200}>
        <main className="space-y-8 md:space-y-10">
          <header className="space-y-2">
            <h1 className="page-title">每日发现</h1>
            <p className="page-lede max-w-none">
              一言、一图、一曲、一影，用轻量内容打开今天。
            </p>
          </header>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div className="card card-interactive space-y-4 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]">
                  <Sparkles
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <h2 className="text-base font-semibold tracking-tight md:text-lg">
                  每日一言
                </h2>
              </div>
              {loading.quote ? (
                <div className="rounded-md border border-dashed border-subtle px-3 py-6 text-center text-sm text-muted-foreground">
                  加载中…
                </div>
              ) : quote ? (
                <div className="space-y-4">
                  <div className="relative rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] p-5">
                    <span
                      className="absolute left-3 top-2 font-serif text-3xl leading-none text-muted-foreground"
                      aria-hidden
                    >
                      “
                    </span>
                    <p className="text-sm leading-relaxed pl-6 pr-2">
                      {quote.text}
                    </p>
                    <span
                      className="absolute bottom-2 right-3 font-serif text-3xl leading-none text-muted-foreground"
                      aria-hidden
                    >
                      ”
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="inline-flex max-w-full items-center rounded-full border border-subtle px-2.5 py-1 text-[0.75rem] leading-none md:text-xs">
                      <span className="mr-1 text-muted-foreground">作者</span>
                      <span className="truncate max-w-[10rem]">
                        {quote.fromWho || "佚名"}
                      </span>
                    </span>
                    <span className="inline-flex max-w-full items-center rounded-full border border-subtle px-2.5 py-1 text-[0.75rem] leading-none md:text-xs">
                      <span className="mr-1 text-muted-foreground">来源</span>
                      <span className="truncate max-w-[12rem]">
                        {quote.from || "未知来源"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  加载失败，请稍后再试。
                </div>
              )}
            </div>

            <div className="card card-interactive space-y-4 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]">
                  <ImageIcon
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <h2 className="text-base font-semibold tracking-tight md:text-lg">
                  每日一图
                </h2>
              </div>
              {/* 动态内容：图片加载完成后再显示 */}
              {error.image ? (
                <div className="text-sm text-muted-foreground">
                  加载失败，请稍后再试。
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-md border border-subtle">
                  {!imageReady ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--background)_75%,transparent)] backdrop-blur-[2px]">
                      <div className="text-sm text-muted-foreground">
                        加载中…
                      </div>
                    </div>
                  ) : null}
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt="每日一图"
                    className="aspect-[4/3] h-auto w-full object-cover transition-opacity duration-300"
                    style={{ opacity: imageReady ? 1 : 0.85 }}
                    onLoad={() => setImageReady(true)}
                    onError={() =>
                      setError((e) => ({ ...e, image: "加载失败" }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="card card-interactive space-y-4 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]">
                  <Music2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className="text-base font-semibold tracking-tight md:text-lg">
                  每日一音乐
                </h2>
              </div>
              {/* 动态内容 */}
              {loading.music ? (
                <div className="rounded-md border border-dashed border-subtle px-3 py-6 text-center text-sm text-muted-foreground">
                  加载中…
                </div>
              ) : music ? (
                <div className="flex items-center gap-4">
                  {music.artwork ? (
                    <img
                      src={music.artwork}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-md border border-subtle object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium">{music.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {music.artist}
                    </div>
                    {music.url ? (
                      <a
                        href={music.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-inline text-xs"
                      >
                        在 Apple Music 打开
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {error.music || "加载失败，请稍后再试。"}
                </div>
              )}
            </div>

            <div className="card card-interactive space-y-4 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]">
                  <Clapperboard
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <h2 className="text-base font-semibold tracking-tight md:text-lg">
                  每日一电影
                </h2>
              </div>
              {/* 动态内容 */}
              {loading.movie ? (
                <div className="rounded-md border border-dashed border-subtle px-3 py-6 text-center text-sm text-muted-foreground">
                  加载中…
                </div>
              ) : movie ? (
                <div className="grid grid-cols-[96px_1fr] items-start gap-4">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt=""
                      className="h-36 w-24 rounded-md border border-subtle object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 space-y-2">
                    <div className="text-sm font-medium">{movie.title}</div>
                    <div className="line-clamp-3 text-xs text-muted-foreground">
                      {movie.overview}
                    </div>
                    {movie.url ? (
                      <a
                        href={movie.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-inline text-xs"
                      >
                        查看详情
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
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
