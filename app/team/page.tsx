import HomeFrame from '@/components/HomeFrame'
import AgentsView from '@/components/AgentsView'

export default function TeamPage() {
  return (
    <HomeFrame>
      <section className="section-intro">
        <p className="section-intro__eyebrow">AI Team</p>
        <h1 className="section-intro__title">Meet The Full Team</h1>
        <p className="section-intro__description">
          这里保留完整团队档案。每个成员都有自己的职责、边界和工作方式，不再压缩在首页里。
        </p>
      </section>

      <section className="team-page-shell">
        <AgentsView />
      </section>
    </HomeFrame>
  )
}
