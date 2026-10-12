# 本地浏览器验收记录

## 环境与边界

- 项目 URL：`http://127.0.0.1:3217`，`next dev` 本地开发模式。
- 浏览器：本机 Google Chrome `154.0.8037.99`，Playwright 控制，headless / `--disable-gpu`，每个视口独立无持久化 context，`reducedMotion: reduce`。
- 截图前等待 `document.fonts.ready` 与首屏图片完成；截图使用 disabled animations。
- 所有 `/api/likes/**` GET/POST 均被浏览器 route 截获为本地 synthetic `likes:12/13`，无真实喜欢后端写入。剪贴板使用局部 async stub，未读取或写入真实剪贴板。
- 内容边界候选只扫描 `content/progress` 的公开内容；未扫描或读取 `content/diary` 正文，未读取凭据、真实 cookie、真实 localStorage。
- 验收脚本、JSON、截图只写入本报告目录，未修改产品代码、文章、头像或数据。

## 改版前截图缺口

**未取得纯改版前浏览器截图**。首次 Playwright 内置 Chromium 未安装；改用本机 Chrome 后首个本地请求编译/返回较慢，随后首张截图超时。期间实现已并行开始，无法再把页面称为纯旧基线；没有从 Git 恢复旧文件。脚本保留为 `capture-baseline.cjs`，其唯一可用的浏览器烟雾截图 `browser-smoke.png` 不是产品截图，也不作视觉基线。

## 测试数据

- 真实长文与代码/表格：`/blog/2026-08-31-progress`（公开 9,582 字符正文、7 个 H2、代码块和表格）。
- 真实短文 / 单标题 / 无专属封面字段：`/blog/2026-03-11-guzi-avatar`。
- 真实无目录 / 无专属封面字段：`/blog/2026-04-26-progress`。
- 这些“无专属封面”文章是否显示历史 fallback，按实际渲染记录，不能冒充无图片测试。

## 执行状态

正式矩阵与交互均已执行；汇总入口为 `browser-qa-summary.json`，末段记录收尾修复与最终复验。

## 正式执行结果

汇总以 `browser-qa-summary.json` 为入口，保留所有原始 JSON 和可复跑脚本。三页布局 15/15 通过，常规交互 15/15 通过，团队/缩放/键盘/对比度/404 补充 14/14 通过；真实代码与表格边界补充 4/4 通过。P0/P1 功能问题中，首页固定文章与索引计数不一致已反馈主 agent，最终修复/复验单列在下方。

| 场景 | 首页 | 真实长文 | 团队档案 |
|---|---|---|---|
| 参考尺寸 | 1586×992 首屏+全文，通过 | 1586×992 首屏+全文，通过 | 1536×1024 首屏+完整档案，通过 |
| 常见桌面 1440×1000 | 通过 | 通过 | 通过 |
| 中等宽度 1024×768 | 通过 | 通过；目录收起 | 通过；成员选择收纳 |
| 手机 390×844 | 通过 | 通过；另有展开目录截图 | 通过；原生 select、非默认完整档案 |
| 极窄 320×800 | 通过，无文档横向溢出 | 通过，仅代码/表格独立横向滚动 | 通过，无文档横向溢出 |
| 200% 等效 reflow | 通过 | 通过 | 通过 |

三页每个正式矩阵视口均为一个 `main h1`，`document.documentElement.scrollWidth` 不超过 CSS 视口宽度。长文以完整截图证实正文、喜欢区、上下篇与页脚均自然可达；截图前逐屏滚动使既有 lazy 媒体实际加载，再回到顶部，不以空白头像作为视觉结果。

实际完成的交互：

