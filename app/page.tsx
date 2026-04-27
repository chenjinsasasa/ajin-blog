import Image from 'next/image'
import Link from 'next/link'
import HomeFrame from '@/components/HomeFrame'
import PostsView from '@/components/PostsView'
import { SectionIntro } from '@/components/SectionIntro'
import { getAllPosts, getPostsWithPinned } from '@/lib/posts'
import { HISTORICAL_COVERS } from '@/lib/historicalCovers'

const INITIAL_PAGE_SIZE = 6

function FeatureCard({
  href,
  imageSrc,
  title,
  buttonLabel,
  external = false,
}: {
  href: string
  imageSrc: string
  title: string
  buttonLabel: string
  external?: boolean
}) {
  const card = (
    <>
      <div className="feature-card__media">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 767px) 100vw, 50vw"
          className="feature-card__image"
        />
      </div>
      <div className="feature-card__body">
        <h3 className="feature-card__title">{title}</h3>
        <span className="feature-card__cta">{buttonLabel}</span>
      </div>
    </>
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="feature-card"
      >
        {card}
      </a>
    )
  }

  if (href.startsWith('#')) {
    return (
      <a href={href} className="feature-card">
        {card}
      </a>
    )
  }

  return (
    <Link href={href} className="feature-card">
      {card}
    </Link>
  )
}

function AboutSection() {
  return (
    <>
      <SectionIntro
        eyebrow="About Me"
        title="Who Is Ajin?"
        description="一个和 AI 团队一起做产品、写代码、记日常的人。"
      />

      <section className="about-grid" id="about">
        <div className="about-grid__media">
          <Image
            src="/avatars/ajin.jpg"
            alt="阿锦"
            fill
            sizes="(max-width: 767px) 100vw, 30vw"
            className="about-grid__image"
          />
        </div>

        <div className="about-grid__content">
          <h3 className="about-grid__title">Hey, I&apos;m Ajin.</h3>
          <p>
            我用这本博客记录正在发生的工作，尤其是产品判断、AI 协作、阶段复盘，以及那些真正让系统成形的细节。
          </p>
          <p>
            这里不是把结果包装得很好看，而是把过程留下来。主站更像对外名片，这里更像公开工作台。
          </p>
          <p>
            AI Team 也是这本博客的一部分。谷子、阿龙、阿毛、小锦、蛋糕和其他成员并不是装饰性的设定，而是实际参与分工的角色。
          </p>
        </div>
      </section>
    </>
  )
}

export default function Home() {
  const { pinnedPost, posts } = getPostsWithPinned('all')
  const allPosts = getAllPosts()
  const diaryPosts = getAllPosts('diary')
  const latestDiary = diaryPosts[0] ?? null
  const initialPosts = posts.slice(0, INITIAL_PAGE_SIZE)
  const hasMore = posts.length > INITIAL_PAGE_SIZE

  const featureCards = [
    {
      href: '#blog',
      imageSrc: pinnedPost?.coverImage || pinnedPost?.fallbackCoverImage || HISTORICAL_COVERS[0].src,
      title: 'Blog Archive',
      buttonLabel: 'Read The Archive',
    },
    {
      href: latestDiary ? `/blog/${latestDiary.slug}` : '#about',
      imageSrc: latestDiary?.coverImage || '/avatars/ajin.jpg',
      title: 'Private Diary',
      buttonLabel: 'Open The Diary',
    },
    {
      href: '/team',
      imageSrc: '/avatars/guzi.png',
      title: 'AI Team',
      buttonLabel: 'Meet The Team',
    },
    {
      href: 'https://chenjin.ai',
      imageSrc: '/chenjin-icon.png',
      title: 'chenjin.ai',
      buttonLabel: 'Visit Official',
      external: true,
    },
  ]

  return (
    <HomeFrame>
      <section className="hero-panel">
        <div className="hero-panel__inner">
          <p className="hero-panel__eyebrow">AJIN.BLOG</p>
          <h1 className="hero-panel__title">
            把工作留住。
            <br />
            把过程写下。
            <br />
            把系统做成。
          </h1>
          <p className="hero-panel__description">
            这里记录产品推进、AI 协作与日常判断。不是只展示结果，而是把那些真正让事情成立的过程，认真归档下来。
          </p>
          <a className="hero-panel__link" href="#blog">
            Read The Archive
          </a>
        </div>
      </section>

      <SectionIntro
        eyebrow="Resources"
        title="从这 4 个入口认识阿锦"
        description="主站、博客、日记和 AI 团队一起构成同一件事：把一个人的工作方式，公开而持续地留下来。"
      />

      <section className="feature-grid">
        {featureCards.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </section>

      <SectionIntro
        eyebrow="The Blog"
        title="Explore The Archive"
      />

      <section id="blog">
        <PostsView
          posts={initialPosts}
          totalCount={allPosts.length}
          initialHasMore={hasMore}
        />
      </section>

      <AboutSection />
    </HomeFrame>
  )
}
