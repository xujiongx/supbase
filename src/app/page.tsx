"use client";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans max-w-3xl md:max-w-4xl mx-auto px-4 space-y-12">
      {/* Hero 区域 */}
      <section className="space-y-6 text-center">
        <Image
          src="/logo.png"
          alt="朝暮记 Logo"
          width={96}
          height={96}
          priority
          className="mx-auto block h-20 w-20 md:h-24 md:w-24 rounded-full object-cover"
        />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          朝暮记
        </h1>
        <p className="text-sm md:text-base opacity-70">
          用简单，记录朝朝暮暮。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/notes" className="btn btn-primary">
            开始记事
          </Link>
          <Link href="/todos" className="btn btn-outline">
            管理待办
          </Link>
        </div>

        {/* 用户状态与操作已移至顶部导航，首页保持极简风格 */}
      </section>

      {/* 特性栅格 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">✅ 待办列表</h3>
          <p className="text-sm opacity-70">
            创建、勾选与删除，专注当下，清晰掌控任务。
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">📝 每日笔记</h3>
          <p className="text-sm opacity-70">
            记录灵感与思考，支持 Markdown 与主题适配。
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <h3 className="font-medium">🌗 黑白主题</h3>
          <p className="text-sm opacity-70">
            适配系统浅色与深色主题，夜间不刺眼。
          </p>
        </div>
      </section>

      {/* 品牌介绍 */}

      <section className="card p-6 md:p-8">
        <div className="prose prose-sm md:prose prose-neutral dark:prose-invert mx-auto text-center max-w-[60ch]">
          <p className="leading-relaxed">
            朝暮记 —— 用简单，记满朝朝暮暮不必复杂，不用长篇大论。在这里，1
            分钟就能记下清晨的阳光、傍晚的晚风，或是一天里的小情绪。
          </p>
          <p className="leading-relaxed">
            以日月为引，把每个平凡的朝暮，都变成专属的时光印记。简单记录，慢慢沉淀，原来日子可以这样温柔。
          </p>
        </div>
      </section>
    </div>
  );
}
