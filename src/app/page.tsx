"use client";
import Link from "next/link";
import Image from "next/image";
import { CheckSquare, FileText, Contrast, ArrowRight, LayoutGrid } from "lucide-react";

export default function Home() {
  return (
    <div className='page-shell font-sans space-y-14 md:space-y-16'>
      <section className='space-y-8 text-center'>
        <div className='mx-auto transition-transform duration-500 ease-out hover:scale-[1.02]'>
          <Image
            src='/logo.png'
            alt='朝暮记 Logo'
            width={96}
            height={96}
            priority
            className='mx-auto block h-20 w-20 rounded-full object-cover ring-1 ring-[var(--color-border)] md:h-24 md:w-24'
          />
        </div>
        <div className='space-y-4'>
          <h1 className='page-title'>朝暮记</h1>
          <p className='mx-auto max-w-md text-sm text-muted-foreground md:text-base'>
            用简单，记录朝朝暮暮。
          </p>
          <div className='flex flex-wrap justify-center gap-3 pt-2'>
            <Link href='/notes' className='btn btn-outline gap-1.5'>
              开始记事
              <ArrowRight className='h-4 w-4 opacity-70' aria-hidden />
            </Link>
            <Link href='/todos' className='btn btn-primary gap-1.5'>
              管理待办
              <ArrowRight className='h-4 w-4 opacity-80' aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className='card card-interactive space-y-4 p-5 md:p-6'>
        <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
          <h2 className='text-base font-semibold tracking-tight md:text-lg'>
            今朝概览
          </h2>
          <p className='text-sm text-muted-foreground'>
            查看今日待办与笔记摘要
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Link href='/kanban' className='btn btn-primary gap-1.5'>
            <LayoutGrid
              className='h-4 w-4 opacity-90'
              strokeWidth={1.75}
              aria-hidden
            />
            看板
          </Link>
          <Link
            href='/zhaomu'
            className='btn btn-ghost text-muted-foreground hover:text-foreground'
          >
            前往今朝
          </Link>
          <Link
            href='/discover'
            className='btn btn-ghost text-muted-foreground hover:text-foreground'
          >
            去发现
          </Link>
        </div>
      </section>

      <section className='grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5'>
        <div className='card card-interactive space-y-3 p-5'>
          <div className='flex items-center gap-3'>
            <span className='flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]'>
              <CheckSquare className='h-4 w-4' strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className='font-medium tracking-tight'>待办列表</h3>
          </div>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            创建、勾选与删除，专注当下，清晰掌控任务。
          </p>
        </div>
        <div className='card card-interactive space-y-3 p-5'>
          <div className='flex items-center gap-3'>
            <span className='flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]'>
              <FileText className='h-4 w-4' strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className='font-medium tracking-tight'>每日笔记</h3>
          </div>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            记录灵感与思考，支持 Markdown 与主题适配。
          </p>
        </div>
        <div className='card card-interactive space-y-3 p-5'>
          <div className='flex items-center gap-3'>
            <span className='flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-[color-mix(in_srgb,var(--muted)_70%,transparent)]'>
              <Contrast className='h-4 w-4' strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className='font-medium tracking-tight'>深浅主题</h3>
          </div>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            适配系统浅色与深色，夜间不刺眼。
          </p>
        </div>
      </section>

      <section
        className='mx-auto max-w-[52ch] border-t border-subtle pt-10 md:pt-12'
        aria-label='关于朝暮记'
      >
        <div className='space-y-4 text-center text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem] md:leading-relaxed'>
          <p>
            朝暮记 —— 用简单，记满朝朝暮暮。不必复杂，不用长篇大论。在这里，1
            分钟就能记下清晨的阳光、傍晚的晚风，或是一天里的小情绪。
          </p>
          <p>
            以日月为引，把每个平凡的朝暮，都变成专属的时光印记。简单记录，慢慢沉淀，原来日子可以这样温柔。
          </p>
        </div>
      </section>
    </div>
  );
}
