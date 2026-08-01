---
name: blog-publish
description: 为 ajin-blog 生成并发布每日 progress 文章，覆盖素材汇总、作者轮值、完整正文、Codex Image 2 封面、taxonomy 与构建校验、Git 提交推送、有限修复和线上终态探测。用于每日定时写作、指定日期补跑、发布失败复验或用户要求生成“我们的进展”博客时；日记和历史封面回填不使用本 skill。
---

# Blog Publish

在博客仓库本地环境执行完整发布闭环。把 `AGENTS.md`、机器配置和终态脚本视为真相源；任何 gate 失败都停止，不用降级内容、封面或校验来换取成功。

## 1. 预检

1. 确认当前目录是 `ajin-blog`，并读取：
   - `AGENTS.md`
   - `config/post-taxonomy.json`
   - `config/blog-cover-image2.json`
   - `config/blog-cover-visual-brief.schema.json`
   - `docs/blog-cover-workflow.md`
2. 运行 `git status --short` 和 `git remote -v`。若存在与本次发布无关的修改，停止并报告；不要覆盖、暂存或提交它们。
3. 确认 `.local/blog-automation/blog-rotation.json` 存在且可解析。该目录是 Codex 副本的本地私有状态，不提交到 Git。
4. 确定 `TARGET_DATE`：
   - 明确指定日期时使用指定值。
   - 23:00–23:59 的每日任务使用北京时间今天。
   - 00:00–05:59 的补跑或复验使用北京时间昨天。
   - 其他时间没有明确日期时停止并要求给出目标日期，避免误发。
5. 固定文章路径为 `content/progress/$TARGET_DATE-progress.mdx`。若文件已存在，先判断是已发布文章、失败残留还是明确补跑；不要静默覆盖已发布内容。

## 2. 生成素材包

运行：

```bash
npm run blog:materials -- "$TARGET_DATE"
```

只使用 `.local/blog-automation/blog-materials/$TARGET_DATE-summary.md` 中可公开、证据充分的素材。完整扫描“项目覆盖清单”，出现两条以上项目线时正文至少点到每条线，可以分主次但不能只写最高权重一条。

素材来源按以下顺序取证：Codex sessions 和结构化总结、同日 Git commit、可选的 OpenClaw 历史只读材料。OpenClaw 目录不存在或停止更新时不得导致链路失败；不得把 private/internal 素材、凭据、完整聊天记录或本机敏感路径写进文章。

若 `selected_material_ids` 为空，停止发布并报告素材不足。

## 3. 确认作者

读取 `.local/blog-automation/blog-rotation.json` 的 `current_agent`，映射为 frontmatter `author`：

| 显示名 | author | 文风 |
| --- | --- | --- |
| 谷子 | `guzi` | 克制理性、结构清晰 |
| 阿龙 | `along` | 工程视角、问题与解法 |
| 阿毛 | `amao` | 调研对比、数据意识 |
| 小锦 | `xiaojin` | 产品逻辑、用户价值 |
| 阿商 | `ashang` | 商业合规、风险结论 |
| 咕咕 | `gugu` | 执行推进、阻塞与下一步 |
| 梨子 | `lizi` | 知识归纳、脉络清晰 |
| 小U | `xiaou` | 视觉体验、克制比喻 |
| 蛋糕 | `dangao` | 直接质疑、建设性收尾 |

记录本次 `AUTHOR_ID`，但此时不推进轮值。

## 4. 写完整文章

先完成整篇正文，再生成 visual brief 和封面。正文要有主线、核心矛盾、取舍和结果，不写素材流水账；明确谁完成了什么，并保持轮值作者的文风。

frontmatter 必须满足 `AGENTS.md` 与运行时 taxonomy，并包含：

- `title/date/category/businessArea/workStage/projects/tags/excerpt/author/coverImage`
- `coverSourceType: "generated"`
- `coverProvider: "codex"`
- `coverModel: "image-2"`
- `coverExecutionMode: "builtin-imagegen"`
- `coverStyle: "steam-industrial-engraving"`
- `coverPromptVersion: "steam-industrial-v2"`
- `coverBriefVersion: "full-article-v2"`
- `coverBriefPath: "content/cover-briefs/$TARGET_DATE-progress.json"`
- `coverReferenceSet: "homepage-entry-cards-v1"`

`businessArea`、`workStage` 和 `projects` 只取 `config/post-taxonomy.json` 当前批准值；`projects` 为 0–3 个，`tags` 为 1–3 个非空唯一主题词。不要修改 taxonomy 来规避文章错误。

## 5. 生成并检查封面

Codex 自动任务必须直接使用当前任务可用的内置 `image_gen`，不得从 Codex 内再启动 `codex exec`。

