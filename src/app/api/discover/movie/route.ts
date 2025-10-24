import { NextResponse } from "next/server";
import { ProxyAgent, type Dispatcher } from "undici";

export const runtime = "nodejs";

type TmdbTrendingRes = {
  results?: Array<{
    id: number;
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string | null;
  }>;
};

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "missing_key", message: "请在 .env.local 设置 TMDB_API_KEY" }, { status: 200 });
  }

  try {
    const url = `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`;

    // 可选代理支持：从环境变量读取代理地址
    const proxyUrl = process.env.TMDB_HTTP_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
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
      // undici 的 dispatcher 允许走代理；仅在配置了代理时注入
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
        msg = (errJson as { status_message?: string })?.status_message || msg;
      } catch {}
      return NextResponse.json({ ok: false, reason: "upstream_error", message: msg }, { status: 200 });
    }

    let data: TmdbTrendingRes;
    try {
      data = (await res.json()) as TmdbTrendingRes;
    } catch (parseErr) {
      return NextResponse.json({ ok: false, reason: "parse_error", message: (parseErr as Error)?.message }, { status: 200 });
    }

    const list = Array.isArray(data?.results) ? data.results! : [];
    const item = list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
    if (!item) {
      return NextResponse.json({ ok: false, reason: "no_data" }, { status: 200 });
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
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