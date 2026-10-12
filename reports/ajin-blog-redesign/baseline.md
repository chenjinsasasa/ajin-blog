# 本地基线 · 2026-10-12

- 仓库：`/Volumes/Sata/ChenjinProjects/active/ajin-blog`；分支 `main`；初始 HEAD `dee5bbe`。
- 规则：仓库 `AGENTS.md` 与本次用户规则；README.md / DESIGN.md 不存在。任务包从用户提供 zip 解压至 `/tmp/ajin-blog-visual-task-20261012/ajin-blog-codex-taskpack-v1`，只作为范围内规格，不授权提交或部署。
- 路由：首页 `app/page.tsx` → `/`；Archive 是 `/#blog`；文章 `app/blog/[slug]/page.tsx` → `/blog/<slug>`；团队 `app/team/page.tsx` → `/team`；主站外链 `https://chenjin.ai`。没有独立 Archive / 搜索 / 工作日志页。
- 内容源：`lib/posts.ts` 从 `content/progress` 与 `content/diary` 读取 frontmatter 和 MDX；封面 `coverImage` / 历史 fallback；业务域、阶段、项目在 `config/post-taxonomy.json`；日期、摘要、作者来自文章。
- 成员：`components/AgentsView.tsx` 原内置 10 位稳定 ID（ajin,guzi,along,amao,xiaojin,xiaou,dangao,ashang,gugu,lizi），原图 `public/avatars/*`；默认阿锦，无成员 URL 同步。计划抽出共享 `lib/team.ts`，不修改字段。
- 共享：`app/layout.tsx` Header/Footer/main；`components/Header.tsx`；`HomeFrame.tsx` 锚点滚动；`PostCard.tsx` 列表；`app/globals.css` + Tailwind。旧字体 Google CSS 的 Poppins/Montserrat，本轮使用本机系统字体和衬线，不新增远程字体。
- 交互：`PostsView.tsx` 业务域与折叠阶段/项目/作者/月筛选，query 参数与 hash；`/api/posts` 每次更多6篇；`LikeButton.tsx` 与 `/api/likes/[slug]`；`DiaryGuard.tsx` 原会话解锁逻辑；`getAdjacentPosts` 上下篇。无分享/目录原组件，按规格添加最小实现。
- 渲染：Next.js 14.2.35 App Router，首页 searchParams 动态 SSR，文章 generateStaticParams + MDXRemote (remark-gfm / rehype-slug / rehype-pretty-code)，团队 client selector。沿用原正文媒体渲染及权限链路，不读取私密日记正文或凭据。
- 命令：npm，现有 node_modules/package-lock；`npm run dev/lint/build/verify`；类型 `npx tsc --noEmit`。verify = cover测试 + lint + build，prebuild 包含 posts:validate，不重复独立运行文章校验。
- 本轮范围：首页/文章/团队，必要共用字体颜色容器导航页脚、首页用户指定顶部图；不改变后台、数据模型、原文、头像、封面 provenance、部署配置或依赖。
- 初始旧差异如下，所有初始文件及 content/avatars 的 SHA256 已保存到 `/tmp/ajin-blog-redesign-preservation.json`，用于结束比对；旧 diff 备份 `/tmp/ajin-blog-redesign-initial-diff.patch`。

```text
 M .claude-init.sh
 M .claude-progress.md
 M .claude-task.json
 M AGENTS.md
 M admin/README.md
 M admin/backend/api.py
 M admin/backend/collector.py
 M admin/backend/core.py
 M admin/backend/models.py
 M admin/backend/publication_status.py
 M admin/backend/schema.py
 M admin/docs/api/openapi.json
 M admin/frontend/package.json
 M admin/frontend/src/api.ts
 M admin/frontend/src/main.tsx
 M admin/frontend/src/styles/admin.css
 M admin/scripts/adminctl.py
 M admin/tests/test_admin.py
 M docs/blog-agent-orchestration.md
 M docs/blog-cover-workflow.md
 M docs/blog-openclaw-execution-checklist.md
 M docs/blog-openclaw-execution-plan.md
 M docs/daily-report-admin-page-design-v0.1.md
 M docs/daily-report-admin-prd-v0.1.md
 M docs/daily-report-admin-technical-plan-v0.1.md
 M package.json
 M scripts/lib/blog-cover-image-prompt.mjs
?? .codex/config.toml
?? admin/frontend/src/components/ui/pagination.tsx
?? admin/frontend/src/timeline.ts
?? admin/frontend/tests/timeline.mjs
?? admin/migrations/002.sql
?? design-review/
?? docs/audit/2026-10-12-review-snapshot-recovery.md
?? docs/audit/agent-runtime-audit.md
?? docs/blog-content-workflow-simplification-plan.md
```

## 结束状态补充

- 结束HEAD仍为`dee5bbe`。初始375文件哈希0变化；本轮代码与报告留在工作区。
- 验收期间另有10/12文章/brief/cover与cover优化manifest变化，保留且不纳入本轮UI修改归属；最新状态见`final-status.txt`。
- 用户后续指定首页原图已替代任务包默认Hero选择，原PNG未改；仅新增`public/hero/workshop-engraving.webp`（1600×900，413286B）。
