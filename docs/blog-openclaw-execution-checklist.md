# 博客 OpenClaw 执行改造清单

- 执行依据：[执行方案](blog-openclaw-execution-plan.md)
- 建立日期：2026-09-19
- 当前阶段：按最新用户授权实施临时 Codex 视觉验收；Git交付、真实发布和自然运行尚未收口
- 填写规则：只有存在可复核证据才勾选；阻塞写明具体原因，不用“已实现”替代运行验证。

## A. 文档准备

- [x] A01 明确生产职责；用户最新追加视觉验收临时 Codex 例外，正文/审稿/brief/发布/巡检仍不委派 Codex。
- [x] A02 定位现有调用点、合同冲突和运维自动化入口。
- [x] A03 写明实施顺序、验收、回退和完成定义。
- [x] A04 记录主调度从此前关闭变为本轮读取开启的现场差异。

## B. 实施前现场与范围（P0）

- [x] B01 读取两侧当前规则、Git status 和 remote，保留无关改动。
- [x] B02 记录主任务、修复任务和 Codex 缺更提醒的配置、运行状态与在途 run_id。
- [x] B03 检查 guard/pending/receipt，确认互斥和切换窗口；不盲清 pending。
- [x] B04 保存脱敏配置与回退版本，建立本轮 evidence 目录。
- [ ] B05 核对实施、真实模型调用、发布和调度变更的已有授权；只对确实缺失的高影响动作补充决定。

## C. 文本和审稿（P1）

- [x] C01 模型角色、配置解析和实际请求来源一致，凭证不落库。
- [x] C02 删除事实审稿 Codex 兜底及其他非生图隐式调用。
- [x] C03 修正函数名、注释、backend 回执和旧测试的错误语义。
- [x] C04 保留两次审稿与一次修订预算，传输重试有界且不重置内容预算。
- [x] C05 验证失败保留原始原因、published=false，不降级到 Codex。

## D. 全文 brief（P2）

- [x] D01 文本模型读取完整正文，输出符合合同的 brief。
- [x] D02 哈希、三个焦点、提示词长度和未知字段/版本校验明确。
- [x] D03 新 brief 如实记录来源和模型，图片 provenance 仍为 Codex Image 2。
- [x] D04 新旧合同分版本；历史文章、缓存和 backfill 验证兼容。
- [x] D05 生图入口和 dry-run 不再隐式调用 brief 模型。
- [x] D06 正文或来源策略变化后不复用不合规旧 brief。

## E. 视觉验收（P3）

- [x] E01 验证临时 Codex 视觉适配器真实收到候选图、四张参考、全文和 brief，并保留隔离权限证据。
- [x] E02 正常样例通过，明显错误样例被拒绝；记录图片哈希和模型结果。
- [x] E03 图片缺失、无效返回、超时、FAIL 都阻断发布，无后端自动切换。
- [x] E04 保留代码文件检查和模型视觉判断的分工，以及已有人工验收停点。

## F. Codex 受控生图入口（P4）

- [x] F01 只接收定稿提示词和受控输出路径，继续内置 Image 2。
- [x] F02 专用工作目录、有效权限及继承配置验证通过，不可写文章、Git 或配置。
- [x] F03 真实生图成功，结果由项目检查、优化、哈希和原子落盘。
- [x] F04 越界路径、软链接、旧图未变化、缺图及生图失败反例通过；真实生成器 + 隔离假执行器覆盖安装冲突、优化失败回滚和优化后旧图拒绝。
- [x] F05 失败证据、旧图和本轮输出可追溯，无凭证泄露。

## G. 调度、规则和提醒（P5）

- [x] G01 主任务固定 command 在当前 OpenClaw 宿主执行通过。
- [x] G02 唯一主入口明确，旧 executor 不会误启恢复未经授权的 Codex 路径。
- [x] G03 01:15 巡检保留原有修复白名单和通知意图。
- [x] G04 缺更检查迁入 OpenClaw，区分公开成功、正常跳过、失败和未知。
- [x] G05 新提醒验证后停用旧 Codex 提醒，无重复任务/通知。
- [x] G06 同步 AGENTS、cover workflow、schema/validator、写作 skill 和任务提示词。

## H. 综合验收

