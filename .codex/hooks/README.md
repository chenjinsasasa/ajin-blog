# ajin-blog Codex Hook

该 Hook 只处理 Codex 通过 `apply_patch` 完成的文件修改：

1. `PostToolUse` 把本轮修改文件记录到 `.git/codex-hook-state/`。
2. `Stop` 按 `rules.json` 选择只读验证命令。
3. 首次失败会要求 Codex 在当前任务继续修复；连续两次失败后停止自动续跑。
4. 验证通过后删除本轮状态。

## 当前规则

- 站点代码、脚本或配置：`npm run verify`
- 文章或封面：`npm run posts:validate`
- 两类同时修改时只运行完整验证。

## 本地检查

```bash
node --check .codex/hooks/project-hook.mjs
node --test .codex/hooks/project-hook.test.mjs
node .codex/hooks/project-hook.mjs explain <file...>
```

首次加载或 Hook 定义变化后，需要在 Codex 中审核并信任；CLI 使用 `/hooks`。

## 边界

- 不执行 `commit`、`push`、发布、写回、邮件发送或其他外部副作用。
- 不读取或输出 secret。
- 直接通过 shell 生成的文件目前不会被记录；第一阶段只覆盖 Codex 标准 `apply_patch` 编辑路径。
