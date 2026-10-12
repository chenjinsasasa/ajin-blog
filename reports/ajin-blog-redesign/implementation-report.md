# ajin.blog 三页改版 · 实施回执

## 结论

状态：**本地实现完成**。首页、文章详情模板、`/team`均已实现；项目检查、真实浏览器截图矩阵、交互与本地生产模式冒烟通过。未覆盖环境逐项列于第7节及`acceptance.md`，不宣称全部环境验收完成。
页面：首页 / 文章详情 / 团队档案
是否已部署：**否**。未stage、commit、push或部署，HEAD仍为`dee5bbe`。

## 1. 环境与基线

- 仓库：`/Volumes/Sata/ChenjinProjects/active/ajin-blog`；分支`main`；初始及结束HEAD `dee5bbe`。
- Next.js14.2.35 / React18 / TypeScript / 原Tailwind及CSS；npm + 原package-lock；复用已有node_modules，无新增依赖。
- 规则：用户指令、仓库`AGENTS.md`、任务包`CODEX_TASK.md`及三页规格；任务包解压至`/tmp/ajin-blog-visual-task-20261012/ajin-blog-codex-taskpack-v1`读取，未把参考整图导入生产。
- 旧差异保护：初始dirty列表在`baseline.md`；初始diff备份与375个原dirty/文章/头像文件SHA256基线存于`/tmp`，结束核对0变化，证据`preservation-results.json`。原AGENTS、package.json、后台、编排文档等均未被本轮修改。
- 同期外部变化：验收中新增`content/progress/2026-10-12-progress.mdx`、同名brief/cover及cover优化manifest差异；本轮没有生成文章/封面、修改这些文件、暂存或回退它们。其到达导致最终公开文章数与初轮截图不同，最终截图使用当前真实内容。
- 不存在根README.md / DESIGN.md；没有独立搜索、Archive页或工作日志后端，不据参考图新增这些功能。

## 2. 实际路由与数据来源

| 项目 | 真实路径 / 文件 | 复用或变化说明 |
|---|---|---|
| 首页 | `/` → `app/page.tsx` | 真实最新文章两卡、去重公开近期记录、轻量索引与真实成员 |
| Archive入口 | `/#blog` | 原query参数area/stage/project/author/month、折叠筛选与更多保留；`/#about`保留到关于索引 |
| 文章详情模板 | `/blog/[slug]` → `app/blog/[slug]/page.tsx` | slug/metadata不改，真实封面/摘要/元信息，无图可读 |
| 正文渲染 | `lib/posts.ts` → content；`compileMDX` | 沿用next-mdx-remote、GFM、rehypeSlug、prettycode、Pre/Table/ArticleImage/Video；窄化同名首H1保留旧hash，异名H1降级保留文字 |
| `/team` | `app/team/page.tsx` / `components/AgentsView.tsx` | 默认阿锦、原顺序10位；桌面完整索引/手机原生select；原无成员URL协议 |
| 成员资料/头像 | 新共享`lib/team.ts` / 原`public/avatars/*` | AGENTS原文字段逐字抽取，原头像/生日/年龄算法不变；首页复用前三位 |
| 原筛选/喜欢/上下篇 | `PostsView`、`/api/posts`、`LikeButton`、`getAdjacentPosts` | 分页仍6篇；公开列表及公开上下篇收紧为progress或public；私密正文guard/API不改；原私密日记入口保留 |
| 置顶文章 | 原PINNED_SLUG `2026-04-03-hello` | 独立轻量“从这里开始·置顶档案”链接随筛选显示；总数包含它，分页posts/pinnedPost字段保持原协议 |

## 3. 变更清单

