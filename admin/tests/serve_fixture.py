"""Isolated browser fixture service. No production paths or executor calls."""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import uvicorn
from backend.api import create_app
from test_admin import DATE, collect, config, event, state

root = Path(tempfile.mkdtemp(prefix="ajin-admin-browser-"))
cfg = config.__wrapped__(root)
cfg.port = 4320
state(
    cfg,
    [
        event("draft", "started"),
        event("workflow", "needs_attention", reason="fixture_failure"),
    ],
)
p = cfg.repo / f"content/progress/{DATE}-progress.mdx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('---\ntitle: "隔离测试日报"\n---\n此数据仅用于浏览器交互验证。')
collect(cfg)
password = root / "password.txt"
password.write_text("fixture-password")
password.chmod(0o600)
manifest = Path("/tmp/ajin-admin-browser-fixture.json")
manifest.write_text(json.dumps({"password_file": str(password), "root": str(root)}))
print("Fixture ready at 127.0.0.1:4320", flush=True)
uvicorn.run(create_app(cfg), host="127.0.0.1", port=4320, access_log=False)