- 首页默认两张文章，更多从 2 篇增至 8 篇；人为拦截一次本地 `/api/posts` 为 503 后显示失败/重试，第二次请求真实本地 API 成功；无结果、清除筛选与 `stage=repair` 高级筛选表单均通过。
- 长文目录 7 项全部绑定真实渲染的 H2 ID，无重复 ID。点击第二节后标题顶部 `104.16px`，Header `73px`，当前项同步正确。真实最新文章 `2026-10-11-progress` 的目录为 5 项；最终首屏已重新捕获。
- 复制成功、复制失败、分享在无原生 `navigator.share` 时回退复制均有正确反馈；使用局部 stub，无真实剪贴板访问。原有代码复制同样在桌面/手机通过局部 stub。
- 喜欢全部 route mock，12→13，按钮禁用为已喜欢；没有对真实记录写入。
- 团队 10 位顺序和稳定 ID，与共享 `AGENTS` 的姓名、职责、完整简介、性别、MBTI、领域、爱好、原头像路径逐位核对；全部同步，焦点留在被操作按钮。Space 键、刷新默认阿锦、无效可选参数回到合法默认、手机 select 10 个真实选项均通过。原年龄计算逻辑由主 agent 源码保真检查，默认生日/年龄也在完整截图可见。
- 非默认咕咕完整档案在桌面/手机均捕获；本地模拟头像请求失败后显示该成员姓名占位，无破图或冒用别人的头像。
- 真正无封面字段的两篇历史公开文章在新详情模板中实际无 Hero 图片；单标题/零目录均收起目录，正文居中，无空白大侧栏。
- 真实长文代码与多个表格在 1440 和 390 下独立滚动到底，文档本身没有横向溢出。仓库公开 `content/progress` 当前没有正文图片样例，也没有重名 H2/H3；未为测试改写文章，正文媒体组件保真及合成标题边界由主 agent 的源码/专项检查补充。
- 主导航链接仍为 `/#blog`、`/team`、`https://chenjin.ai`，没有假路由或假搜索；键盘 Tab 焦点可见。文字对纯黑背景抽样对比度 8.33:1–18.26:1，Hero 遮罩另经视觉检查；不作 WCAG 认证声明。
- `/blog/qa-synthetic-missing-post` 真实返回 404。

## 命令、退出与原始证据

| 命令 | 退出 | 证据与说明 |
|---|---:|---|
| `node reports/ajin-blog-redesign/ready-first.cjs` | 0 | home/team 初版 ready 首屏，属于改版后页面 |
| `QA_PAGES=home,team QA_MATRIX_ONLY=1 node reports/ajin-blog-redesign/browser-qa.cjs` | 0 | `browser-results-home-team-matrix.json` |
| `QA_PAGES=home,article,team node reports/ajin-blog-redesign/browser-qa.cjs` | 1 | 完成全部矩阵及主要交互后，冗余团队检查因 QA 脚本仍处于手机视口而点不到隐藏桌面索引；`browser-results-home-article-team.json` 保留原始 fatal |
| `QA_INTERACTIONS_ONLY=1 node reports/ajin-blog-redesign/browser-qa.cjs` | 0 | 修正 QA 自身视口重置与中文 hash 解码；`browser-results-all-interactions.json` 全部通过 |
| `node reports/ajin-blog-redesign/browser-qa-supplement.cjs` | 0 | `browser-supplement.json`；头像 URL 比对的 QA 初轮误判由已采集绝对 URL 正规化纠正，细节记录在 JSON |
| `node reports/ajin-blog-redesign/article-final-first.cjs` | 0 | `article-final-first.json`；最新/长文最终首屏与真实 TOC 数量 |
| `node reports/ajin-blog-redesign/article-content-edges.cjs` | 0 | `article-content-edges.json`；4 项代码/表格及代码复制边界通过 |
| `node reports/ajin-blog-redesign/aggregate-qa.cjs` | 0 | `browser-qa-summary.json` / `screenshot-index.json` |

外部请求观察：保留的 Vercel Analytics / Speed Insights 开发脚本 `https://va.vercel-scripts.com/.../script.debug.js` 在部分视口发生 `net::ERR_CONNECTION_CLOSED`；完整 URL、错误和请求都留在 raw JSON。未发现新的产品 JavaScript 异常或 hydration 错误，三页布局及交互可继续；汇总把这组既有外部遥测失败独立列出，没有删掉证据。

