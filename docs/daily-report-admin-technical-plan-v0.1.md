# 日报管理后台：本机技术方案 V0.1

日期：2026-09-22。状态：设计草案；独立后台、本机使用、采用开源 shadcn 风格后台基础项目为用户已确认方向。本稿未安装依赖、创建数据库或启动服务。

关联：[PRD](daily-report-admin-prd-v0.1.md)、[页面结构](daily-report-admin-page-design-v0.1.md)。文中工程目录、命令与接口均为拟定合同，不是现有可执行能力。

## 1. 技术决策

| 层 | 方案 | 理由 |
| --- | --- | --- |
| 前端基础 | 优先采用 satnaing/shadcn-admin，固定上游 commit 后裁剪 | 复用后台布局、表格与 shadcn/ui 组件 |
| 前端运行 | 独立 React + TypeScript + Vite 子项目 | 与公开博客的 Next.js/React/Tailwind 版本隔离 |
| API | Python FastAPI + Uvicorn，单服务进程 | 与现有 Python 执行侧衔接，集中鉴权和数据访问 |
| 数据 | Python 标准库 sqlite3 + SQLite | 本机单管理员规模，无需额外数据库守护进程 |
| 后台任务 | 独立 Python worker | 持久化命令队列，不把长时间生图绑定 HTTP 请求 |
| 日常访问 | 同源 http://127.0.0.1:4318 | API 服务托管构建后的前端；端口实施前检查，冲突时报错 |
| 开发访问 | Vite 仅回环监听，/api 代理到本机 API | 不把开发服务器作为常驻交付方式 |

这些是推荐实施基线；依赖版本锁定、模板裁剪和完整兼容构建需在实现时验证。当前本机 Python 3.14.3、SQLite 3.53.0 可读取版本，不等于 FastAPI 及完整环境已经验证。

### 1.1 开源前端选型

2026-09-22 读取上游 README、package.json 与 LICENSE：