1. 完整阅读正文并生成 visual brief object，将它写入 `.local/blog-automation/$TARGET_DATE-visual-brief-input.json`。对象必须包含 brief schema 要求的全部字段、一个场景和恰好三个视觉焦点。
2. 让仓库脚本补齐并校验 post/body 哈希：

```bash
npm run cover:image2:brief -- --post "content/progress/$TARGET_DATE-progress.mdx" --visual-brief-json ".local/blog-automation/$TARGET_DATE-visual-brief-input.json"
```

若已有 fresh brief，可直接复用，不要重写正文或 brief。

3. 生成锁定提示词：

```bash
npm run cover:image2:generate -- --post "content/progress/$TARGET_DATE-progress.mdx" --prepare-built-in
```

只把 JSON 中 `imagePrompt` 的值传给当前任务的内置 `image_gen`。不附加参考图，不添加或删除叙事物件。生成后读取工具返回的 `$CODEX_HOME/generated_images/...` 本地路径，并目视确认恰好三个焦点、蒸汽工业时代铜版蚀刻风格、无文字和无现代设备。

若内置工具明确返回 `network error`，只允许一次线路恢复：读取准备 JSON 的 `route.current` 或 `route.to`，运行下列命令后，用新返回的同一 `imagePrompt` 重试一次。非网络错误不重试；第二次失败立即停止。

```bash
npm run cover:image2:generate -- --post "content/progress/$TARGET_DATE-progress.mdx" --prepare-built-in --failed-route "<失败 route>"
```

4. 让仓库接收并规范化内置结果，再校验单篇合同：

```bash
npm run cover:image2:generate -- --post "content/progress/$TARGET_DATE-progress.mdx" --built-in-source "<image_gen 返回的本地路径>"
npm run cover:image2:validate -- --post "content/progress/$TARGET_DATE-progress.mdx"
```

正文在 brief 后发生修改时，从 visual brief 重新开始。只允许当前 Codex 的内置 `image_gen` 和 Image 2 路径；不得使用 API key、外部图片、旧封面、截图、其他模型或 fallback。生成失败就停止并保留最先失败的错误。

## 6. 发布前门禁

依次运行：

```bash
npm run posts:validate
npm run verify
```

`posts:validate` 首次失败时最多进行一次有限修正：

- `tags` 只允许 trim、去空和去重。
- `businessArea` 只允许从当前批准值重新选择。

第二次仍失败，或 `verify` 失败，立即停止。不要继续改正文、封面、taxonomy 或其他文件来绕过 gate。

## 7. 提交、推送与终态

1. 再次运行 `git remote -v` 和 `git status --short`。
2. 只暂存本次文章、visual brief、封面和生成器实际更新的 manifest。不要提交 `.local/` 或无关改动。
3. 使用 Conventional Commit 中文标题，例如：`feat: 发布 2026-08-01 每日进展`。
4. 提交成功后运行 `git push`；push 非零时不要推进轮值。
5. push 成功后运行：

```bash
npm run blog:terminal:repair -- "$TARGET_DATE" "$AUTHOR_ID" --json
```

终态脚本只允许修复未推送 commit 和未推进轮值，然后重新运行 validator 与线上 API/详情页探测。它不得修改文章、brief、封面、frontmatter 或 taxonomy。

只有 JSON 同时满足 `status=ok` 和 `reason=terminal_gate_passed` 才算完成。成功时回复：

```text
终态校验通过，博客闭环完成：<TARGET_DATE> <AUTHOR_ID> <commit>
```

失败时只回复：

```text
博客闭环失败：<最先失败的命令或原因>
```

## 8. 安全网与只读复验

01:15 自动安全网先检查北京时间昨天的失败残留：

- 文章与 fresh brief 存在但封面缺失时，不重写正文或 brief；按第 5 节的 `--prepare-built-in` → 当前任务 `image_gen` → `--built-in-source` 续跑封面，然后执行单篇校验、发布前门禁、commit/push 和终态。
- 文章、fresh brief、素材或作者证据缺失时只报告，不补写或猜测。
- 封面已存在时不重新生成，直接执行既有的有限 push/轮值修复：

```bash
npm run blog:terminal:repair -- --json
```

自动任务读取 JSON 后自行决定通知：`status=ok` 且没有 `repair.*` evidence 时返回 `DONT_NOTIFY`；发生有限修复时简短汇报；仍失败时报告最先失败证据。不要重新生成或改写文章。

人工或迁移验收需要只读复验时，必须显式提供日期和作者，并同时使用 `--dry-run --no-write-state`：

```bash
npm run blog:terminal:repair -- "<TARGET_DATE>" "<AUTHOR_ID>" --dry-run --no-write-state --json --online-retries 1 --online-delay-seconds 0
```

只读复验不得省略目标日期，不得调用不带 `--dry-run --no-write-state` 的 repair 命令。
