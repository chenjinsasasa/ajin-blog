# ajin-blog 本机日报管理后台

当前交付：**M1 的首个可用观测切片**，尚未完成整个 V0.1。基于 shadcn-admin 的独立本机后台，含真实日报列表、阶段与运行历史、当前正文/封面只读预览、审稿结论、异常列表、处理意见、本机会话、SQLite 存储、周期采集及备份。

**没有发布写入口。** 恢复和补跑接口仅返回不可用原因，不调用模型、生图、repair、Git 写操作或生产调度。M2 的细分阶段埋点、完整审稿意见、命令队列及受控恢复未交付。已有 `publish` 子阶段无法从旧证据推导，界面明确显示未记录。

## 使用

本机地址：<http://127.0.0.1:4318/reports>。保持 `127.0.0.1`，Host 与 Origin 必须与配置匹配。

从仓库根目录执行：

```sh
admin/adminctl status
admin/adminctl start
admin/adminctl stop
```

首次初始化生成的密码保存在：

```text
~/Library/Application Support/ajin-blog-admin/initial-password.txt
```

密码不写入仓库或日志。设置自己的密码：

```sh
admin/adminctl password
```

交互输入两次，至少 12 个字符；成功后撤销所有会话并删除首次密码文件。浏览器会话有效期 8 小时；HTTP 回环使用 HttpOnly + SameSite=Strict，写请求同时验证 Host、Origin、CSRF。

后台需要 API 与采集 worker 两个进程；关闭网页不会停止它们。服务手动启动，当前未安装登录自启动项，未修改休眠设置。Mac 休眠时无实时观测，唤醒后补齐已启用日期以来的预期日报并对账。外置项目盘不可用时保留最后数据并提示滞后。

## 新环境安装

```sh
python3 -m venv admin/.venv
admin/.venv/bin/pip install -r admin/requirements.lock.txt
npm ci --prefix admin/frontend
npm run build --prefix admin/frontend
admin/adminctl init --repo "$PWD" --openclaw "$HOME/.openclaw"
admin/adminctl start
```

测试环境为 macOS arm64、Node 22.22.2、Python 3.14.3。两个依赖锁文件独立于公开博客。引入源与 MIT 许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。没有 Clerk、遥测、远程字体或云端数据库依赖。

可设置 `AJIN_ADMIN_DATA` 使用隔离数据目录；init 支持 `--port`。初始化不会覆盖现有配置。开发时先运行 API，再使用 Vite；开发代理需同步端口及可信 Origin，日常使用已构建的同源服务。

## 数据和真实状态

- 运行数据：`~/Library/Application Support/ajin-blog-admin/`；日志位于其 `logs/`。
- 数据库：`admin.sqlite3`，WAL、外键、短事务；备份位于 `backups/`，每日自动备份并保留最近 14 份。
- 每 10 秒采集一次，页面每 15 秒更新；采集心跳超过 90 秒显示离线。
- 只读来源：仓库 Git common dir 中的 journal/ledger、本机 OpenClaw 回执与调度定义、`content/progress` 文章及封面。
- 发布成功以 ledger/receipt 的身份、时间和哈希核验为准。本地文章存在不证明发布；未绑定的 `workflow completed` 不证明成功。
- 调度定义只是计划，不证明执行；运行来源无法证明时显示未核实，人工恢复不能充当自然调度成功。
- 历史无证据文章显示待核实，但不默认充当活跃异常。失败、证据冲突和到时未启动进入异常列表。
- 阶段事件不是进程心跳。无法确认执行器活跃时显示待核实，不用最近时间猜测正在执行。
- 产物是当前文件预览，所选运行有独立证据；不宣称正文/封面与历史运行已绑定。审稿仅显示 journal 中的结论，详细审稿意见待后续接入。
- 处理意见与生产状态分离。页面保存意见不会解除 pending 或将失败改为成功。

## 备份与恢复

```sh
admin/adminctl backup
admin/adminctl stop
admin/adminctl restore --file /absolute/path/to/backup.sqlite3
admin/adminctl start
```

备份使用 SQLite Online Backup API 并检查完整性与外键；恢复要求后台停止，先保存现有库，再恢复备份并撤销会话，启动后重新采集原始证据。仅恢复后台自己的数据库，不操作生产 ledger 或进程。

## 验证与合同

```sh
admin/scripts/check.sh
node admin/frontend/tests/browser.mjs
```

check 包含 Python lint、隔离状态/鉴权/备份恢复测试、OpenAPI 严格校验及漂移检查、前端类型检查和构建。需要先初始化数据目录以导出实例端口；CI 可使用临时 `AJIN_ADMIN_DATA`。

浏览器脚本使用本机 Chrome 和首次密码文件，仅对真实服务进行只读 UI 检查，不向真实日报写测试意见；修改密码后可通过 `AJIN_ADMIN_PASSWORD_FILE` 指定测试用凭证文件；`AJIN_ADMIN_URL` 可指定隔离实例地址。测试截图在被 Git 忽略的 `admin/test-results/` 中。

API 使用 FastAPI code-first：模型和路由为上游，`backend/schema.py` 补充文档，`adminctl openapi` 生成 [OpenAPI](docs/api/openapi.json)。已登录时可在 `/api/openapi.json` 查看相同合同。本版 11 个业务接口，不声明尚未实现的命令端点；未向 Apifox 发布。

公开博客的 `npm run build` 仍按原项目规则验证文章，不能用后台检查替代。后台目录被根 TypeScript/ESLint 和 Vercel 部署入口隔离；根网站自身检查仍须运行。
