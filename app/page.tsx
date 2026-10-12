import Image from 'next/image'
import Link from 'next/link'
import HomeFrame from '@/components/HomeFrame'
import PostsView from '@/components/PostsView'
import { getAllPosts, getPostsWithPinned } from '@/lib/posts'
import { getAuthorName } from '@/lib/authors'
import { formatPostDate, isPublicPost } from '@/lib/postPresentation'
import { AGENTS } from '@/lib/team'
import { BUSINESS_AREAS, isBusinessArea, isPostMonth, isProjectId, isWorkStage, type PostFilters } from '@/lib/postTaxonomy'

const INITIAL_PAGE_SIZE = 2

interface HomeProps {
  searchParams?: { area?: string; stage?: string; project?: string; author?: string; month?: string }
}

export default function Home({ searchParams }: HomeProps) {
  const filters: PostFilters = {
    area: isBusinessArea(searchParams?.area) ? searchParams.area : undefined,
    stage: isWorkStage(searchParams?.stage) ? searchParams.stage : undefined,
    project: isProjectId(searchParams?.project) ? searchParams.project : undefined,
    author: searchParams?.author?.trim() || undefined,
    month: isPostMonth(searchParams?.month) ? searchParams.month : undefined,
  }
  const resolved = getPostsWithPinned(filters)
  const posts = resolved.posts.filter(isPublicPost)
  const pinnedPost = resolved.pinnedPost && isPublicPost(resolved.pinnedPost) ? resolved.pinnedPost : null
  const allPosts = getAllPosts()
  const publicPosts = allPosts.filter(isPublicPost)
  const latestDiary = allPosts.find((post) => post.category === 'diary')
  const recentPosts = publicPosts.filter((post) => !posts.slice(0, INITIAL_PAGE_SIZE).some((featured) => featured.slug === post.slug)).slice(0, 4)
  const authorOptions = Array.from(new Set(publicPosts.flatMap((post) => post.author ?? []))).map((value) => ({ value, label: getAuthorName(value) }))
  const monthOptions = Array.from(new Set(publicPosts.map((post) => post.date.slice(0, 7))))
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <HomeFrame>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__art" aria-hidden="true">
          <Image src="/hero/workshop-engraving.webp" alt="" fill priority sizes="(max-width: 767px) 100vw, 75vw" />
        </div>
        <div className="home-hero__copy">
          <p className="editorial-eyebrow">Ideas compound over time</p>
          <h1 id="home-title">把事情做成<br />把过程写下<br />把经验变成系统</h1>
          <p className="home-hero__description">记录产品推进、AI 协作与关键判断，也记录事情为什么能成。</p>
          <div className="home-hero__actions">
            <a className="button-primary" href="#blog">阅读档案 <span aria-hidden="true">→</span></a>
            <Link className="button-secondary" href="/team">认识团队</Link>
          </div>
          <p className="home-hero__note">长期主义 · 开放记录 · 与 AI 共建更好的产品</p>
        </div>
      </section>

      <div className="home-editorial">
        <div className="home-editorial__main">
          <div className="home-reading-grid">
            <section id="blog" className="home-featured" aria-labelledby="archive-title">
              <div className="editorial-section-heading">
                <div><h2 id="archive-title">{hasFilters ? '文章档案' : '最新文章'}</h2><p>产品、技术与思考的长期记录。</p></div>
              </div>
              <PostsView key={JSON.stringify(filters)} posts={posts.slice(0, INITIAL_PAGE_SIZE)} pinnedPost={pinnedPost} totalCount={posts.length + (pinnedPost ? 1 : 0)} filters={filters} authorOptions={authorOptions} monthOptions={monthOptions} initialHasMore={posts.length > INITIAL_PAGE_SIZE} />
            </section>

            {recentPosts.length > 0 && <section className="home-recent" aria-labelledby="recent-title">
              <div className="editorial-section-heading"><div><h2 id="recent-title">最新记录</h2><p>把真正发生过的过程留下来。</p></div></div>
              <div className="recent-entries">
                {recentPosts.map((post) => <Link key={post.slug} href={`/blog/${post.slug}`} className="recent-entry">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  <h3>{post.title}</h3>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <span className="recent-entry__arrow" aria-hidden="true">→</span>
                </Link>)}
              </div>
            </section>}
          </div>

          <section className="home-team" aria-labelledby="team-preview-title">
            <div className="home-team__heading"><h2 id="team-preview-title">与我一起工作的伙伴</h2><p>不同的职责，共同把事情做成。</p><Link href="/team">查看团队 <span aria-hidden="true">→</span></Link></div>
            <div className="home-team__members">
              {AGENTS.slice(0, 3).map((agent) => <Link key={agent.id} href="/team" className="home-team__member">
                {agent.avatar && <Image src={agent.avatar} alt="" width={64} height={64} sizes="64px" />}
                <div><h3>{agent.name}</h3><p>{agent.role}</p></div>
              </Link>)}
            </div>
          </section>
        </div>

        <aside className="home-index" aria-label="文章索引">
          <section><h2>按领域浏览</h2>
            {BUSINESS_AREAS.map((area) => <Link key={area.value} href={`/?area=${area.value}#blog`}><span>{area.label}</span><span>{publicPosts.filter((post) => post.businessArea === area.value).length} <span aria-hidden="true">›</span></span></Link>)}
          </section>
          <section><h2>按月归档</h2>
            {monthOptions.slice(0, 5).map((month) => <Link key={month} href={`/?month=${month}#blog`}><span>{month.replace('-', ' / ')}</span><span>{publicPosts.filter((post) => post.date.startsWith(month)).length} <span aria-hidden="true">›</span></span></Link>)}
          </section>
          <section id="about" className="home-index__about"><h2>关于这份档案</h2><p>一个和 AI 团队一起做产品、写代码、记日常的人。</p>
            {latestDiary && <Link href={`/blog/${latestDiary.slug}`}>私密日记 <span aria-hidden="true">↗</span></Link>}
          </section>
        </aside>
      </div>
    </HomeFrame>
  )
}