- [ ] H01 除生图与临时视觉验收外的全路径及失败分支禁止启动 Codex 的动态检查通过，包括绝对路径调用。视觉阶段的 subprocess tripwire、brief dry-run 和调度命令测试已通过；完整流程动态覆盖仍待综合验收。
- [x] H02 受影响 Python 测试和新增边界测试通过。66 项通过；扩展旧门禁另有 2 项在 baseline 源代码上同样失败。
- [x] H03 仓库 `npm run verify` 通过；无关既有失败单独记录。
- [x] H04 无素材、重复触发、跨午夜、过期审稿/brief 等关键状态验证通过。程序层覆盖见h01-h04审计及迁移后45项guard/相邻合同回归；自然运行另由H09验收。
- [ ] H05 当天真实素材的文本、审稿、brief、视觉模型调用通过。
- [x] H06 当天真实 Image 2 生图与视觉验收通过。修正brief后的隔离候选PASS，未替换线上图，未当作发布完成。
- [ ] H07 在已有授权范围提交推送本次改动，记录版本和两个 remote SHA。
- [ ] H08 对应 CI、公开文章与封面核验通过，terminal receipt 为真实成功。
- [ ] H09 按切换计划恢复或核对主调度，观察一次自然运行；与手动成功分开记录。
- [ ] H10 汇总 Codex 仅限生图与临时视觉验收的调用边界证据、迁移结果及回退入口。

## I. 执行记录

开始实施后逐项追加，不提前填写成功。

| 清单 ID | 状态 | 时间/时区 | 代码版本或 run_id | 证据路径/命令/退出码 | 未决事项 |
|---|---|---|---|---|---|
| A01–A04 | 文档完成 | 2026-09-19 / Asia/Shanghai | 文档未提交 | 本文与执行方案；本会话只读现场核对 | 运行配置在实施前重查 |
| B01–B04 | 已核对与备份 | 2026-09-19 / Asia/Shanghai | 工作区未提交 | evidence/baseline-manifest.json、两侧 status-before、cron 快照 | 无在途发布，pending 未改 |
| C01–D06 | 实现与定点验证通过 | 同日 | 工作区 | python-model-implementation.md、brief-real-call.log、real-call-fixture/content/cover-briefs/ | 真 brief 属于隔离验证 |
| F01–F05 | 生图隔离/输出测试通过 | 同日 | 工作区 | sandbox-probe.json、image-real-call-final-contract.log、Node contract tests | 包括真正Image2与优化，不是线上换图 |
| G01–G06 | 固定入口与提醒迁移完成 | 同日 | Gateway实际任务 | cron-command-probe-run.json、cron-main-notify-verified.json、cron-repair-updated.json、cron-missing-real-run.json、cron-missing-enabled.json | 主/修复仍暂停；通知实际投递未主动测试 |
| H01局部/H03 | 定点非生图边界与仓库检查通过 | 同日 | 工作区 | 动态tripwire、blog-verify-final.log | 50 tests:49通过/1跳过；lint有既有img warning，build成功 |
| E/H04–H10 | 未全部完成 | 同日 | — | 视觉校准与综合测试继续追加 | 不冒充发布、提交或自然调度完成 |

## J. 交接摘要（每阶段更新）

- 证据根目录：`/Users/chenjin/.openclaw/workspace/tasks/ajin-blog-openclaw-only-20260919/`；上表文件名均相对该目录。
- 下一步：落实用户授权的临时 Codex 视觉适配器并完成能力验收；外部 TERM 跨层回收测试已通过。随后补齐综合状态反例，在明确交付授权后进入提交和发布验收。
- 23:30 主任务：command + --notify-success，disabled；01:15 修复：command + 原有失败/修复通知参数，disabled。通知目标沿用原配置，未主动发送真实通知。
- 09:20 OpenClaw 缺更检查：enabled；旧 Codex 缺更提醒：PAUSED。
- 今日已公开文章不能重复发布；旧恢复receipt类型兼容缺口独立保留，不当作新流程验收成功。
- 提交/推送/部署：尚未执行；需要遵守项目独立授权规则。B05/H07未勾选。
- 真实发布、自然调度：未验收；用户已授权通过临时 Codex 视觉验收继续实施。已按用户要求新建包含临时视觉例外的收尾目标，状态 active。

### 原视觉阻塞与测试边界（临时例外授权前）

- MiniMax v4：规范正例 FAIL、明确不符反例 FAIL、新候选 FAIL，存在规范图误识别。
- Claude v4：正例 PASS、反例 FAIL、新候选 PASS；但多图 smoke 描述厨房且自报接收 0 图，与实际发送 4 张工业版画矛盾，不能据后续 PASS 掩盖此异常。生产视觉配置未切换。
- 能力证据：`claude-vision-smoke.json`、`rubric-v4-*/visual.json`、`claude-rubric-v4-*/visual.json`。
- 扩展旧门禁测试 67 项中 65 通过、2 项失败，均为 `test_blog_cron_validator` 的 Git push fixture 找不到文章文件；现有测试在 baseline validator/repo 源代码上复现相同失败，见 `cron-validator-baseline-comparison.json` 与 `cron-validator-baseline-reproduce.log`。未修改旧验证器/测试，不宣称所有旧测试通过。

- 最终受影响 Python 定点测试：`python-final-selected.log`，66 项通过；包括模型适配器、事实门禁、视觉绑定、进程回收、固定调度和缺更检查。H02 的新增/受影响部分通过，扩展旧门禁的两项失败另行追溯。

