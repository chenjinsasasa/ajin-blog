import crypto from 'node:crypto'

export const BRIEF_PROVENANCE_VERSION = 'openclaw-text-v1'
export const LEGACY_BRIEF_CUTOFF = '2026-09-19'
const fields = ['coreEventZh', 'primarySubjectZh', 'keyActionZh', 'resultZh', 'tensionZh',
  'industrialMetaphorZh', 'supportingSymbolsZh', 'sceneDescriptionZh', 'focalElementsEn', 'imagePromptEn']
export const textHash = (text) => crypto.createHash('sha256').update(text).digest('hex')

export function validateVisualBrief(brief) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief) ||
      Object.keys(brief).some((key) => !fields.includes(key))) throw new Error('visual brief 字段不合法')
  for (const key of fields) {
    if (['supportingSymbolsZh', 'focalElementsEn'].includes(key)) {
      if (!Array.isArray(brief[key]) || brief[key].length !== 3 ||
          !brief[key].every((s) => typeof s === 'string' && s.trim() && (key !== 'focalElementsEn' || s.length <= 140))) {
        throw new Error(`${key} 必须包含恰好 3 个有效字符串`)
      }
    } else if (typeof brief[key] !== 'string' || !brief[key].trim()) throw new Error(`visual brief 缺少 ${key}`)
  }
  if (brief.imagePromptEn.length > 500) throw new Error('imagePromptEn 超过 500 字符')
}

export function validateBriefArtifact(artifact, { config, postPath, rawPost, body, date, current = false }) {
  if (!artifact || artifact.briefVersion !== config.briefVersion || artifact.promptVersion !== config.promptVersion) {
    throw new Error('visual brief 内容版本不匹配')
  }
  if (artifact.schemaVersion === 1 && !current) {
    if (!date || date > LEGACY_BRIEF_CUTOFF || artifact.generatedBy !== 'codex' ||
        artifact.executionMode !== 'full-article-analysis') throw new Error('历史 brief 来源合同无效')
  } else if (artifact.schemaVersion === 2) {
    if (artifact.provenanceVersion !== BRIEF_PROVENANCE_VERSION || artifact.generatedBy !== 'openclaw' ||
        artifact.executionMode !== 'configured-model' || artifact.provider !== 'claude' ||
        artifact.model !== 'claude-sonnet-4-6' || artifact.api !== 'anthropic-messages') {
      throw new Error('OpenClaw brief 来源合同无效')
    }
  } else throw new Error('需要当前 OpenClaw brief 来源合同')
  if (artifact.postPath !== postPath || artifact.postSha256 !== textHash(rawPost) ||
      artifact.bodySha256 !== textHash(body)) throw new Error('visual brief 路径或正文哈希已过期')
  validateVisualBrief(artifact.visualBrief)
  return artifact
}
