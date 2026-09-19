# 博客自动发布 OpenClaw 执行方案（含临时 Codex 视觉验收例外）

- 日期：2026-09-19
- 状态：按用户最新授权继续实施；视觉验收暂由 Codex 完成，发布验收仍待完成
- 配套清单：[执行清单](blog-openclaw-execution-checklist.md)
- 目标：由项目程序控制发布流程、本机 OpenClaw 调度和提供模型配置；Codex 承担内置 Image 2 图片生成，并按 2026-09-19 用户最新授权暂时承担隔离的视觉验收。
- 授权更新：用户已要求创建目标并落实本方案，先前目标因视觉后端受阻；用户现已明确“那这个就暂由 codex 完成”，授权视觉验收临时例外并继续实施。实施与验证按本清单推进；commit/push/公开发布遵守项目独立授权规则。本文件状态必须以证据回填，不能以方案文本替代运行结果。

## 1. 已核实现状与时间边界

以下为 2026-09-19 实施前基线，不代表改造后的当前状态；最新状态见第 8 节。

| 环节 | 当前事实 | 改造目标 |
|---|---|---|
| 主流程 | `blog_publish_workflow.py` 已按程序顺序控制初稿、初审、一次修订、复审、发布 | 复用，不另建竞争流程 |
| 写作和修订 | `blog_writer_client.py` 使用配置的 Claude Sonnet 4.6 远程服务 | 保留角色，通过项目适配器管理配置与回执 |
| 事实审稿 | MiniMax-M3 优先，失败后 Codex CLI 兜底；函数名和部分注释与真实调用方式不一致 | 统一配置来源，删除 Codex 兜底 |
| brief | `build-blog-cover-brief.mjs` 执行 Codex 全文分析 | 项目调用文本模型，保留全文和哈希绑定 |
| 生图 | `generate-blog-cover-image2.mjs` 会先调用 brief 生成器，再启动 Codex | 生图入口只消费已验证的新鲜 brief |
| 视觉检查 | `blog_publish_runtime.py` 的 `visual()` 执行 Codex | 暂由隔离的 Codex 视觉适配器执行，保留未来非 Codex 替换接口 |
| brief 校验 | 校验器硬性要求 `generatedBy: codex` | 新旧来源合同分版本验证 |
| 生图权限 | Codex 以仓库为工作目录，使用 `workspace-write` | 专用输出目录及实际权限约束 |
| 缺更提醒 | Codex 自动化“博客每日缺更提醒”配置为 ACTIVE | 迁移到 OpenClaw，避免重复提醒 |

实施前调度现场有变化：上一轮读取时 23:30 主任务关闭，本轮文档写作前复核已开启。当时读取到：

- `08628be0-7925-42a8-9101-f5122343e0d0`：`ajin-blog 每日自动发布(23:30)`，`enabled=true`。
- `508f87a7-7763-48c1-b70b-013e2d13568a`：`ajin-blog 发布修复巡检(01:15)`，`enabled=true`。
- 此处仅证明磁盘配置值，不证明调度器已加载、任务正在运行或发布成功；文档准备阶段没有修改开关；后续实施已暂停主任务与修复任务，见第 8 节。

本地 OpenClaw 指本机编排系统，不代表模型在本机推理。本方案沿用已配置的云端文本/视觉能力，不包含部署本机推理模型。

## 2. 目标职责与执行顺序

```text
OpenClaw 固定命令任务
  → 项目发布 guard：目标日期、互斥、素材、预检
  → 文本模型：正文
  → 独立审稿模型：事实审稿
  → 必要时文本模型修订一次，再复审
  → 文本模型：全文 visual brief
  → 项目：校验 brief、拼接锁定生图提示词
  → Codex Image 2：只输出候选图片
  → 项目：接收并检查文件、优化、记录哈希
  → 临时 Codex 视觉验收：只返回图片与 brief、规范图一致性判断
  → 项目：完整校验、Git、CI、公网检查、轮值和终态回执
  → OpenClaw：结果通知、后续巡检
```

