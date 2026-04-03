#!/bin/bash
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
[ -f .env.local ] && echo "✅ .env.local 存在" || echo "⚠️ .env.local 不存在，需要创建"
curl -s -o /dev/null -w "服务状态: %{http_code}\n" http://localhost:3000

echo "=== Init 完成，开始执行 ==="
