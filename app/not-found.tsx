import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up py-20 sm:py-28">
      <div className="card p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-softer)] text-[var(--accent-strong)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5h.01" />
            <path d="M14.5 9.5h.01" />
            <path d="M8.5 15.5c1.1-1 2.27-1.5 3.5-1.5s2.4.5 3.5 1.5" />
          </svg>
        </div>

        <p className="section-kicker mt-5 justify-center">Page Missing</p>
        <h1 className="font-display text-[2.8rem] leading-[0.94] text-[var(--fg)] sm:text-[3.6rem]">
          这页暂时不在当前档案里。
        </h1>
        <p className="mt-4 text-[1rem] leading-7 text-[var(--muted-fg)]">
          也许文章还在整理，也许入口已经换了位置。先回到首页，从总览、进展、日记或团队页重新进入。
        </p>

        <div className="mt-8">
          <Link href="/" className="button-primary px-5 py-3 text-sm">
            回到首页
          </Link>
        </div>
      </div>
    </div>
  )
}
