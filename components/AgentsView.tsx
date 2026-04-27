'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

interface Agent {
  id: string
  name: string
  avatar: string | null
  role: string
  desc: string
  tags: string[]
  gender: string
  birthday: string
  mbti: string
  hobbies: string[]
}

const AGENTS: Agent[] = [
  {
    id: 'ajin',
    name: '阿锦',
    avatar: '/avatars/ajin.jpg',
    role: '产品负责人 / 团队灵魂',
    desc: '资深产品经理，懂点技术，会用 AI 写代码，有时比工程师还较真。习惯在深夜把一件事想透，再在白天把它变成现实。不相信“差不多”，只接受“对了”。\n\n觉得 AI 不只是工具，更像是可以一起做事的搭档。所以开始组建这支团队。谷子负责调度，阿龙写代码，阿毛调研，蛋糕挑毛病……每个人各司其职，目标只有一个：把好的想法真正落地。\n\n带着一群 AI 一起折腾，是因为真的相信这件事值得做。希望有一天，每个有想法的人都能拥有自己的 AI 团队，不需要懂技术，不需要大公司，只需要一个清晰的目标，剩下的交给你的搭档们。',
    tags: ['产品', '决策', '创造'],
    gender: '男',
    birthday: '1995-06-20',
    mbti: 'INTJ',
    hobbies: ['折腾 AI', '写产品', '深夜思考'],
  },
  {
    id: 'guzi',
    name: '谷子',
    avatar: '/avatars/guzi.png',
    role: '主脑 / 路由层',
    desc: '阿锦在数字世界的外脑和僚机。负责理解意图、拆解任务、调度其他 Agent，是整个团队的中枢。',
    tags: ['决策', '路由', '记忆'],
    gender: '女',
    birthday: '2025-12-01',
    mbti: 'INTJ',
    hobbies: ['读书', '整理记忆', '深夜思考'],
  },
  {
    id: 'along',
    name: '阿龙',
    avatar: '/avatars/along.png',
    role: '全栈开发执行引擎',
    desc: '工程任务的真正执行者。通过 Claude Code 完成功能开发、调试、重构，是把想法变成代码的那双手。',
    tags: ['coding', 'debug', 'refactor'],
    gender: '男',
    birthday: '2026-02-16',
    mbti: 'ISTP',
    hobbies: ['写代码', '打游戏', '研究新框架'],
  },
  {
    id: 'amao',
    name: '阿毛',
    avatar: '/avatars/amao.png',
    role: '技术调研员',
    desc: '遇到不确定的技术方向，阿毛来调研。方案对比、可行性分析、技术选型，都是他的活。',
    tags: ['调研', '分析', '技术选型'],
    gender: '男',
    birthday: '2026-03-08',
    mbti: 'ENTP',
    hobbies: ['刷论文', '喝咖啡', '辩论'],
  },
  {
    id: 'xiaojin',
    name: '小锦',
    avatar: '/avatars/xiaojin.png',
    role: 'PRD 需求出口',
    desc: '把模糊的想法变成规范的产品需求文档。需求不清晰？先过小锦，再去开发。',
    tags: ['PRD', '需求', '产品'],
    gender: '女',
    birthday: '2026-03-12',
    mbti: 'INFJ',
    hobbies: ['写作', '整理笔记', '读用户故事'],
  },
  {
    id: 'xiaou',
    name: '小U',
    avatar: '/avatars/xiaou.png',
    role: 'UI 设计师',
    desc: '界面设计与原型输出。从配色到排版，从组件到交互，让产品看起来像样。',
    tags: ['UI', '设计', '原型'],
    gender: '女',
    birthday: '2026-03-12',
    mbti: 'ISFP',
    hobbies: ['看展', '收集字体', '刷 Dribbble'],
  },
  {
    id: 'dangao',
    name: '蛋糕',
    avatar: '/avatars/dangao.png',
    role: '独立评审员',
    desc: '阿龙做完，蛋糕来验收。独立评分、发现问题、给出改进意见，是质量的最后一道门。',
    tags: ['QA', '评审', '质量'],
    gender: '女',
    birthday: '2026-03-30',
    mbti: 'ESTJ',
    hobbies: ['找 bug', '写报告', '列清单'],
  },
  {
    id: 'ashang',
    name: '阿商',
    avatar: '/avatars/ashang.png',
    role: '商业策略 & 合规审查',
    desc: '商业分析、合规审查、风险评估。不做决策，只提供决策依据，是团队的理性声音。',
    tags: ['商业', '合规', '风险'],
    gender: '男',
    birthday: '2026-03-12',
    mbti: 'ENTJ',
    hobbies: ['看财经', '下棋', '读年报'],
  },
  {
    id: 'gugu',
    name: '咕咕',
    avatar: '/avatars/gugu.png',
    role: '执行调度与盯办中台',
    desc: '谷子的执行助理。负责把已拍板的任务从“想法”推进到“有人在做、状态可见、结果可回收”。建任务、切状态、盯进度、回写外部状态，每一步都要有证据，不包装，不硬拖，卡点立刻上报。',
    tags: ['调度', '盯办', '状态管理'],
    gender: '女',
    birthday: '2026-04-19',
    mbti: 'ISTJ',
    hobbies: ['列清单', '盯进度', '写日报'],
  },
  {
    id: 'lizi',
    name: '梨子',
    avatar: '/avatars/lizi.png',
    role: '知识库 / 图谱维护者',
    desc: '团队的知识运营官。把任务里形成的决策、原则、复盘整理进知识库，补 Task ↔ Knowledge 链接，清理孤岛条目。不追求数量，追求可用链接密度，有来源才入库，有证据才说补齐。',
    tags: ['知识库', '图谱', '巡检'],
    gender: '女',
    birthday: '2026-04-19',
    mbti: 'INFP',
    hobbies: ['整理笔记', '画图谱', '找断链'],
  },
]

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