| 文件 / 组件 | 修改目的 | 与任务有关的差异 | 是否影响其他页面 |
|---|---|---|---|
| `app/globals.css` / `app/redesign.css` | 黑白金与编辑式公共底座 | 系统字体/衬线标题、容器、细线、按钮、焦点、响应式；移除原远程字体CSS依赖 | 共用公开前台；后台独立入口不导入 |
| `app/layout.tsx` / `components/Header.tsx` | 统一品牌与导航/页脚 | ajin.blog文字品牌；真实Archive/Team/主站；克制页脚 | 三页及原前台404共享 |
| `app/page.tsx` | 简化首页 | 保留原标题/简介；两张主要文章、真实记录、领域/月索引、团队预览与私密入口 | 仅首页 |
| `components/PostCard.tsx` / `PostsView.tsx` | 精简文章展示并保留能力 | 两张封面卡；更多转紧凑文字条目；高级筛选折叠；错误/重试；置顶入口/计数一致 | 首页归档 |
| `components/HomeFrame.tsx` | 锚点定位适应reduced-motion | 减少动态模式使用auto而非smooth，原hash入口保留 | 首页/团队 |
| `lib/postPresentation.ts` / `app/api/posts/route.ts` | 公开预览边界一致 | isPublicPost用于列表、索引、分页；原参数和schema保留，未公开日记元数据不进入公开结果 | 公开列表API；未触碰后台API合同 |
| `app/blog/[slug]/page.tsx` / `article.css` | 完整长文阅读空间 | 封面标题区、真实资料、正文/目录、原喜欢/上下篇、短文居中 | 全部原文章slug |
| `components/ArticleTOC.tsx` / `lib/articleHeadings.ts` | 真实章节导航 | DOM真实ID、滚动当前项、移动折叠、H1渲染约束和旧hash保留 | 文章详情 |
| `components/ArticleActions.tsx` | 可用复制/分享 | 当前真实URL；成功/拒绝/不支持/取消有反馈；无新后端 | 文章详情 |
| `components/CoverImage.tsx` | 封面暂不可用边界 | 卡片稳定缺图提示、Hero隐藏失败图；不冒用其他封面或改provenance | 首页/文章封面 |
| `app/team/page.tsx` / `team.css` / `AgentsView.tsx` / `lib/team.ts` | 原成员完整档案 | 全量索引、原图资料、窄屏select、可见焦点/选中语义、缺图降级 | 团队页及首页数据复用 |
| `public/hero/workshop-engraving.webp` | 接入用户指定首页顶部图 | 1600×900，413286B；从指定原图衍生，原文件未改动 | 首页Hero |
| `reports/ajin-blog-redesign/*` | 按模板交付 | baseline/plan/acceptance/本回执、可复跑检查、原始JSON/日志/真实截图 | 不进入产品流程 |

## 4. 页面完成情况

| 页面 | 已完成区域 | 数据保真结果 | 与参考图的合理差异 | 未完成项 |
|---|---|---|---|---|
| 首页 | 工坊Hero/两卡/近期记录/索引/轻团队/旧四入口 | 文章标题摘要日期/计数来自当前数据，成员同源，置顶与索引复验一致 | 保留原三行标题，Hero自然更高；无人工精选标记故称最新文章；按月沿用原能力；不照抄虚构导航/动物模型成员 | 无关键实现缺项；纯旧截图缺口见第7节 |
| 文章 | 标题摘要元信息/封面/完整正文/目录/资料/复制/原喜欢上下篇 | 原文文件与媒体组件不改；真实H2/H3，单主H1；无虚构更新/版本状态 | 真实长标题摘要自然增高；原中文编号不叠加装饰；不同文章使用各自原封面，无封面采用干净标题区 | 真实私密解锁/native分享/公开正文媒体真样例未运行 |
| 团队 | 左10位索引/原方形画像/完整简介资料/工作之外/移动选择 | 原数据抽取逐字一致；10位逐字段/原avatar比对与切换通过 | 仓库原头像与示意人物构图不同，保留完整原图；原性别字段也保留，不按示意图省略 | OS原生选项弹窗绘制/真机跨浏览器未验证 |

## 5. 验证

| 检查 | 实际命令 / 操作 | 结果 | 证据 |
|---|---|---|---|
| 类型 | `npx tsc --noEmit`；最终build再次类型验证 | 通过 | `typecheck.log` / `final-build.log` |
| 项目现有检查 | `npm run verify` | 通过（1可选日志回放跳过） | `verify.log`：57pass/0fail/1skip；含lint/build/frontmatter/cover，不重复独立校验 |
| 最终生产构建 | `npm run build` | 通过 | `final-build.log`；当前191篇内容，197静态页面；仅既有ArticleMedia警告 |
| 真实浏览器布局 | `QA_PAGES=home,article,team node .../browser-qa.cjs`；修正QA自身视口后交互单跑 | 通过 | `browser-qa-summary.json`，15个布局视口；初轮脚本错误和纠正证据均保留 |
| 真实文章/目录 | 长文、短文、零目录、无封面；代码/表格独立滚动与复制 | 通过 | `browser-results-all-interactions.json` / `article-content-edges.json` |
| 全部成员切换 | 10位逐字段与原图比对，Space/焦点/刷新/手机select/非默认长档案 | 通过 | `browser-supplement.json` |
| 筛选/更多/错误回归 | 原query、stage=repair、无结果/清除、2→8、synthetic503后重试 | 通过 | `browser-results-all-interactions.json` / `browser-supplement.json` |
| 置顶/公开边界 | `node .../home-index-recheck.cjs` | 通过 | `home-index-recheck.json`：总数/四领域/置顶月份/API一致、日记只返回public |
| 封面失败 | `node .../cover-failure-check.cjs` | 通过（合成请求失败） | `cover-failure-results.json`；不修改源资产；无破图 |
| H1/重名锚点契约 | 合成AST断言 | 通过 | `heading-contract-results.json`；与真实7节目录定位分开计证 |
| 键盘/对比度/窄屏 | Tab/Space、320/390、纯黑文字抽样、等效reflow | 通过（限定范围） | `browser-supplement.json`，原生菜单200%未运行 |
| 本地生产运行 | 最终build后`next start --port 3218` + `node .../production-smoke.cjs` | 通过 | `production-smoke.json`；三页200、单H1、无pageerror、首屏 |
| 旧改动与内容保真 | SHA256 + AGENTS原文字对照 + `git diff --check` | 通过 | `preservation-results.json`；375文件0变化；HEAD未变 |