模型输出是数据，不得成为任意 shell 命令或状态机跳转指令。程序决定步骤、预算、重试、发布及终态。没有公开素材时记录正常跳过，不造稿。

原“只有生图调用 Codex”约束已被用户增加视觉验收临时例外；其余生产代理环节仍禁止 Codex。读取既有 Codex 工作记录作为真实素材不属于代理调用，不应因此删除素材来源或历史证据。

## 3. 改动包与依赖

### P0：现场、互斥和回退入口

1. 读取两侧规则、Git 状态、模型配置、cron 定义与运行状态、guard 和 receipt；保存脱敏快照与哈希。
2. 检查在途发布。若需要阻止并发，按已有授权使用受支持的调度管理接口暂停相关任务；未获相应授权时只完成可独立进行的隔离开发，记录缺少的具体操作授权。不得直接覆盖运行中的 jobs 文件。
3. 不删除或强行释放 pending，不重置审稿预算。确认实际在途进程、run_id 和终态证据后，才按受支持恢复流程处理。
4. 保留任务前用户改动；本轮已见 `.claude-init.sh`、`.claude-progress.md`、`.claude-task.json` 和未跟踪 `.codex/config.toml`，实施时重新核对。

### P1：文本模型与审稿后端

- 保留现有 Claude 写作、MiniMax 独立审稿分工。
- 建立项目可测试的模型适配接口，从 OpenClaw 配置解析指定角色的 provider、model、endpoint 和凭证引用；不复制密钥到仓库、日志或产物。
- 不必为了“使用 OpenClaw”增加自由执行的 agent 回合；项目可直接消费其受控模型配置。具体采用已有客户端还是新适配器，在阅读完整代码后选择最小改动。
- 删除 `run_codex_review` 及所有非生图兜底路径，修正误导性函数名、注释、日志 backend 标记和相关测试。
- 网络超时/临时错误只做有界重试，建议同后端最多 2 次重试；认证错误、配置错误不盲重试。最终失败保留错误，不伪装为“需修订”。
- 保持两次内容审稿预算及跨进程持久化；传输重试与内容审稿次数明确区分，不在重启时重置。

### P2：全文 brief 与版本兼容

- 将 `build-blog-cover-brief.mjs` 的 Codex 调用替换为文本模型适配器。
- 保留完整正文输入、单一主线、核心事件/张力、三个焦点、英文提示词约束、文章及正文哈希。
- 新产物记录真实生成来源、模型、执行方式、合同版本；图片的 `coverProvider: codex` 与 brief 来源分开。
- 明确增加 brief 合同版本，版本名称实施时统一确定；不得仅放宽 `generatedBy` 而接受任意未知来源。
- 历史文章和历史 brief 按原合同验证，新流程产物按新合同验证。不篡改历史来源、不批量补图。
- 同步缓存复用条件：正文、版本、来源策略不符合新合同就拒绝复用；正文变化必须重建 brief。
- 生图和 `--dry-run` 不再隐式触发文本模型；缺失或过期 brief 返回明确错误，由主流程显式重建。
- 检查历史 backfill 工具与全量 verify 对版本的依赖，保持兼容，不启动历史补发。

### P3：临时 Codex 视觉验收（用户授权例外）

- MiniMax/Claude 真实视觉能力验证存在矛盾；用户授权暂由 Codex 执行视觉验收。使用显式局部配置，不是失败后的自动兜底。
- 先用已有候选图、四张锁定参考和对应 brief 做真实能力验证，不为能力验证生成新文章。
- 除正常图片外，使用已有明显不符风格或不符 brief 的样例，确认能拒绝；记录模型版本、请求图片哈希与原始结构化结果。
- 模型需检查蒸汽工业时代、黑墨暖象牙版画风格、禁用元素、三个视觉焦点与文章主线一致性。
- 文件真实性、PNG、尺寸、引用完整性、哈希由代码验证；模型负责语义与视觉判断。
- 不支持图片、图片缺失、无效 JSON、超时或 FAIL 都停止发布，不切换后端，不跳过看图。
- 模型 PASS 是自动质量门禁，不等于用户对候选效果的认可；如另有明确人工验收停点，保留该停点。

