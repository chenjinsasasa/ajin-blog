'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Agent {
  id: string
  name: string
  emoji: string
  avatar: string | null
  role: string
  desc: string
  tags: string[]
  gender: string
  birthday: string
  mbti: string
  hobbies: string[]
}

interface BirthdayParts {
  year: number
  month: number
  day: number
}

const AGENTS: Agent[] = [
  {
    id: 'ajin',
    name: '阿锦',
    emoji: '🧠',
    avatar: '/avatars/ajin.jpg',
    role: '产品负责人 / 团队灵魂',
    desc: '资深产品经理，懂点技术，会用 AI 写代码，有时比工程师还较真。习惯在深夜把一件事想透，再在白天把它变成现实。不相信"差不多"，只接受"对了"。\n\n觉得 AI 不只是工具，更像是可以一起做事的搭档。所以开始组建这支团队——谷子负责调度，阿龙写代码，阿毛调研，蛋糕挑毛病……每个人各司其职，目标只有一个：把好的想法真正落地。\n\n带着一群 AI 一起折腾，是因为真的相信这件事值得做。希望有一天，每个有想法的人都能拥有自己的 AI 团队——不需要懂技术，不需要大公司，只需要一个清晰的目标，剩下的交给你的搭档们。',
    tags: ['产品', '决策', '创造'],
    gender: '男',
    birthday: '1995-06-20',
    mbti: 'INTJ',
    hobbies: ['折腾 AI', '写产品', '深夜思考'],
  },
  {
    id: 'guzi',
    name: '谷子',
    emoji: '🌾',
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
    emoji: '🐉',
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
    emoji: '🐱',
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
    emoji: '📝',
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
    emoji: '🎨',
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
    emoji: '🎂',
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
    emoji: '💼',
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
    emoji: '🐦',
    avatar: null,
    role: '执行调度与盯办中台',
    desc: '谷子的执行助理。负责把已拍板的任务从"想法"推进到"有人在做、状态可见、结果可回收"。建任务、切状态、盯进度、回写外部状态——每一步都要有证据，不包装，不硬拖，卡点立刻上报。',
    tags: ['调度', '盯办', '状态管理'],
    gender: '女',
    birthday: '2026-04-19',
    mbti: 'ISTJ',
    hobbies: ['列清单', '盯进度', '写日报'],
  },
  {
    id: 'lizi',
    name: '梨子',
    emoji: '🍐',
    avatar: null,
    role: '知识库 / 图谱维护者',
    desc: '团队的知识运营官。把任务里形成的决策、原则、复盘整理进知识库，补 Task ↔ Knowledge 链接，清理孤岛条目。不追求数量，追求可用链接密度——有来源才入库，有证据才说补齐。',
    tags: ['知识库', '图谱', '巡检'],
    gender: '女',
    birthday: '2026-04-19',
    mbti: 'INFP',
    hobbies: ['整理笔记', '画图谱', '找断链'],
  },
]

function parseBirthday(dateStr: string): BirthdayParts {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

function formatBirthday(dateStr: string) {
  const { year, month, day } = parseBirthday(dateStr)
  return `${year}年${month}月${day}日`
}

function calcAge(dateStr: string, today: Date) {
  const { year, month, day } = parseBirthday(dateStr)
  const birthDate = new Date(year, month - 1, day)
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (currentDate.getTime() < birthDate.getTime()) {
    return '0 天'
  }

  let ageYears = currentDate.getFullYear() - year
  let ageMonths = currentDate.getMonth() + 1 - month
  let ageDays = currentDate.getDate() - day

  if (ageDays < 0) {
    const previousMonthDays = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ).getDate()
    ageDays += previousMonthDays
    ageMonths -= 1
  }

  if (ageMonths < 0) {
    ageMonths += 12
    ageYears -= 1
  }

  if (ageYears > 0) return `${ageYears} 岁`
  if (ageMonths > 0) return `${ageMonths} 个月`
  return `${ageDays} 天`
}

function getMillisecondsUntilNextDay(now: Date) {
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return nextDay.getTime() - now.getTime() + 100
}

export default function AgentsView() {
  const [selected, setSelected] = useState<string | null>(AGENTS[0].id)
  const [today, setToday] = useState(() => new Date())
  const selectedAgent = AGENTS.find((a) => a.id === selected) ?? null

  useEffect(() => {
    let timer = 0

    const scheduleNextRefresh = () => {
      const now = new Date()
      timer = window.setTimeout(() => {
        setToday(new Date())
        scheduleNextRefresh()
      }, getMillisecondsUntilNextDay(now))
    }

    scheduleNextRefresh()

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div>
      {/* 头像列表 */}
      <div className="flex flex-wrap gap-4 mb-8">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelected(selected === agent.id ? null : agent.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.75rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                overflow: 'hidden',
                border: selected === agent.id
                  ? '2.5px solid var(--accent)'
                  : '2.5px solid var(--border)',
                transition: 'border-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--muted)',
                fontSize: '2rem',
                flexShrink: 0,
              }}
            >
              {agent.avatar ? (
                <Image
                  src={agent.avatar}
                  alt={agent.name}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <span>{agent.emoji}</span>
              )}
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: selected === agent.id ? 'var(--accent)' : 'var(--muted-fg)',
                transition: 'color 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {agent.name}
            </span>
          </button>
        ))}
      </div>

      {/* 展开介绍卡片 */}
      {selectedAgent && (
        <div
          className="card p-5 sm:p-6"
          style={{
            border: '1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
            marginBottom: '2rem',
            animation: 'fade-up 0.2s ease both',
          }}
        >
          <div className="flex items-start gap-4">
            {/* 大头像 */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--accent)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--muted)',
                fontSize: '1.75rem',
              }}
            >
              {selectedAgent.avatar ? (
                <Image
                  src={selectedAgent.avatar}
                  alt={selectedAgent.name}
                  width={60}
                  height={60}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <span>{selectedAgent.emoji}</span>
              )}
            </div>

            <div className="flex flex-col gap-3 min-w-0 flex-1">
              {/* 名字 + 职位 */}
              <div>
                <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                  <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                    {selectedAgent.name}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 500 }}>
                    {selectedAgent.role}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-fg)', lineHeight: 1.65, margin: 0 }}>
                  {selectedAgent.desc}
                </p>
              </div>

              {/* 基本信息行 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.5rem 1.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--muted-fg)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>性别</span>
                  <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
                    {selectedAgent.gender === '女' ? '♀ 女' : '♂ 男'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>生日</span>
                  <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
                    {formatBirthday(selectedAgent.birthday)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>年龄</span>
                  <span suppressHydrationWarning style={{ color: 'var(--fg)', fontWeight: 500 }}>
                    {calcAge(selectedAgent.birthday, today)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>MBTI</span>
                  <span
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {selectedAgent.mbti}
                  </span>
                </div>
              </div>

              {/* 爱好 */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-fg)', opacity: 0.6, marginBottom: '0.375rem', display: 'block' }}>
                  爱好
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.hobbies.map((h) => (
                    <span
                      key={h}
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: '0.375rem',
                        background: 'var(--muted)',
                        color: 'var(--fg)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* 技能标签 */}
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '0.15rem 0.55rem',
                      borderRadius: '0.375rem',
                      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                      color: 'var(--accent)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
