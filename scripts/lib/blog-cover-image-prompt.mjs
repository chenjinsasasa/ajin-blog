function nonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`visual brief 缺少非空字段 ${field}`)
  }
  return value.trim()
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
  const style = nonEmptyString(config.motherPrompt, 'config.motherPrompt')
  const constraints = nonEmptyString(config.constraints, 'config.constraints')
  const avoid = nonEmptyString(config.negativePrompt, 'config.negativePrompt')

  const numberedElements = focalElements
    .map((element, index) => `${index + 1}. ${element.trim()}`)
    .join('\n')

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
Create one horizontal 16:9 editorial blog cover.

Locked visual style:
${style}

Content abstracted from the complete article. Show exactly three focal elements:
${numberedElements}

Their single-scene relationship:
${scene}

Composition and constraints:
${constraints}

Avoid:
${avoid}
END IMAGE GENERATION PROMPT

Before finishing, verify that the exact output path exists and is a readable PNG. Final response must end with:
CODEX_IMAGE_RESULT status=ok output=${outputPath}`
}
