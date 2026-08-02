function nonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`visual brief 缺少非空字段 ${field}`)
  }
  return value.trim()
}

function compactAtSentenceBoundary(value, maxCharacters) {
  if (value.length <= maxCharacters) return value
  const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [value]
  let compact = ''
  for (const sentence of sentences) {
    const candidate = `${compact}${compact ? ' ' : ''}${sentence.trim()}`
    if (candidate.length > maxCharacters) break
    compact = candidate
  }
  if (compact) return compact
  const clipped = value.slice(0, maxCharacters + 1).replace(/\s+\S*$/, '').trim()
  return clipped || value.slice(0, maxCharacters).trim()
}

export function buildCodexImageArgs(projectRoot) {
  return [
    '-a',
    'never',
    '-s',
    'workspace-write',
    '-c',
    'model_reasoning_effort="low"',
    'exec',
    '--ephemeral',
    '--skip-git-repo-check',
    '--ignore-user-config',
    '--ignore-rules',
    '-C',
    projectRoot,
    '-',
  ]
}

export function buildCodexImagePrompt({ briefArtifact, config, outputPath }) {
  const visualBrief = briefArtifact?.visualBrief
  if (!visualBrief || typeof visualBrief !== 'object') {
    throw new Error('visual brief 缺少 visualBrief object')
  }

  const focalElements = visualBrief.focalElementsEn
  if (
    !Array.isArray(focalElements) ||
    focalElements.length !== 3 ||
    !focalElements.every((item) => typeof item === 'string' && item.trim())
  ) {
    throw new Error('visual brief focalElementsEn 必须包含恰好 3 个非空字符串')
  }

  const scene = nonEmptyString(visualBrief.imagePromptEn, 'imagePromptEn')
  const style = nonEmptyString(config.generationStylePrompt, 'config.generationStylePrompt')
  const avoid = nonEmptyString(
    config.generationNegativePrompt,
    'config.generationNegativePrompt',
  )
  const maxCharacters = Number(config.generationPromptMaxCharacters)
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1) {
    throw new Error('config.generationPromptMaxCharacters 必须是正整数')
  }
  const sceneMaxCharacters = Number(config.generationSceneMaxCharacters)
  if (!Number.isInteger(sceneMaxCharacters) || sceneMaxCharacters < 1) {
    throw new Error('config.generationSceneMaxCharacters 必须是正整数')
  }

  const elements = focalElements.map((element) => element.trim()).join('; ')
  const cleanStyle = style.replace(/[.]+$/, '')
  const cleanAvoid = avoid.replace(/[.]+$/, '')
  const compactScene = compactAtSentenceBoundary(scene, sceneMaxCharacters)
  const imagePrompt = `16:9 editorial blog cover. ${cleanStyle}. Exactly three focal elements only: ${elements}. Scene: ${compactScene} No other narrative objects. No ${cleanAvoid}.`
  if (imagePrompt.length > maxCharacters) {
    throw new Error(
      `Image 2 生成提示词超过 ${maxCharacters} 字符：${imagePrompt.length}；请缩短 visual brief`,
    )
  }

  return `Use the imagegen skill and Codex built-in image_gen to create exactly one project-bound blog cover.

Execution contract:
- Use Codex built-in image_gen only; it does not require OPENAI_API_KEY.
- Input images: none. This is pure text-to-image generation.
- Do not call scripts/image_gen.py, the OpenAI API, curl, or any external image source.
- Do not read, inspect, export, or use OPENAI_API_KEY.
- Pass only the IMAGE GENERATION PROMPT block below to image_gen.
- If built-in image_gen is unavailable or fails, stop; do not fall back.
- Copy the selected built-in result to exactly: ${outputPath}
- Save one PNG and do not modify any other project file.

IMAGE GENERATION PROMPT
${imagePrompt}
END IMAGE GENERATION PROMPT

Before finishing, verify that the exact output path exists and is a readable PNG. Final response must end with:
CODEX_IMAGE_RESULT status=ok output=${outputPath}`
}