## 6. 截图

浏览器Chrome154.0.8037.99，开发矩阵URL `http://127.0.0.1:3217`，生产首屏`http://127.0.0.1:3218`。完整索引`/screenshots`及`screenshot-index.json`，所有运行图均来自真实浏览器，不把参考图作结果。

| 页面 / 状态 | URL路径 | 视口 | 截图文件 | 已人工查看 |
|---|---|---|---|---|
| 首页当前完整页/首屏 | `/` | 1586×992 | `screenshots/home-1586x992-default.png` / `...-default-first.png` | 是 |
| 最新文章首屏 | `/blog/2026-10-11-progress` | 1586×992 | `screenshots/article-latest-1586x992-first.png` | 是 |
| 真实长文首屏/全文 | `/blog/2026-08-31-progress` | 1586×992 | `screenshots/article-1586x992-default-first.png` / `...-default.png` | 是 |
| 团队默认首屏/完整档案 | `/team` | 1536×1024 | `screenshots/team-1536x1024-default-first.png` / `...-default.png` | 是 |
| 三页常规桌面/中宽/手机/极窄 | 三页实际路由 | 1440×1000 / 1024×768 / 390×844 / 320×800 | `screenshots/{home,article,team}-<尺寸>-default.png` | 是（重点视口逐图，其他结合DOM矩阵） |
| 手机目录/非默认成员 | 长文 / `/team` | 390×844 | `article-390x844-toc-toggled.png` / `team-390x844-gugu-full.png` | 是 |
| 代码/表格边界 | 长文 | 1440×1000 / 390×844 | `article-code-...-boundary.png` / `article-table-...-boundary.png` | 是 |
| 无封面/零目录 | 两篇历史真实公开文章 | 1440×1000 / 390×844 | `article-no-toc-no-cover-...png` / `article-short-no-cover-one-heading-...png` | 是 |
| 失败/恢复 | 首页 / 团队 / 文章 | 1440×1000 / 390×844 / 1586×992 | `home-1440x1000-load-error.png`、`team-390x844-avatar-error.png`、`*-1586x992-cover-error-synthetic.png` | 是/DOM断言 |
| 最终生产三页首屏 | 三页实际路由 | 各参考尺寸 | `screenshots/{home,article,team}-production-<尺寸>-first.png` | 是 |

## 7. 已知缺口与风险

- 缺失素材：本轮Hero已接入用户指定独立原图；历史无封面文章保留无图版式；外部新增10/12封面曾暂不可用、后到位，UI失败状态已补测，不替换其来源。
- 未取得纯改版前浏览器截图，不能宣称有前后像素差基线；已对三张确认图及真实运行图进行结构/层级/密度评审。
- 未运行真机/Safari/Firefox、原生Chrome菜单200%、OS原生select弹窗绘制、真实私密解锁、真实喜欢后端写入、真实剪贴板/native分享面板。已完成的是Chrome多视口、等效reflow及安全mock/stub，边界不混淆。
- 公开progress没有适合的正文图片/视频与重名标题实际样例；保留原媒体组件/MDX映射，标题重复用明确合成输入验证，没有读取私密正文补样例。
- 既有ArticleMedia的no-img-element及Browserslist过期提示保留；部分外部Vercel debug遥测网络失败独立记录，无新增产品JS/hydration阻塞。
- 剩余建议：若后续安排上线验收，再在授权范围验证目标浏览器/真实设备与线上/CDN；本轮不把这些变成部署或真实数据写入。

## 8. 最终边界

- 原文章内容、成员字段、原始头像、数据模型、鉴权、喜欢API、原MDX媒体、部署配置及锁文件未改。
- 新增依赖：无；未生成替代项目；未新增后台/独立业务路由/模型API。
- 真实线上写入：无。喜欢仅synthetic route，复制仅局部stub，未发信/发布/操作生产。
- 提交/推送/部署：均未执行。全部UI变更留在当前工作区供审阅。
- 首页原图来源：`/Users/chenjin/Downloads/ChatGPT Image Oct 12, 2026, 07_14_34 PM.png`；原始PNG仍在用户指定位置且未修改，衍生文件使用项目既有sharp生成。原图SHA256：`c06d6ac4a21e0e84d6da75272c883936b89b8491a8950f98f5280e35c228aa8a`。