### P4：受控 Codex 生图入口

- 继续使用仓库锁定的内置 Image 2、风格、四图哈希和纯文字生图路径；不切换 API key 或其他模型。
- 项目先完成最终提示词，在专用临时目录启动 Codex，传入提示词及单一候选输出路径。
- 核验实际 sandbox、继承配置和子进程权限，确保不能写文章、配置、Git 或调用发布动作；仅改变 cwd 或提示词不算权限隔离完成。
- 生图所需最小工具和生成结果复制能力需实测，不以无法执行的隔离方案替代可工作的内置路径。
- 由项目接收候选、检查、优化和原子落盘；拒绝越界输出、软链接逃逸、旧图冒充新结果及缺失输出。
- 生图回执记录 run_id、prompt/brief 哈希、输出哈希、provider/model、耗时和错误；日志不得包含凭证。
- 移除临时目录按本次 run_id 限定范围，保留失败证据和可回退旧图。

### P5：调度、巡检与规则同步

- 主任务改为 OpenClaw 固定 command 调用现有 program executor，验证当前宿主确实支持执行与结果收集。
- 01:15 修复巡检保留现有白名单修复和通知意图，调整时验证不扩大修复范围。
- 缺更提醒迁移到 OpenClaw；验证新任务后停用原 Codex 自动化，保留可恢复配置，不双重通知。
- 缺更检查区分 published、skipped、failed/pending、unknown；本地文件存在不能证明公网已发布。
- 已禁用的旧 agent executor 提示词也需标记退役或同步，避免后续误启恢复未经授权的 Codex 调用。
- 同步仓库 AGENTS、cover workflow、schema/validator、OpenClaw 写作 skill、任务提示词和测试；不更改无关模型或全局默认行为。

## 4. 文件与现场入口

仓库根目录：`/Volumes/Sata/ChenjinProjects/active/ajin-blog`。OpenClaw 根目录：`/Users/chenjin/.openclaw`。

| 范围 | 现有入口 |
|---|---|
| 项目规则与文档 | `AGENTS.md`、`docs/blog-cover-workflow.md` |
| brief 与图片合同 | `config/blog-cover-image2.json`、`config/blog-cover-visual-brief.schema.json` |
| brief/生图/验证 | `scripts/build-blog-cover-brief.mjs`、`scripts/generate-blog-cover-image2.mjs`、`scripts/validate-blog-cover-image2.mjs` |
| 生图边界 | `scripts/lib/blog-cover-image-prompt.mjs`、`scripts/lib/codex-image-execution.mjs`、`scripts/lib/codex-cli-path.mjs` |
| 项目验证与部署 | `package.json`、`.gitlab-ci.yml`、`scripts/codex-image-*.test.mjs` |
| OpenClaw 流程 | `workspace/scripts/blog_publish_workflow.py`、`blog_publish_runtime.py`、`blog_publish_terminal_guard.py` |
| OpenClaw 模型与事实审稿 | `workspace/scripts/blog_writer_client.py`、`blog_content_fact_gate.py`、`blog_revision_contract.py` |
| OpenClaw 配置 | `workspace/config/ajin-blog-executor-model.json`、`openclaw.json`（只记录脱敏字段） |
| 运维检查 | `workspace/scripts/blog_publish_status.py`、`blog_publish_repair_loop.py`、`blog_cron_validator.py` |
| 调度事实 | `cron/jobs.json`、`cron/jobs.state.json`、`cron/runs/` |
| 写作规范 | `workspace/skills/blog-author-rotation/SKILL.md` |
| Codex 缺更提醒 | `/Users/chenjin/.codex/automations/automation-2-912a4fbf02b2/automation.toml` |

