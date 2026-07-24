export function upsertCoverProvenance(rawPost, fields, removeFields = []) {
  const match = rawPost.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)$/)
  if (!match) throw new Error('文章缺少可识别的 YAML frontmatter')

  const removePatterns = removeFields.map((field) => new RegExp(`^${field}:`))
  const lines = match[1]
    .split(/\r?\n/)
    .filter((line) => !removePatterns.some((pattern) => pattern.test(line)))
  const missing = []
  for (const [field, value] of Object.entries(fields)) {
    const index = lines.findIndex((line) => new RegExp(`^${field}:`).test(line))
    const nextLine = `${field}: ${JSON.stringify(value)}`
    if (index >= 0) lines[index] = nextLine
    else missing.push(nextLine)
  }

  const coverIndex = lines.findIndex((line) => /^coverImage:/.test(line))
  if (coverIndex < 0) throw new Error('文章 frontmatter 缺少 coverImage')
  lines.splice(coverIndex + 1, 0, ...missing)
  return `---\n${lines.join('\n')}\n---${match[2]}`
}
