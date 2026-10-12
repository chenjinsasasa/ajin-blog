'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AGENTS } from '@/lib/team'

function formatBirthday(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function calcAge(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const today = new Date()
  let ageYears = today.getFullYear() - year
  const monthDelta = today.getMonth() + 1 - month
  const dayDelta = today.getDate() - day

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    ageYears -= 1
  }

  return ageYears > 0 ? `${ageYears} 岁` : '0 岁'
}

export default function AgentsView() {
  const [selectedId, setSelectedId] = useState(AGENTS[0].id)
  const [failedAvatarId, setFailedAvatarId] = useState<string | null>(null)
  const selectedAgent = AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0]
  const selectedIndex = AGENTS.indexOf(selectedAgent) + 1
  const memberNumber = String(selectedIndex).padStart(2, '0')
  const facts = [
    { label: '性格', value: selectedAgent.mbti },
    { label: '性别', value: selectedAgent.gender },
    {
      label: '生日',
      value: selectedAgent.birthday ? formatBirthday(selectedAgent.birthday) : '',
    },
    { label: '年龄', value: selectedAgent.birthday ? calcAge(selectedAgent.birthday) : '' },
    { label: '偏好领域', value: selectedAgent.tags.join(' / ') },
  ].filter((fact) => fact.value)

  return (
    <div className="team-archive">
      <aside className="team-archive__index" aria-labelledby="team-index-heading">
        <h2 id="team-index-heading">成员索引</h2>
        <p className="team-archive__index-label">TEAM INDEX</p>
        <div className="team-archive__index-list">
          {AGENTS.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedId(agent.id)}
              className="team-archive__member-button"
              aria-pressed={agent.id === selectedAgent.id}
              aria-controls="team-member-profile"
            >
              <span className="team-archive__member-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{agent.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="team-archive__record">
        <div className="team-archive__selector">
          <label htmlFor="team-member-select">当前成员 / 切换成员</label>
          <select
            id="team-member-select"
            value={selectedAgent.id}
            onChange={(event) => setSelectedId(event.target.value)}
            aria-controls="team-member-profile"
          >
            {AGENTS.map((agent, index) => (
              <option key={agent.id} value={agent.id}>
                {String(index + 1).padStart(2, '0')} · {agent.name}
              </option>
            ))}
          </select>
        </div>

        <div className="team-archive__record-heading">
          <span>MEMBER {memberNumber}</span>
          <span>{memberNumber} / {AGENTS.length}</span>
        </div>
        <p className="team-archive__selection-status" aria-live="polite" aria-atomic="true">
          当前成员：{selectedAgent.name}，第 {selectedIndex} 位，共 {AGENTS.length} 位。
        </p>

        <article
          id="team-member-profile"
          className="team-archive__dossier"
          aria-labelledby="team-member-name"
        >
          <div className="team-archive__visual-column">
            <div className="team-archive__portrait">
              {selectedAgent.avatar && failedAvatarId !== selectedAgent.id ? (
                <Image
                  key={selectedAgent.id}
                  src={selectedAgent.avatar}
                  alt={`${selectedAgent.name}的原始人物画像`}
                  fill
                  priority={selectedIndex === 1}
                  sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1099px) 320px, 360px"
                  onError={() => setFailedAvatarId(selectedAgent.id)}
                />
              ) : (
                <span className="team-archive__portrait-fallback" role="img" aria-label={`${selectedAgent.name}，暂无人物画像`}>
                  {selectedAgent.name}
                  <small>MEMBER {memberNumber}</small>
                </span>
              )}
            </div>

            <dl className="team-archive__details">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="team-archive__story-column">
            <header className="team-archive__identity">
              <h2 id="team-member-name">{selectedAgent.name}</h2>
              {selectedAgent.role && <p>{selectedAgent.role}</p>}
            </header>

            <div className="team-archive__biography">
              {selectedAgent.desc.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {selectedAgent.hobbies.length > 0 && (
              <section className="team-archive__outside-work" aria-labelledby="team-member-hobbies">
                <h3 id="team-member-hobbies">工作之外</h3>
                <p>{selectedAgent.hobbies.join(' · ')}</p>
              </section>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
