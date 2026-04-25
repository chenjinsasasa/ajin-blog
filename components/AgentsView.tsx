'use client'

import { useEffect, useRef, useState } from 'react'
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
    avatar: '/avatars/gugu.png',
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
    avatar: '/avatars/lizi.png',
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

function getFallbackLabel(agent: Agent) {
  return agent.name.slice(0, 1)
}

export default function AgentsView() {
  const [selected, setSelected] = useState<string | null>(AGENTS[0].id)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [today, setToday] = useState(() => new Date())
  const avatarRailRef = useRef<HTMLDivElement | null>(null)
  const avatarRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const selectedAgent = AGENTS.find((agent) => agent.id === selected) ?? null

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

  useEffect(() => {
    if (!selected) return

    const rail = avatarRailRef.current
    const avatar = avatarRefs.current[selected]
    if (!rail || !avatar) return

    avatar.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [selected])

  useEffect(() => {
    setIsMobileExpanded(false)
  }, [selected])

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-5">
          <div
            ref={avatarRailRef}
            className="agents-rail scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:gap-4 sm:pb-2"
          >
            {AGENTS.map((agent) => {
              const active = selected === agent.id

              return (
                <button
                  key={agent.id}
                  ref={(node) => {
                    avatarRefs.current[agent.id] = node
                  }}
                  onClick={() => setSelected(agent.id)}
                  className={`agents-rail__item group flex min-w-[5.9rem] shrink-0 snap-start flex-col items-center rounded-[24px] border px-3 py-3 text-center transition-all duration-200 sm:min-w-[6.8rem] sm:px-4 ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-softer)]'
                      : 'border-[var(--border)] bg-[var(--panel-soft)]'
                  }`}
                >
                  <div className="agents-rail__avatar relative h-16 w-16 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--muted)] sm:h-20 sm:w-20">
                    {agent.avatar ? (
                      <Image
                        src={agent.avatar}
                        alt={agent.name}
                        fill
                        sizes="80px"
                        quality={60}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-3xl text-[var(--accent-strong)]">
                        {getFallbackLabel(agent)}
                      </div>
                    )}
                  </div>

                  <span className="agents-rail__name mt-3 font-display text-[1.4rem] leading-none text-[var(--fg)]">
                    {agent.name}
                  </span>
                  <span className="agents-rail__meta mt-2 rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                    {agent.mbti}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {selectedAgent && (
        <article className="agents-detail-card card p-5 sm:p-8 lg:p-10">
          <div className="agents-mobile-summary rounded-[24px] border border-[var(--border)] bg-[var(--panel-soft)] p-4 lg:hidden">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--muted)]">
                {selectedAgent.avatar ? (
                  <Image
                    src={selectedAgent.avatar}
                    alt={selectedAgent.name}
                    fill
                    sizes="80px"
                    priority
                    quality={70}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-4xl text-[var(--accent-strong)]">
                    {getFallbackLabel(selectedAgent)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Active Profile
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[2rem] leading-[0.94] text-[var(--fg)]">
                    {selectedAgent.name}
                  </h3>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                    {selectedAgent.mbti}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-fg)]">
                  {selectedAgent.role}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedAgent.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="hidden space-y-4 text-center lg:block lg:text-left">
              <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--muted)] sm:h-36 sm:w-36 sm:rounded-[30px] lg:mx-0">
                {selectedAgent.avatar ? (
                  <Image
                    src={selectedAgent.avatar}
                    alt={selectedAgent.name}
                    fill
                    sizes="144px"
                    priority
                    quality={70}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-5xl text-[var(--accent-strong)]">
                    {getFallbackLabel(selectedAgent)}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                  Team Role
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-fg)]">
                  {selectedAgent.role}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                {selectedAgent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="section-kicker hidden lg:inline-flex">Agent Profile</p>
              <div className="hidden flex-col items-start gap-3 lg:flex lg:flex-row lg:flex-wrap lg:items-end">
                <h3 className="font-display text-[2.2rem] leading-[0.94] text-[var(--fg)] sm:text-[3.4rem]">
                  {selectedAgent.name}
                </h3>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-strong)]">
                  {selectedAgent.mbti}
                </span>
              </div>

              <p className="mt-3 hidden text-[0.98rem] leading-7 text-[var(--muted-fg)] lg:block lg:text-[1.02rem] lg:leading-8">
                {selectedAgent.role}
              </p>

              <div className="agents-stats-grid mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">生日</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--fg)]">{formatBirthday(selectedAgent.birthday)}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">年龄</p>
                  <p suppressHydrationWarning className="mt-2 text-sm font-semibold text-[var(--fg)]">
                    {calcAge(selectedAgent.birthday, today)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">性别</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--fg)]">{selectedAgent.gender}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">偏好领域</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--fg)]">{selectedAgent.tags.join(' / ')}</p>
                </div>
              </div>

              <div className={`agents-bio mt-5 space-y-3 sm:mt-6 sm:space-y-4 ${isMobileExpanded ? 'agents-bio--expanded' : 'agents-bio--collapsed'}`}>
                {selectedAgent.desc.split('\n\n').map((paragraph) => (
                  <p key={paragraph} className="agents-bio__paragraph text-[0.96rem] leading-7 text-[var(--muted-fg)] sm:text-[0.98rem] sm:leading-8">
                    {paragraph}
                  </p>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsMobileExpanded((prev) => !prev)}
                className="button-secondary mt-4 px-4 py-2 text-xs sm:hidden"
                aria-expanded={isMobileExpanded}
              >
                {isMobileExpanded ? '收起完整档案' : '展开完整档案'}
              </button>

              <div className={`agents-hobbies mt-5 sm:mt-6 ${isMobileExpanded ? 'agents-hobbies--expanded' : 'agents-hobbies--collapsed'}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                  爱好
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAgent.hobbies.map((hobby) => (
                    <span
                      key={hobby}
                      className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-sm text-[var(--secondary)]"
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}