OpenClaw 表中未重复目录的脚本均位于其 `workspace/scripts/`。文件表是已定位入口，不是完整文件白名单；如发现必要关联点可纳入，并在清单记录原因。

## 5. 验收与证据

### 5.1 代码和受控测试

- 除生图与已授权视觉验收外的路径禁止启动 Codex：既扫描调用点，也通过进程/适配器调用记录验证，包括绝对路径启动与失败分支；不能只靠替换 PATH 中的 codex。
- 写作、审稿、修订、brief、视觉验收、巡检分别测试成功和关键失败；所有失败均不得隐式调用 Codex。
- 验证过期 brief、未知来源版本、审稿预算耗尽、视觉 FAIL、缺图、生图错误会阻断提交推送。
- 验证历史合同仍通过，新合同不能伪造旧来源；已有审稿预算与 guard 测试按影响范围复验。
- 验证重复触发不会重复发布或重复推进轮值；无素材跳过不生成文章和图片。

仓库完整检查命令（本轮实施已运行通过）：

```bash
cd /Volumes/Sata/ChenjinProjects/active/ajin-blog
npm run verify
```

现有事实审稿测试可从 OpenClaw 脚本目录运行；变更其他模块时选择相应现有/新增测试，不把此单项当作全套通过：

```bash
cd /Users/chenjin/.openclaw/workspace/scripts
python3 -m unittest test_blog_content_fact_gate
```

### 5.2 真实调用与端到端

- 完成非 Codex 文本模型、已授权视觉适配器真实调用和受限 Image 2 验证。
- 使用执行当天真实素材验证，不补发历史；运行开始后固定目标日期，跨午夜不漂移。
- 真实发布沿用 program executor：其入口有写文章、生图、commit/push 等副作用，不作为只读验证命令。执行前核对已有发布授权、两侧 Git 状态与 remote，并处理在途互斥。
- 记录 commit、两个目标 remote 的 SHA、对应 CI、公开文章与封面哈希；沿用现有终态校验，不以 cron 外层 ok 替代业务成功。
- 已观察到 CI 文件包含 Vercel 部署配置；仍必须读取本次 pipeline 和实际公网证据，不把静态配置当作已部署证明。
- 单次人工触发成功后才进入自然调度验收。若改造期间暂停了任务，按验证结果和授权恢复；若当前仍开启，也不得跳过切换前检查。

### 5.3 证据格式

本轮 evidence 目录见第 8 节。每个检查至少记录：清单 ID、时间/时区、代码版本、命令或入口、退出码、run_id、模型身份、结果、日志路径及相关哈希。凭证必须脱敏。

完成层次分别记录：实现、测试、真实模型调用、手动端到端、提交、推送、部署、公网验证、自然调度。未做的层次标为未验证。

## 6. 回退与异常处理

- 代码回退和调度回退分开。保留改造前版本、脱敏任务配置、旧封面和历史 receipt。
- 新流程失败时停止该次发布并保留证据；独立开发和诊断可以继续。
- 不以重新启用旧文本/审稿 Codex 路径作为静默回退；无法满足新边界时暂停受影响发布，报告具体原因。
- 不删除文章、receipt、guard 或用户改动来“清空错误”。需要处理 pending 时先核对活跃进程及原始运行记录。
- 恢复任务前检查唯一主入口、通知去重及待处理运行，避免新旧调度同时发布。

## 7. 完成定义

只有以下全部有证据，才可宣布本次改造完成：除生图与临时视觉验收外的代理路径不调用 Codex；内置 Image 2 可用且范围受控；原有内容和图片质量门禁保留；历史文章验证兼容；当天真实发布通过；OpenClaw 自然调度至少成功观察一次；Codex 缺更提醒已完成迁移与停用核对。

文档落盘仅代表执行依据准备完成，不代表上述条件已达成。