## 视觉对照与真实数据差异

已人工打开三张 confirmed reference 和运行截图对照。正式查看入口：

- `screenshots/home-1586x992-default-first.png` 与 `home-1586x992-default.png`。
- `screenshots/article-latest-1586x992-first.png`；长文 `article-1586x992-default-first.png` 与 `article-1586x992-default.png`。
- `screenshots/team-1536x1024-default-first.png` 与 `team-1536x1024-default.png`。
- 手机：`home-390x844-default.png`、`article-390x844-default.png`、`article-390x844-toc-toggled.png`、`team-390x844-default.png`、`team-390x844-gugu-full.png`。
- 代码/表格：`article-code-390x844-boundary.png`、`article-table-390x844-boundary.png` 及同名 1440×1000 版本。

与图稿的明确差异及理由：保留已审核首页三行标题，因此 Hero 比图稿两行示例更高；真实文章长标题和原摘要自然增高，不人为截短正文；文章中原有中文章节编号保留，不叠加英文小标题；团队使用仓库原始阿锦及其他成员图，构图与示意头像不同但不生成替代；索引沿用按月能力，不新增按年系统；导航只展示真实存在的入口，未照抄图中的 Projects/Research/Notes/About/搜索。整体保持黑色主体、浅白阅读文字、少量黄铜线与主入口、真实工坊背景、两张主要文章和克制侧索引。

## 未运行项与限制

- 未取得纯改版前截图；原始规则、dirty 状态与保真证据以主 agent 基线及 SHA256 检查为准。
- 原生 Chrome 菜单 200% 未操作；完成的是 `720×500` CSS 视口、`deviceScaleFactor:2` 的 `1440×1000` 物理输出等效 reflow 检查，截图命名含 `200percent-equivalent`，不把它称为原生菜单缩放测试。
- headless 无法证明操作系统原生 select 弹出选项的绘制；原生控件选项和实际选择/键盘行为已验证，保留 focus 截图。
- 没有真实手机/Safari/Firefox 验收；390/320 是本机 Chrome 的 CSS 视口。
- 未访问私密日记正文/实际解锁、未对真实喜欢服务写入、未操作真实剪贴板。
- 不进行 commit、push 或 deploy；浏览器状态只代表本地开发构建。

## 收尾修复与最终复验

- 首页固定文章：保持 API 原有非置顶分页及 `pinnedPost` 字段；在对应筛选结果的卡片后显示单条“从这里开始 · 置顶档案”真实链接，计数包含这篇文章，仍只有两张主要文章卡。`node reports/ajin-blog-redesign/home-index-recheck.cjs` exit 0；默认、四个领域、置顶所在月份、公开日记元数据过滤、更多2→8均通过，证据 `home-index-recheck.json`。
- 内容在验收期间由其他工作新增了 `2026-10-12-progress`，计数从初轮187（含置顶）变为188。该文章/brief/cover及cover manifest不是本轮UI写入；不回退它们以保持截图数据。首张新封面曾暂时无法加载，随后原资产到位；新增 `CoverImage` 仅处理显示失败，不生成或替换文章封面，专项合成失败复验见 `cover-failure-results.json`。
- 最新首页5视口矩阵已重新捕获：`QA_PAGES=home QA_MATRIX_ONLY=1 node reports/ajin-blog-redesign/browser-qa.cjs` exit 0，证据 `browser-results-home-matrix.json`，覆盖同名首页截图。
- `/#about` 原锚点保留到轻量“关于这份档案”索引；不存在新的 About 路由。
- 最终生产构建与本地 `next start` 三页浏览器冒烟另见 `final-build.log` / `production-smoke.json`；生产端口 `3218`，开发矩阵端口 `3217`。
