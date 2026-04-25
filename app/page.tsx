import { getPostsWithPinned, Category } from '@/lib/posts'
import HomeFrame from '@/components/HomeFrame'
import PostsView from '@/components/PostsView'
import DiaryGuard from '@/components/DiaryGuard'
import { PinnedPostCard } from '@/components/PinnedPostCard'
import AgentsView from '@/components/AgentsView'

const INITIAL_PAGE_SIZE = 4

interface HomeProps {
  searchParams: { category?: string }
}

type Signal = {
  label: string
  value: string
}

type RuntimeLine = {
  id: string
  command: string
  result: string
}

const CATEGORY_COPY: Record<string, {
  eyebrow: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
  featuredTitle: string
  latestTitle: string
  signals: (totalCount: number) => Signal[]
  runtime: RuntimeLine[]
}> = {
  all: {
    eyebrow: 'AJIN.BLOG / BUILD + DIARY ARCHIVE',
    title: '把进展、日记和团队，写成一份可回看的终端日志。',
    description: '这里记录在做什么、为什么这样做，以及那些不想被时间吞掉的小片段。',
    primaryHref: '#archive',
    primaryLabel: '开始阅读',
    secondaryHref: '/?category=team',
    secondaryLabel: '查看团队',
    featuredTitle: '先从这一篇开始',
    latestTitle: '最近写下的内容',
    signals: (totalCount) => [
      { label: 'Archive', value: `${totalCount} entries` },
      { label: 'Mode', value: 'progress / diary / agents' },
      { label: 'Entry', value: '从置顶或最近更新开始' },
    ],
    runtime: [
      { id: '01', command: 'write.progress()', result: '把正在发生的事及时记下。' },
      { id: '02', command: 'keep.small.days()', result: '给日常留一个不被吞掉的位置。' },
      { id: '03', command: 'map.the.team()', result: '让人和 AI 的分工始终清楚。' },
    ],
  },
  progress: {
    eyebrow: 'BUILD LOG / ACTIVE DECISIONS',
    title: '把正在推进的东西，按时间写成可追踪记录。',
    description: '这里更靠近工作现场。会写设计判断、实现过程、版本变化和阶段复盘。',
    primaryHref: '#archive',
    primaryLabel: '看最近进展',
    secondaryHref: '/',
    secondaryLabel: '返回总览',
    featuredTitle: '置顶入口',
    latestTitle: '最近的进展记录',
    signals: (totalCount) => [
      { label: 'Archive', value: `${totalCount} progress logs` },
      { label: 'Focus', value: 'ship / debug / review' },
      { label: 'Use', value: '适合快速了解最近在做什么' },
    ],
    runtime: [
      { id: '01', command: 'capture.context()', result: '先写清楚背景和约束。' },
      { id: '02', command: 'record.decisions()', result: '把关键判断留成可回看证据。' },
      { id: '03', command: 'ship.iteration()', result: '每次只推进一个清楚结果。' },
    ],
  },
  diary: {
    eyebrow: 'PRIVATE LOG / LOCKED ACCESS',
    title: '更私人一点，也更靠近当下。',
    description: '这里写情绪、观察和日常纹理。入口有密码，但气质仍然保持克制和安静。',
    primaryHref: '#archive',
    primaryLabel: '进入日记入口',
    secondaryHref: '/',
    secondaryLabel: '返回总览',
    featuredTitle: '先从这一篇开始',
    latestTitle: '最近的日记',
    signals: (totalCount) => [
      { label: 'Archive', value: `${totalCount} private logs` },
      { label: 'Access', value: 'password protected' },
      { label: 'State', value: '解锁后保留当前会话' },
    ],
    runtime: [
      { id: '01', command: 'open.quietly()', result: '这部分只对知道密码的人打开。' },
      { id: '02', command: 'keep.texture()', result: '保留生活里细小但真实的部分。' },
      { id: '03', command: 'write.honestly()', result: '不过度包装，也不故意煽情。' },
    ],
  },
  team: {
    eyebrow: 'AGENT MAP / ACTIVE TEAM',
    title: '这是一支被认真命名，也被认真分工的团队。',
    description: '每个 Agent 都对应不同职责、边界和做事方式。这页更像一张持续更新的角色地图。',
    primaryHref: '/?category=team',
    primaryLabel: '浏览团队',
    secondaryHref: '/',
    secondaryLabel: '返回博客',
    featuredTitle: '',
    latestTitle: '',
    signals: () => [
      { label: 'Mode', value: 'route / build / verify / research' },
      { label: 'Agents', value: '10 active roles' },
      { label: 'Entry', value: '先选角色，再看细节' },
    ],
    runtime: [
      { id: '01', command: 'route.roles()', result: '先定义谁负责什么。' },
      { id: '02', command: 'keep.boundaries()', result: '每个角色都有清楚边界。' },
      { id: '03', command: 'work.as.team()', result: '不是工具堆叠，而是协作系统。' },
    ],
  },
}

