import HomeFrame from '@/components/HomeFrame'
import AgentsView from '@/components/AgentsView'
import { SectionIntro } from '@/components/SectionIntro'

export default function TeamPage() {
  return (
    <HomeFrame>
      <SectionIntro
        eyebrow="AI Team"
        title="Meet The Full Team"
        description="这里保留完整团队档案。每个成员都有自己的职责、边界和工作方式，不再压缩在首页里。"
        titleAs="h1"
      />

      <section className="team-page-shell">
        <AgentsView />
      </section>
    </HomeFrame>
  )
}