## 8. 实施现场（2026-09-19，持续更新）

- 目标已通过 create_goal 建立；连续三轮确认同一视觉能力阻塞后，状态更新为 blocked，未标为完成。
- 本轮先备份原脚本与调度，在无发布进程、pending=null 时经 Gateway API 暂停主任务与修复任务；没有改写 ledger。
- 23:30 主任务与 01:15 修复任务已切换为 `blog_cron_command.py main/repair` 固定 command，暂不恢复启用。
- 新 09:20 缺更检查 id `a70246f3-4e36-4301-b5a9-55de50c5484e` 已真实手动执行成功，恢复默认昨天口径后启用；原 Codex 提醒经工具更新为 PAUSED。其旧项目路径标识已映射为当前同一 ajin-blog 保存项目 ID，其他原有配置保留。
- 现有 2026-09-19 已公开文章不重复发布；其已有 operator 恢复回执在旧 `blog_publish_status.py` 返回 `Invalid:recovery_type_unknown`。新 wrapper 明确区分去重和终态未验证，不放宽未知回执校验。
- 隔离 fixture 的 Claude 全文 brief、受限 Image 2、PNG 优化已真实跑通；不覆盖已发布文章/brief/封面。
- MiniMax 固定 v4 视觉标准下将规范正例误识为彩色数字渲染；Claude 同标准正例/反例/新候选分别 PASS/FAIL/PASS，但四图 smoke 却描述厨房物件并自报 images_received=0。结果相互矛盾，视觉能力门仍未通过；不切换生产视觉配置、不覆盖 FAIL。其他已配置模型均未声明图片输入；此为临时例外授权前的受阻证据，最新实施按第 9 节执行。
- 独立 QA 发现的进程树回收、视觉 PASS 与最终暂存 blob 绑定均已修复并定点复审；外部 TERM 跨层清理已通过真实进程测试。
- 证据根目录：`/Users/chenjin/.openclaw/workspace/tasks/ajin-blog-openclaw-only-20260919/`。其中 `baseline/` 为任务前原始脚本；`real-call-fixture/` 为隔离真实模型验证素材，绝非线上产物。

## 9. 用户最新授权：视觉验收临时例外

2026-09-19，用户明确“那这个就暂由 codex 完成”，指向受阻的视觉验收。仅视觉验收新增 Codex 执行许可，其余模型角色、发布和监控分工不变。候选与四参考、全文和 brief 作为输入，输出固定 v4 五项结构化判断；不修改质量阈值，不覆盖此前失败证据。隔离权限、超时回收、来源回执和最终暂存哈希绑定必须保留。局部配置切换后先做规范正例、明确不符反例及现有新候选的真实审查。真实发布和恢复调度仍按原验收顺序推进。

临时例外实施结果：局部配置已选择 `codex/gpt-6-astra/temporary-visual-review`。规范正例 PASS、明确不符反例 FAIL；已有新候选因封印破裂与封存语义不符而 FAIL，继续阻断。Codex视觉权限只读且禁网络/工具/代理/插件，来源回执区分请求模型与未知的服务端实际模型。未恢复主调度。详细证据见配套清单。

## 10. 收尾目标已建立

用户在剩余事项说明后明确要求创建目标并完成。新目标已包含临时 Codex 视觉验收例外，状态 active。继续处理候选质量、调用边界/关键状态验证、真实发布、Git/CI/公网和自然调度验收；不重复已完成日期。提交推送及外部发布仍按现有项目授权约束核对，未执行的验收不得提前标记完成。

交付范围说明：用户已要求完成包含提交推送、CI/公网和调度恢复的收尾目标。本轮按此范围交付项目改造，逐项核对remote和白名单；不纳入既有`.claude-*`、宿主`.codex/config.toml`或其他无关改动，不把文档提交算作发布验收完成。博客CI增加既有`test:cover-image`命令以在远端持续校验本次合同。
