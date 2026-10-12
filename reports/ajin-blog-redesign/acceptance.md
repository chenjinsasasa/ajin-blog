# 三页改版验收 · 2026-10-12

本地实现与可执行验收通过。结果只适用于记录中的环境与样例；下方未运行项不计作通过。

- 主矩阵：Chrome154.0.8037.99 + Playwright，next dev `http://127.0.0.1:3217`，三页×5视口。
- 生产冒烟：最终 `npm run build` + `next start`，`http://127.0.0.1:3218`，三页200/单H1/无pageerror及首屏截图。
- 所有喜欢GET/POST仅浏览器synthetic拦截；剪贴板局部stub；未操作真实私密解锁。
- 截图/命令/原始异常证据：`qa-notes.md`、`browser-qa-summary.json`、`home-index-recheck.json`、`cover-failure-results.json`、`production-smoke.json`、`verify.log`、`final-build.log`。

## Q01–Q40

| 项 | 结果 | 证据 / 实际边界 |
|---|---|---|
| Q01 | 通过 | baseline.md；仓库/规则/初始dirty与375文件保真 |
| Q02 | 通过 | 首页 /、文章 /blog/[slug]、/team、Archive /#blog；baseline.md |
| Q03 | 通过 | preservation-results.json；原文章/日期/头像与成员字段原文保留 |
| Q04 | 通过 | 无新业务路由、虚构人物、后台或模型成员 |
| Q05 | 通过 | 公开列表/API按isPublicPost；DiaryGuard与鉴权API无diff；实际解锁未运行，见限制 |
| Q06 | 通过 | 浏览器computed色值 #000/#EFEFEF；黄铜 #E0C787；截图 |
| Q07 | 通过 | 三页同源Header/Footer；真实导航 /#blog、/team、chenjin.ai |
| Q08 | 通过 | 三张图仅作参考；独立用户指定Hero资产；浏览器截图对照 |
| Q09 | 通过 | 系统正文/衬线标题；正文18px/1.85，手机17px/1.85 |
| Q10 | 通过 | 键盘Tab/Space焦点、320CSS宽度、200%等效reflow；原生菜单200%另列未运行 |
| Q11 | 通过 | 简化Hero/两张卡/记录/索引/轻团队入口 |
| Q12 | 通过 | 用户指定图，1600×900 WebP 413286B；真实CTA和静态遮罩 |
| Q13 | 通过 | 默认恰好两张真实最新文章；封面失败专项；长标题可读 |
| Q14 | 通过 | 公开文章去重后最多4条最新记录；未伪造日志 |
| Q15 | 通过 | home-index-recheck.json；默认/四领域/置顶月份数与API一致；沿用月归档 |
| Q16 | 通过 | 更多2→8、stage=repair、清除/无结果、synthetic503后真实本地重试 |
| Q17 | 通过 | 首页AGENTS.slice(0,3)共用来源；真实原头像 |
| Q18 | 通过 | 标题/摘要/作者/日期/reading-time/分类均来自原数据 |
| Q19 | 通过 | 15视口单一main H1；窄化重复首H1且保留hash；heading-contract-results.json |
| Q20 | 通过 | 真实长文2026-08-31-progress、短文2026-03-11-guzi-avatar完整截图 |
| Q21 | 通过 | 7个真实目录锚点；定位104.16px/Header73px；重复标题合成边界断言 |
| Q22 | 通过 | 2026-04-26-progress零目录无封面、正文居中，无空白大侧栏 |
| Q23 | 通过 | 代码/表格独立滚动、引用/列表/长链接保留；真实正文媒体样例缺口另列 |
| Q24 | 通过 | 复制成功/拒绝、原生share不可用回退复制；上下篇排序与边界源代码核对 |
| Q25 | 通过 | LikeButton/API未改；安全route mock 12→13且禁用，无真实写入 |
| Q26 | 通过 | 左成员索引/原人物图/简介/下方资料，参考03最终结构 |
| Q27 | 通过 | 10位顺序/稳定ID/总数逐位核对；browser-supplement.json |
| Q28 | 通过 | 逐位姓名/职责/完整简介/资料/原图同步；15/15常规交互含成员循环 |
| Q29 | 通过 | 原public/avatars路径及文件哈希未变；不重画/滤镜/换图 |
| Q30 | 通过 | 数据抽取逐字一致；formatBirthday/calcAge与原HEAD一致；完整简介截图 |
| Q31 | 通过 | aria-pressed+结构金线；Space/Tab操作与焦点保留 |
| Q32 | 通过 | 原无URL状态；刷新默认阿锦/无效参数保持合法默认；缺图fallback |
| Q33 | 通过 | ≤1099原生select；单份正文、10个真实选项；手机档案/焦点截图 |
| Q34 | 通过 | verify.log：57pass/0fail/1skip；typecheck.log；final-build.log exit0 |
| Q35 | 通过 | 本地开发15视口及生产3页无新增JS/hydration阻塞；既有外部遥测失败单列 |
| Q36 | 通过 | admin独立Vite/CSS入口，原admin文件哈希未变；未对后台做视觉改动 |
| Q37 | 通过 | slug/metadata/原权限与媒体链路保留；原无独立sitemap/RSS/canonical文件未新增 |
| Q38 | 通过 | 图片尺寸/比例/sizes/lazy；仅必要Hero优先；无新增依赖/字体遥测 |
| Q39 | 通过 | 纯黑背景文字抽样8.33:1–18.26:1；键盘/320/390/等效reflow；非WCAG认证 |
| Q40 | 通过 | preservation-results.json；未stage/commit/push/deploy；无数据迁移 |