function HeroSection({
  copy,
  signals,
  showMeta = true,
}: {
  copy: (typeof CATEGORY_COPY)[keyof typeof CATEGORY_COPY]
  signals: Signal[]
  showMeta?: boolean
}) {
  return (
    <section className="hero-shell" data-hero data-reveal="section">
      <div className={showMeta ? 'hero-grid' : 'hero-grid hero-grid--single'}>
        <div className="hero-copy">
          <p className="system-line" data-hero-item>{copy.eyebrow}</p>
          <h1 className="hero-title" data-hero-item>{copy.title}</h1>
          <p className="hero-lead" data-hero-item>{copy.description}</p>

          <div className="hero-actions" data-hero-item>
            <a className="button-primary px-5 py-3 text-sm" href={copy.primaryHref}>
              {copy.primaryLabel}
            </a>
            <a className="button-secondary px-5 py-3 text-sm" href={copy.secondaryHref}>
              {copy.secondaryLabel}
            </a>
          </div>

          {showMeta && (
            <div className="signal-grid" data-hero-item>
              {signals.map((signal) => (
                <article key={signal.label} className="signal-card">
                  <p className="signal-card__label">{signal.label}</p>
                  <strong className="signal-card__value">{signal.value}</strong>
                </article>
              ))}
            </div>
          )}
        </div>

        {showMeta && (
          <aside className="terminal-panel" aria-label="当前栏目运行日志" data-hero-item>
            <div className="terminal-panel__topline">
              <p className="section-kicker !mb-0">runtime.log</p>
              <span className="terminal-panel__state">live</span>
            </div>

            <div className="terminal-lines">
              {copy.runtime.map((line) => (
                <div key={line.id} className="terminal-line">
                  <span className="terminal-line__index">[{line.id}]</span>
                  <div>
                    <strong>{line.command}</strong>
                    <p>{line.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}

export default function Home({ searchParams }: HomeProps) {
  const rawCategory = searchParams.category
  const category: Category =
    rawCategory === 'progress' || rawCategory === 'diary' ? rawCategory : 'all'
  const isTeam = rawCategory === 'team'
  const copy = CATEGORY_COPY[rawCategory ?? category] ?? CATEGORY_COPY.all

  const { pinnedPost, posts: allPosts } = getPostsWithPinned(category)
  const initialPosts = allPosts.slice(0, INITIAL_PAGE_SIZE)
  const hasMore = allPosts.length > INITIAL_PAGE_SIZE
  const totalCount = allPosts.length + (pinnedPost ? 1 : 0)
  const signals = copy.signals(totalCount)

  if (isTeam) {
    return (
      <HomeFrame>
        <div className="space-y-8">
          <HeroSection copy={copy} signals={signals} showMeta={false} />
          <section data-reveal="section">
            <div data-reveal="item">
              <AgentsView />
            </div>
          </section>
        </div>
      </HomeFrame>
    )
  }

  const postList = (
    <PostsView
      pinnedPost={null}
      posts={initialPosts}
      totalCount={totalCount}
      category={category}
      initialHasMore={hasMore}
    />
  )

  return (
    <HomeFrame>
      <div className="space-y-8">
        <HeroSection copy={copy} signals={signals} />

        {pinnedPost && (
          <section className="space-y-4" data-reveal="section">
            <div data-reveal="item">
              <p className="section-kicker">featured.entry</p>
              <h2 className="home-section-title">{copy.featuredTitle}</h2>
            </div>
            <div data-reveal="item">
              <PinnedPostCard post={pinnedPost} />
            </div>
          </section>
        )}

        <section className="space-y-4" id="archive" data-reveal="section">
          <div data-reveal="item">
            <p className="section-kicker">latest.archive</p>
            <h2 className="home-section-title">{copy.latestTitle}</h2>
          </div>

          <div data-reveal="item">
            {category === 'diary' ? <DiaryGuard>{postList}</DiaryGuard> : postList}
          </div>
        </section>
      </div>
    </HomeFrame>
  )
}