- F04 补充：`f04-dynamic-negative-tests.log`，14 项通过；新增 7 个真实生成器反例，无真实模型或网络调用，生产生成器未因测试而修改。

### 续轮诊断：本机视觉请求传输

- `vision-local-transport-proof.json`：真实视觉适配器和系统 curl 经本机 TLS 发送，5 张图解码哈希全匹配，请求 4637536 字节，1.713 秒 PASS。无真实模型调用。
- `vision-diagnosis.md`：排除本组输入在本机打包/转义/发送中损坏；远端转发与识图能力根因尚未确认，E01/E02继续未完成。
- 该次续轮目标保持 active；后续第三轮复核配置无变化，已将目标设为 blocked，等待可靠视觉后端。主/修复仍暂停。

### 受阻审计（临时例外授权前）

连续三轮的同一阻塞：缺少经过真实多图能力验证的非 Codex 视觉后端。最新配置仍只有 MiniMax-M3 声明 image 输入，未出现新的局部视觉配置；没有用户补充后端信息。现有矛盾响应与本机传输证明均保留。目标已通过 update_goal 标记 blocked，完成定义未缩减。恢复条件是提供可用视觉服务配置，或现有服务修复后可核验的收图/识图能力。

### 最新用户授权变更

用户明确允许受阻的视觉验收暂由 Codex 完成。E/H01/H10 相应更新，其他既有质量门禁和交付验收不缩减；以前“无非生图 Codex”的历史记录以此例外为准。受控视觉适配器已落地，局部配置明确选择 codex/gpt-6-astra/temporary-visual-review。实测正反例与失败阻断，详情见下。

### 临时 Codex 视觉验收实测

- `codex-visual-sandbox-proof.json`：只读成功、写入拒绝、网络端口绑定拒绝。
- `codex-rubric-v4-positive/accepted-existing-run.json`：规范图五项 PASS。首次真实会话因两条已知CLI启动诊断被trace检查误拒；精确兼容修复后离线复验同次trace、final、schema和输入哈希通过，没有重跑模型或覆盖原失败记录。
- `codex-rubric-v4-negative/visual.json`：明确不符的帆船/船锚/灯塔要求正确 FAIL；Runtime抛出 visual_review_failed 阻断后续发布。
- `codex-rubric-v4-new-candidate/visual.json`：候选 FAIL，封印破裂与brief要求封存冲突；保留结果、不放行，不将后端可用等同候选合格。
- 三次会话无工具调用；trace只接受消息/推理/正常turn，以及两条精确确认的启动诊断。未知错误或工具事件均拒绝。
- `codex-visual-execution-archives/manifest.json`：持久归档三次CLI回执、最终JSON和输入图哈希；临时目录清理不会丢失本轮验收证据。
- 全局 OpenClaw 配置未改；正文/修订/事实审稿/brief不恢复Codex调用。当前候选不合格，主/修复保持暂停；真实发布、Git交付、CI与自然调度仍未完成。

- 临时适配器新增的启动诊断兼容仅精确允许两条已观测文案，未知error/工具事件仍拒绝。
- 本轮72项综合测试曾出现一次清理阶段EPERM，原日志保留；同用例12次独立复跑未复现，根因未确认。新增受限防御：leader已回收且成功ps快照证明PGID不存在时才容忍并记录，否则仍报错。详见 `process-eperm-*`。

- 最终同范围综合回归：`temporary-codex-visual-tests-final.log`，73 项全部通过。原 72 项失败日志保留。最后独立复审无新增 must fix；没有重复模型调用、没有扩大旧验证器修复。

### 收尾目标

新目标已创建并处于 active，完整范围见执行方案第10节；未缩减真实发布和自然调度完成条件。

### 收尾推进：候选质量与入口审计

- `candidate-repair-fixture/`：以既有当天真实文章重建Claude brief，补充完整封存和不画文字标签的语义约束；锁定Image2重新生成一次，五项视觉与图片合同校验PASS。原失败fixture保留，生产文章/brief/图片未变。
- `candidate-repair-result.json` 与 `codex-rubric-v4-repaired-candidate/visual.json`：H06隔离模型调用证据；不能代替H05完整写作审稿或H08发布。
- `h01-h04-coverage-review.md`：跨模块tripwire观测50次Python/git启动，Codex为0；55个既有状态测试通过。其fixture边界和完整真实流程缺口明确保留。
- 默认agent手动入口已改为program；显式agent在reserve/素材构建前失败关闭，旧prompt退役。最终45项guard/相邻合同回归通过，见 `h01-guard-tests-final-v2.log`，原失败日志保留。
- `two-repo-delivery-readiness.md`：两仓库交付白名单与未版本化依赖闭包已整理；今天已completed，完整新发布必须在下一个未completed的真实当天验证，不清账本、不重复公开。

- `closeout-blog-verify.log`：本轮brief语义约束更新后完整verify通过，58项测试57通过/1跳过，历史队列验证与构建通过。
