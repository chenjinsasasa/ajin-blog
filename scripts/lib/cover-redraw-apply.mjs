import fs from 'node:fs'

function replaceFile(filePath, contents) {
  const tempPath = `${filePath}.cover-redraw-${process.pid}-${Date.now()}.tmp`
  try {
    fs.writeFileSync(tempPath, contents)
    fs.renameSync(tempPath, filePath)
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }
}

export async function commitCoverRedrawBatch({ changes, validate }) {
  const snapshots = changes.map(({ filePath }) => ({
    filePath,
    existed: fs.existsSync(filePath),
    contents: fs.existsSync(filePath) ? fs.readFileSync(filePath) : null,
  }))

  try {
    for (const change of changes) replaceFile(change.filePath, change.contents)
    await validate()
  } catch (error) {
    for (const snapshot of snapshots) {
      if (snapshot.existed) replaceFile(snapshot.filePath, snapshot.contents)
      else if (fs.existsSync(snapshot.filePath)) fs.unlinkSync(snapshot.filePath)
    }
    throw error
  }
}

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
