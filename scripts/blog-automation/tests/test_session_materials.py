#!/usr/bin/env python3
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import session_materials


class SessionMaterialsTests(unittest.TestCase):
    def test_collect_codex_session_skips_agents_prompt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dated = root / "2026" / "05" / "21"
            dated.mkdir(parents=True)
            session_path = dated / "rollout-test.jsonl"
            events = [
                {
                    "type": "session_meta",
                    "timestamp": "2026-05-20T18:00:00Z",
                    "payload": {"id": "abc", "cwd": "/repo"},
                },
                {
                    "type": "response_item",
                    "timestamp": "2026-05-20T18:01:00Z",
                    "payload": {
                        "type": "message",
                        "role": "user",
                        "content": [{"type": "input_text", "text": "# AGENTS.md instructions\n..."}],
                    },
                },
                {
                    "type": "response_item",
                    "timestamp": "2026-05-20T18:02:00Z",
                    "payload": {
                        "type": "message",
                        "role": "user",
                        "content": [{"type": "input_text", "text": "继续修复博客素材链路"}],
                    },
                },
                {
                    "type": "response_item",
                    "timestamp": "2026-05-20T18:03:00Z",
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": "已完成 builder 接入并通过测试。"}],
                    },
                },
            ]
            session_path.write_text("\n".join(json.dumps(item) for item in events), encoding="utf-8")

            items = session_materials.collect_codex_session_materials("2026-05-21", root)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["source_type"], "codex_session")
        self.assertEqual(items[0]["actor"], "codex")
        self.assertEqual(items[0]["visibility"], "public")
        self.assertIn("继续修复博客素材链路", items[0]["summary"])
        self.assertNotIn("AGENTS.md", items[0]["summary"])

    def test_collect_hermes_session_marks_sensitive_internal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            session_path = root / "session_20260521_000000_abcd.json"
            session_path.write_text(
                json.dumps(
                    {
                        "session_id": "20260521_000000_abcd",
                        "platform": "cli",
                        "session_start": "2026-05-21T00:00:00",
                        "last_updated": "2026-05-21T00:05:00",
                        "messages": [
                            {"role": "user", "content": "接入 app_secret 后继续验证"},
                            {"role": "assistant", "content": "已完成验证，但包含敏感凭据线索。"},
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            items = session_materials.collect_hermes_session_materials("2026-05-21", root)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["visibility"], "internal")


if __name__ == "__main__":
    unittest.main()