## 未运行与不适用项

| 检查 | 结果 | 原因与已有替代证据 |
|---|---|---|
| 改版前纯旧浏览器截图 | 未运行 | 首次环境/编译截图未取得后实施已开始，未恢复用户文件；已与三张已确认图对照 |
| 原生Chrome菜单200% | 未运行 | 已完成720×500 CSS/DPR2等效reflow，明确不冒充菜单缩放 |
| 真机手机、Safari、Firefox | 未运行 | 本轮使用本机Chrome多CSS视口；不是跨设备认证 |
| 私密日记真实解锁/私密正文检查 | 未运行 | 本轮不访问私密正文或凭据；guard与鉴权API无改动 |
| 真实喜欢后端写入/真实剪贴板/native系统分享面板 | 未运行 | 按任务包不触发真实写入；已验证浏览器mock/stub的状态流及失败反馈 |
| 公开正文图片/视频真实样例 | 未运行 | 公开progress无适合媒体样例；保留原ArticleImage/Video与MDX映射，未读取私密媒体 |
| 生产发布/CDN/线上回归 | 未运行 | 用户禁止自动部署，本轮仅本地实现 |
| 独立搜索、Projects/Research/Notes/About路由、按年系统 | 不适用 | 仓库原本无对应能力；不创建假入口；沿用真实/#blog和按月筛选，保留/#about锚点 |
| 桌面OS原生select选项弹窗截图 | 未运行 | headless不可证明OS绘制；DOM选项、选择、Space/Escape与焦点截图已通过 |

## 既有提示与收尾记录

- `npm run verify` 共58 tests：57通过、0失败、1跳过。跳过项是需显式IMAGE_FAILURE_LOG的历史真实生图日志回放；未提供该可选输入，不伪称已执行。
- 既有`ArticleMedia.tsx:27`的no-img-element性能提示、Browserslist数据过期提示保留；无新增lint warning。
- 部分开发截图的Vercel debug遥测请求ERR_CONNECTION_CLOSED单列在raw JSON，未删证据；没有新的产品JS/hydration异常。
- 置顶入口/计数差异已修复并复验；当前公开总数为数据推导，首页、领域和月份索引一致。
- 验收期间外部新增10/12文章和封面资产，保留这些变化；封面曾暂不可用，现有失败专项证明无破图，不替换真实资产或provenance。