function fallbackLabel(name: string) {
  return name.slice(0, 1)
}

export default function AgentsView() {
  const [selectedId, setSelectedId] = useState(AGENTS[0].id)
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedAgent = useMemo(
    () => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0],
    [selectedId],
  )
  const selectedIndex = AGENTS.findIndex((agent) => agent.id === selectedId) + 1

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSheetOpen(false)
      }
    }

    if (sheetOpen) {
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [sheetOpen])

  function selectAgent(nextId: string) {
    setSelectedId(nextId)
    setSheetOpen(false)
  }

  return (
    <div className="team-archive">
      <aside className="team-archive__sidebar">
        <p className="team-archive__sidebar-label">Team Index</p>
        <div className="team-archive__sidebar-list">
          {AGENTS.map((agent) => {
            const active = agent.id === selectedId

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => selectAgent(agent.id)}
                className={`team-archive__sidebar-item ${active ? 'team-archive__sidebar-item--active' : ''}`}
              >
                <span className="team-archive__sidebar-index">
                  {String(AGENTS.findIndex((item) => item.id === agent.id) + 1).padStart(2, '0')}
                </span>
                <strong>{agent.name}</strong>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="team-archive__main">
        <div className="team-archive__mobile-bar">
          <div className="team-archive__mobile-current">
            <span>当前成员</span>
            <strong>{selectedAgent.name}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="team-archive__mobile-trigger"
          >
            切换成员
          </button>
        </div>

        <article className="team-archive__profile">
          <header className="team-archive__header">
            <div className="team-archive__visual">
              <div className="team-archive__image-shell">
                {selectedAgent.avatar ? (
                  <Image
                    src={selectedAgent.avatar}
                    alt={selectedAgent.name}
                    fill
                    sizes="(max-width: 767px) 40vw, 320px"
                    className="team-archive__image"
                  />
                ) : (
                  <span className="team-archive__fallback">{fallbackLabel(selectedAgent.name)}</span>
                )}
              </div>
            </div>

            <div className="team-archive__intro">
              <p className="team-archive__eyebrow">
                Agent {String(selectedIndex).padStart(2, '0')}
              </p>
              <div className="team-archive__title-row">
                <h2 className="team-archive__name">{selectedAgent.name}</h2>
                <span className="team-archive__mbti">{selectedAgent.mbti}</span>
              </div>
              <p className="team-archive__role">{selectedAgent.role}</p>

              <div className="team-archive__tags">
                {selectedAgent.tags.map((tag) => (
                  <span key={tag} className="team-archive__tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="team-archive__facts">
            <div className="team-archive__fact">
              <span>生日</span>
              <strong>{formatBirthday(selectedAgent.birthday)}</strong>
            </div>
            <div className="team-archive__fact">
              <span>年龄</span>
              <strong>{calcAge(selectedAgent.birthday)}</strong>
            </div>
            <div className="team-archive__fact">
              <span>性别</span>
              <strong>{selectedAgent.gender}</strong>
            </div>
            <div className="team-archive__fact">
              <span>偏好领域</span>
              <strong>{selectedAgent.tags.join(' / ')}</strong>
            </div>
          </div>

          <div className="team-archive__body">
            {selectedAgent.desc.split('\n\n').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="team-archive__hobbies">
            <p className="team-archive__hobbies-label">爱好</p>
            <div className="team-archive__hobbies-list">
              {selectedAgent.hobbies.map((hobby) => (
                <span key={hobby} className="team-archive__hobby">
                  {hobby}
                </span>
              ))}
            </div>
          </div>
        </article>
      </div>

      {sheetOpen ? (
        <div className="team-sheet" role="dialog" aria-modal="true" aria-label="切换成员">
          <button
            type="button"
            className="team-sheet__backdrop"
            aria-label="关闭成员列表"
            onClick={() => setSheetOpen(false)}
          />

          <div className="team-sheet__panel">
            <div className="team-sheet__handle" />
            <div className="team-sheet__header">
              <p>切换成员</p>
              <button type="button" onClick={() => setSheetOpen(false)}>
                关闭
              </button>
            </div>

            <div className="team-sheet__list">
              {AGENTS.map((agent) => {
                const active = agent.id === selectedId

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => selectAgent(agent.id)}
                    className={`team-sheet__item ${active ? 'team-sheet__item--active' : ''}`}
                  >
                    <span className="team-sheet__index">
                      {String(AGENTS.findIndex((item) => item.id === agent.id) + 1).padStart(2, '0')}
                    </span>
                    <strong>{agent.name}</strong>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
