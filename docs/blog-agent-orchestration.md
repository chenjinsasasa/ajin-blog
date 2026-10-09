# 本地 OpenClaw agent 发布编排

实施日期：2026-10-03。

## 分工

OpenClaw main agent 负责调度会话内的业务判断、阶段选择和失败恢复。`blog_agent_actions.py` 暴露阶段工具，Runtime 执行模型调用、文件合同、Git 和线上验收。`blog_publish_workflow.py` 保留作旧程序兼容入口，主 cron 不再调用它决定整个流程。

主任务 23:30 直接生产当天日报；先确认前一天及更旧 pending 对应日期的线上 progress 日报。线上同日期存在即可跳过该日；缺失则按原失败阶段续跑；线上请求异常为未知。01:15 恢复任务只处理昨天及更旧 pending，09:20 检查任务保持只读。

运行中的后台进程必须轮询到退出，不把暂无输出当失败。重复故障有界重试；持续阻塞记录实际日期、阶段、原因和证据。同一 brief 连续两轮候选在同一焦点失败后，由 OpenClaw 重新判断隐喻是否明确；需要时通过配置文本模型重建 brief，再生成新输入对应的候选，不盲目重复抽图或放宽视觉门。

## 工具与状态

- 工具：`/Users/chenjin/.openclaw/workspace/scripts/blog_agent_actions.py`
- 当前 agent 指令：`/Users/chenjin/.openclaw/workspace/config/ajin-blog-orchestrator-agent.md`
- 阶段状态：`.git/blog-program-workflow/<date>/<run_id>/agent-state.json`
- 管理后台兼容日志：同目录 `state.json`
- 互斥与完成账本：`.git/blog-publish-guard.json`，持有既有 guard lock 执行阶段。

阶段为 prepare、draft、review、revision（仅明确隐私阻断）、brief、image、visual、verify、commit、push、rotation、accept。agent 选择阶段，工具校验前置条件与文件绑定，不自动执行下一阶段。

`settle-public` 只针对绑定的失败 pending，再次联网确认同日期 progress 日报。它写新 `agent_public_reconciliation` 回执，保留原失败文件/哈希，原子结算 pending。状态观察器显示 published、evidence_level=public_date_only、new_publication=false、automatic_run_status=failed、natural_schedule_verified=false；terminal_gate_passed=false。此记录说明线上已经存在，不冒充当前运行通过完整发布验收。

新阶段失败后复用原 run_id 和成功阶段，重跑失败阶段；成功结算使用新路径，原失败回执保持不变。Image 2 来源、隐私门、分类、视觉哈希绑定、构建及部署验收不变。

## 实施与回退

原文件和 cron 配置备份在 `/Users/chenjin/.openclaw/workspace/tasks/ajin-blog-agent-orchestration-20261003/baseline/`，包含哈希清单。回退需通过 `openclaw cron edit` 恢复原 command payload；不要在 Gateway 运行时直接覆盖 jobs.json。

隔离检查使用临时 Git 仓库、mock 模型与线上查询，不产生真实文章、图片、远端 Git 或线上发布。自然 cron 下一次触发的实际结果必须单独验证；代码检查或 cron 配置回读不能证明自然执行成功。

## 本次验证结果

- 分阶段接口、线上查询、原失败结算、互斥、回执观察、原 cron 通知、命令子进程清理：95 项隔离检查通过。
- 两条 cron 已通过正式 CLI 切换成 agentTurn，并回读核对 ID、时区、调度、启用状态与通知目的地；09:20 的 command 检查任务保持原配置。
- 2026-10-03 已实时确认 2026-10-01 progress 日报在线，审计结算 c8ca22dfbfb24bd6a81f4d56b3819a07 旧 pending；原失败回执保持不变，新的结算不表示新发布。
- 用户随后授权真实续跑 2026-10-02 日报，沿用 run_id `5a5b2f62b5c24d44ac758ea08a500db6`。OpenClaw 完成正文与隐私审查；旧 brief 的候选连续失败后，配置文本模型重建 brief，新 Image 2 封面通过五项视觉检查。
- 2026-10-03 17:14（上海时间）真实发布验收成功：提交 `2dce90b7f3868db6d2c1dfb3993acd3f6fb40062`，GitLab 流水线 434 的 validate、deploy_production 均 success；公开 API 返回同日期 progress，文章 `/blog/2026-10-02-progress` 返回 200，线上封面 SHA256 与本地一致。账本 pending=null，新成功回执 terminal_gate_passed=true，原失败回执仍保留。
- 实跑中修正审查素材上下文过大、内置 Codex CLI 路径与版本、已成功视觉回执中的限定重连诊断处理，并补充受约束的 brief/image 重建工具。完整正文、原始素材及其哈希保留；独立视觉 FAIL 不会转为 PASS。
- 旧整链路 fixture 使用已过时的 writer mock，实际落入配置模型请求，已中止；不将其记为通过。新接口的恢复/状态/通知采用独立隔离 fixture 验证。
- 本次手动触发及本地 agent 续跑已取得完整发布成功证据；下一次 23:30 自然 cron 触发尚未验证。

回退编排时须保留对 agent_public_reconciliation 回执的兼容读取；不要覆盖当前账本复活已结算 pending。原账本备份用于审计，不作为可盲目覆盖的回退步骤。

## 审稿请求总预算治理（2026-10-09）

审稿大小由共享 `blog_content_fact_gate.py` 工具入口控制，覆盖 agent 分阶段调用及旧 Runtime 兼容调用。工具测量最终序列化请求，包含完整文章、来源、引文映射、JSON Schema 和格式恢复指令；正常请求原样发送，超限时自动整理重复来源信息与节选上下文，仍执行 256 KiB 硬上限。agent 无需自行猜测节选参数。

保留完整文章、全部来源身份和原始哈希绑定，不更改原素材；节选策略与请求字节数进入审稿回执。来源节选不等于完整事实核验，隐私审稿仍由 OpenClaw 配置模型执行。若最小上下文仍无法装入，写入本 run 的 `request-size-error.json` 诊断并在调用模型前阻断；agent 对相同输入不盲目重试。大小预检不消耗编辑审稿次数，修复后可沿原 run 恢复 review。

只读 `--check-pass` 必须命中有效 PASS 回执，缺失或过期直接失败，禁止隐式发起模型审稿。隐私阻断、修订次数、哈希验证及后续封面、构建、推送和部署验收仍由既有合同执行。