| 候选 | 核实情况 | 取舍 |
| --- | --- | --- |
| [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) | MIT；React 19、Vite 8、Tailwind 4、TanStack Router/Query/Table；含 Clerk 和演示依赖 | 首选；适合独立 SPA，按页面裁剪 |
| [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | MIT；Next.js 16、React 19；含 Clerk、Sentry、AI SDK 等 | 备选；当前本机业务无需这套完整集成，裁剪面更广 |

shadcn-admin 的 README 明确它是后台 UI 集合而非完整生产 starter。选择它只解决前端基础，不代表有可用业务后端、鉴权或日报状态机。保留 MIT 版权与许可文件；引入时记录上游 URL、commit、日期和本地修改清单，并核查锁定版本的依赖许可。

采用原项目 Radix 系 shadcn 组件，不额外并入另一套 primitive。优先保留 Sidebar、Table、Dialog、Tabs、Badge、Form、Toast；移除 Clerk 示例、用户/聊天/销售演示、假数据、无用图表及外部遥测集成。登录接入本机会话 API。中文使用系统字体，无外部字体下载依赖。

本地公开博客目前是 Next.js 14、React 18、Tailwind 3，不能把上游依赖直接装入根 package.json。后台 UI 沿用所选模板的后台语言，公开博客视觉保持原样。

### 1.2 源码与部署隔离

拟定目录：

```text
ajin-blog/
  admin/
    frontend/      # 独立 package.json、锁文件、Vite 与 TS 配置
    backend/       # API、数据库访问、鉴权、只读采集与 worker
    migrations/    # 版本化 SQL
    scripts/       # 启停、状态、备份与恢复入口
    tests/         # 状态合同、并发、恢复、API 与页面验证
    THIRD_PARTY.md
```

后台不加入根 app/ 路由，构建产物不放 public/。实现时从根 tsconfig 的全目录扫描及 ESLint 扫描中排除 admin，增加部署忽略规则以排除后台源码、依赖与产物；保留独立后台检查入口，不以排除扫描隐藏问题。根网站构建需证明独立依赖没有污染公开博客。

## 2. 本机运行与目录

运行数据拟定在 `~/Library/Application Support/ajin-blog-admin/`：`admin.sqlite3`、`config.json`、`backups/`、`run/`。日志在 `~/Library/Logs/ajin-blog-admin/`。展开为当前用户绝对路径，目录仅当前用户可读写；数据库禁止放网络共享盘和 Git 工作区。

拟定管理入口：`adminctl init/start/status/stop/backup/restore`。init 创建独立 Python 环境和管理员凭证，start 检查端口、数据库迁移版本、前端构建与 blog repo 路径后启动 API/worker。命令的具体实现和依赖安装属于下一阶段。

启动顺序：检查数据目录 → 获取服务单实例锁 → 校验 schema → API 开始只读服务 → worker 对账在途执行 → 确认安全后消费命令。数据库版本比程序新时拒绝启动写功能；升级前备份。

关闭网页不影响 worker。普通停止先停止接收和领取命令，等待在途操作完成，不强杀生产子进程；超过等待预算时报告仍在运行。程序意外退出时记录 uncertain，重启后不能按租约超时直接重复执行。

首版提供手动启停；登录后自动启动可通过用户级 LaunchAgent 安装入口提供，但安装自启动不包含在本次文档工作中。外置仓库卷未挂载时后台仍可展示历史，执行能力禁用并显示“项目未就绪”。不自动改变系统休眠设置。

## 3. 数据与事务

沿用 PRD 的 daily_reports、runs、stage_attempts、events、artifacts、commands、audit_logs、worker_health；补充 schema_migrations、sessions、schedule_snapshots、issues、issue_notes。所有外键启用；时间保存 UTC 带时区，业务日期按 Asia/Shanghai。

SQLite 使用 WAL、synchronous=FULL、busy_timeout=5000。每个线程使用独立连接，事务短小；生成图片、网络、文件扫描及 Git 都在事务之外执行。WAL 允许读写并行但仍只有一个 writer，不能把它理解为多写入者无锁运行。参见 [SQLite WAL](https://www.sqlite.org/wal.html)。

命令领取采用短事务加条件更新；日报的活动命令与幂等键分别有唯一约束。数据库锁只管后台排队；最终执行继续获取原生产 guard 锁，以覆盖 cron 与后台竞争。不能保证外部副作用天然 exactly-once，必须通过身份、证据和对账阻止不确定重放。

事件入库、投影更新、采集游标提交放同一事务。事件 ID 由来源身份、序号和 payload hash 生成，冲突拒绝覆盖。旧 journal 以稳定数组序号导入；同身份同序号内容变更标证据冲突。发布终态以现有 observe() 合同核验结果为准。

备份使用 sqlite3 Connection.backup()，备份后在副本执行 integrity_check 与 foreign_key_check。默认每日一个，保留 14 份，另在迁移前保存一份；备份失败显示运行告警。恢复前停止服务并确认没有在途执行，保存原库、验证副本、替换并重新对账。恢复出的历史队列先冻结，不自动执行。参考 [Python sqlite3](https://docs.python.org/3/library/sqlite3.html) 与 [SQLite Backup API](https://www.sqlite.org/backup.html)。

## 4. 采集与执行适配

### 4.1 可复用能力与缺口

| 现有入口 | 可复用 | 必须补齐 |
| --- | --- | --- |
| blog_publish_workflow.py | state.json、run_id、日期、开始/完成事件 | 业务验收与调用完成区分；新增细分阶段 |
| blog_publish_runtime.py | brief/image/visual/校验/Git/CI/公网执行 | 为各步骤输出版本化事件；提供受控恢复能力 |
| blog_publish_status.py | ledger/receipt 身份、哈希、终态核验 | 输出映射及错误分类，采集不能篡改源数据 |
| blog_publish_terminal_guard.py | 全局互斥、持久化 pending、终态回执 | 后台命令同样经过 guard；不复制另一套锁 |
| blog_publish_repair_loop.py | 有界推送、轮值与公网修复逻辑 | 区分读取与会产生副作用的 repair，不能整段当只读状态查询 |
| blog_cron_command.py | 目标日期与触发入口 | 后台必须传显式日期，来源保存 manual_backfill |

本轮未定位到可直接复用的通用阶段 resume 脚本。status 验证器中接受历史 program_operator_resume 回执，不代表存在通用可调用恢复接口。

### 4.2 只读采集

每 10 秒扫描已配置来源的变更（建议值）：journal、preflight/terminal receipts、guard ledger、调度快照及本项目 cron run。路径来自配置及现有路径解析器，不能复制历史快照的路径假定。

读取前后检查文件身份和哈希，遇到并发替换有限重试后标待核实。失败仍保存最后有效投影及时间。每天建立预期日报，启动补齐启用日期以来的缺失记录；旧于启用日期的无记录日期不推断漏跑。

新增生产事件先本地持久化再异步采集，数据库不可用不改变既有生产门禁。旧记录缺少 publish 子步骤时显示“发布处理中（细节未记录）”，不能由当前代码顺序猜出历史阶段。

### 4.3 恢复协议

先实现 `inspect_recovery(date, run_id)` 只读结果：supported、reason、allowed_actions、resume_from、artifact_hashes、expected_version、side_effect_scope。服务端生成短时恢复预览，绑定版本和证据哈希；提交时再次验证。

`execute_recovery(command_id)` 只接受注册动作，不接受任意路径或命令。入口依次检查：命令未过期 → 旧进程及子进程均终止 → 原 guard 关系 → 上游版本 → 审稿预算 → 当前 Git 与已发布副作用 → 执行动作 → 现有终态验证。

阶段恢复采用显式策略表，先支持 brief/image/visual 及发布后核验。审稿失败、未知发布副作用、无法验证的 pending 均返回不支持及原因。完成当前阶段可停下或继续发布，但操作范围必须在恢复预览和命令中明确，不隐式扩大。

新增恢复 attempt 与原 guard 身份建立关系，预算不重置。已推送但状态未知时优先检查 CI/公网，不能重复写稿生图。已推进轮值时不得重复推进。封面等上游产物变化后失效其下游审查证据。

## 5. API 草案

以下为接口目录，正式 OpenAPI 与请求/响应 schema 在实现阶段创建，尚不可调用。

| 方法与路径 | 内容 |
| --- | --- |
| POST /api/auth/login、POST /api/auth/logout、GET /api/auth/session | 本机会话 |
| GET /api/overview | 今日日报、历史未完成、服务与采集状态 |
| GET /api/reports | 日期/状态筛选、分页、排序 |
| GET /api/reports/{date} | 日报详情、最近有效状态、version |
| GET /api/reports/{date}/runs | 独立运行及恢复关联 |
| GET /api/runs/{id}/stages | 阶段尝试与业务验收结果 |
| GET /api/artifacts/{id} | 经授权和哈希验证的脱敏预览 |
| GET /api/issues、POST /api/issues/{id}/notes | 异常与处理意见 |
| POST /api/reports/{date}/action-preview | 只读恢复/补跑预检及作用范围 |
| POST /api/commands | 提交 preview_id、expected_version、幂等键 |
| GET /api/commands/{id} | 排队、领取、运行、失败/成功/待核实 |
| GET /api/system/status | 服务、worker、卷挂载、采集与备份状态 |

统一响应包含 request_id、observed_at、data；错误包含稳定 code、中文 message、retryable。提交命令成功返回 202，不表示任务已完成；状态冲突 409、身份失败 401、CSRF/权限失败 403、能力未就绪 503。前端由 allowed_actions 决定可用按钮。

单管理员密码哈希使用标准密码 KDF；会话随机令牌只存哈希，HttpOnly、SameSite=Strict，8 小时有效。HTTP 回环开发方案不得误称具备 HTTPS Secure cookie。写请求同时验证精确 Host/Origin、CSRF token 与会话；禁用通配 CORS，限制登录尝试。浏览器不保存管理员密码。

私有产物按 ID 读取，拒绝任意路径与软链接逃逸。正文以转义文本或禁用 HTML 的 Markdown 渲染，禁止执行来自文章的 MDX/JS。上报与界面只提供脱敏片段，不展示完整模型输入、密钥或原始私人素材。

## 6. 实施与验证顺序

1. 固定模板 commit，独立工程裁剪、许可记录、前端构建及公网构建隔离验证。
2. 数据迁移、会话、只读采集、预期日报与三页面；采用隔离 fixtures 验证历史信息不足场景。
3. 新增子阶段事件及受控恢复能力；联测排队、互斥、重复点击、进程崩溃和发布后对账。
4. 本机服务启停、备份恢复、离线恢复与卷未挂载场景。
5. 真实运行验收；只在相应生产动作已获授权时执行发布，不能以测试之名触发补跑。

本方案不要求升级公开博客技术栈，不增加云账号，不接入模板的付费鉴权服务。前端依赖的版本与 bundle 成本在裁剪构建后量化，不虚报尚未测得的体积或性能。

官方参考：[Vite 后端集成](https://vite.dev/guide/backend-integration)、[FastAPI 后台任务边界](https://fastapi.tiangolo.com/tutorial/background-tasks/)。长任务使用持久化队列和独立 worker，不依赖请求内 BackgroundTasks。


## 7. 当前实现差异（2026-09-30）

首个可用切片位于 `admin/`，与公开博客构建隔离。实际日志目录使用数据目录下的 `logs/`，便于 `AJIN_ADMIN_DATA` 隔离测试。数据库使用 reports/runs/events/notes/audit/sessions/meta，保存版本化 JSON 投影；尚未实现完整命令和阶段尝试表。前端采用模板 Sidebar、Tabs、Table 等组件，表格筛选和分页由服务端完成；尚未用到 TanStack Table 的高级功能。

当前只读采集 10 秒一次，首次启用日起独立补齐预期日报；更早日期只导入可发现的真实文章、运行和终态证据。失败证据被保留，历史无凭证文章显示待核实但不默认视为活跃异常。恢复 API 仅返回能力未启用，不存在命令执行端点。

上游固定为 `e16c87f213a5ba5e45964e9b67c792105ec74d26`，保留 MIT 许可。实际接口、测试和运行说明以 [admin/README.md](../admin/README.md) 为准。
