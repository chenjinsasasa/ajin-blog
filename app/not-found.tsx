import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl mb-6">🌸</p>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-3" style={{ letterSpacing: '-0.03em' }}>
        页面找不到了
      </h1>
      <p className="text-[var(--muted-fg)] mb-8">
        也许这篇文章还没写出来～
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
      >
        回到首页
      </Link>
    </div>
  )
}
