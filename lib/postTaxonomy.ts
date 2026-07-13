import taxonomy from '@/config/post-taxonomy.json'

export type BusinessArea =
  | 'agent-governance'
  | 'operations'
  | 'product-experience'
  | 'research-knowledge'

export type WorkStage =
  | 'build'
  | 'validate'
  | 'operate'
  | 'repair'
  | 'research'
  | 'retrospect'

export type ProjectId =
  | 'signal-radar'
  | 'loop-harbor'
  | 'fitlens'
  | 'ajin-blog'
  | 'macos-input-method'
  | 'enterprise-agent-vertical-kit'
  | 'eomji'
  | 'figure-vault'
  | 'api-relay-monitor'
  | 'nexora'

type ProjectStatus = 'current' | 'watchlist' | 'historical'

export const BUSINESS_AREAS = taxonomy.businessAreas as Array<{
  value: BusinessArea
  label: string
}>

export const WORK_STAGES = taxonomy.workStages as Array<{
  value: WorkStage
  label: string
}>

export const PROJECTS = taxonomy.projects as Array<{
  value: ProjectId
  label: string
  status: ProjectStatus
}>

export interface PostFilters {
  category?: 'all' | 'progress' | 'diary'
  area?: BusinessArea
  stage?: WorkStage
  project?: ProjectId
  author?: string
  month?: string
}

const businessAreaValues = new Set<string>(BUSINESS_AREAS.map((item) => item.value))
const workStageValues = new Set<string>(WORK_STAGES.map((item) => item.value))
const projectValues = new Set<string>(PROJECTS.map((item) => item.value))

export function isBusinessArea(value: string | null | undefined): value is BusinessArea {
  return typeof value === 'string' && businessAreaValues.has(value)
}

export function isWorkStage(value: string | null | undefined): value is WorkStage {
  return typeof value === 'string' && workStageValues.has(value)
}

export function isProjectId(value: string | null | undefined): value is ProjectId {
  return typeof value === 'string' && projectValues.has(value)
}

export function normalizeProjects(rawProjects: unknown): ProjectId[] {
  if (!Array.isArray(rawProjects)) return []

  return rawProjects.reduce<ProjectId[]>((projects, rawProject) => {
    const project = String(rawProject).trim()
    if (isProjectId(project) && !projects.includes(project)) projects.push(project)
    return projects
  }, [])
}

export function isPostMonth(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}
