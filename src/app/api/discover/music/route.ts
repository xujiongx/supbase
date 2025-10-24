import { NextResponse } from "next/server";
import { ProxyAgent, type Dispatcher } from "undici";

export const runtime = "nodejs";

type AppleFeedRes = {
  feed?: {
    results?: Array<{
      name: string;
      artistName: string;
      url: string;
      artworkUrl100?: string;
      artworkUrl?: string;
    }>;
  };
};

export async function GET() {
  // 支持切换地区：默认中国区（cn），可通过环境变量覆盖
  const region = process.env.MUSIC_REGION || "cn";
  const url = `https://rss.applemarketingtools.com/api/v2/${region}/music/most-played/50/songs.json`;

  try {
    // 可选代理支持：从环境变量读取代理地址
    const proxyUrl = process.env.MUSIC_HTTP_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    let dispatcher: Dispatcher | undefined = undefined;
    if (proxyUrl) {
      try {
        dispatcher = new ProxyAgent(proxyUrl);
      } catch {}
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`network_error: ${msg}`);
    });
    clearTimeout(timeout);

    if (!res.ok) {
      let msg = "upstream_error";
      try {
        const errJson = await res.json();
        msg = (errJson as { message?: string })?.message || msg;
      } catch {}
      return NextResponse.json({ ok: false, reason: "upstream_error", message: msg }, { status: 200 });
    }

    let data: AppleFeedRes;
    try {
      data = (await res.json()) as AppleFeedRes;
    } catch (parseErr) {
      return NextResponse.json({ ok: false, reason: "parse_error", message: (parseErr as Error)?.message }, { status: 200 });
    }

    const item = (() => {
      const list = Array.isArray(data?.feed?.results) ? data!.feed!.results! : [];
      return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
    })();
    if (!item) {
      return NextResponse.json({ ok: false, reason: "no_data", message: "暂无热门歌曲" }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      item: {
        name: item.name,
        artist: item.artistName,
        artwork: item.artworkUrl100 || item.artworkUrl,
        url: item.url,
      },
    }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("network_error:")) {
      const inner = msg.replace("network_error: ", "");
      const isAbort = /aborted/i.test(inner);
      return NextResponse.json({ ok: false, reason: isAbort ? "timeout" : "network_error", message: inner }, { status: 200 });
    }
    return NextResponse.json({ ok: false, reason: "exception", message: msg }, { status: 200 });
  }
}