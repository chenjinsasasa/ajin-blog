import HomeFrame from '@/components/HomeFrame'
import AgentsView from '@/components/AgentsView'
import './team.css'

export default function TeamPage() {
  return (
    <HomeFrame>
      <section className="team-page">
        <header className="team-page__intro">
          <p className="team-page__eyebrow">TEAM / PEOPLE BEHIND THE WORK</p>
          <h1>与我一起工作的伙伴</h1>
          <p className="team-page__description">每个成员都有自己的职责、边界和工作方式。</p>
        </header>
        <AgentsView />
      </section>
    </HomeFrame>
  )
}
