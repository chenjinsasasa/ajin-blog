#!/bin/bash
# 阿龙每次 session 开头第一步：bash .claude-init.sh
echo "=== OpenClaw Init Check ==="

echo "--- 当前任务 ---"
cat .claude-task.json | python3 -c "
import json,sys
t=json.load(sys.stdin)
print(f'目标: {t[\"goal\"]}')
print(f'当前 feature: #{t[\"current_feature\"]}')
features=[f for f in t['features'] if f['status']!='done']
for f in features: print(f'  [{f[\"status\"]}] #{f[\"id\"]}: {f[\"desc\"]}')
print(f'验收标准:')
for c in t['acceptance_criteria']: print(f'  - {c}')
"

echo "--- 上次遗留 ---"
tail -30 .claude-progress.md

echo "--- 环境检查 ---"
node -v && npm -v
[ -f package.json ] && echo "✅ package.json 存在" || echo "❌ package.json 不存在"
[ -d node_modules ] && echo "✅ node_modules 已安装" || echo "⚠️ node_modules 未安装，需要 npm install"

echo "=== Init 完成，开始执行 ==="
