#!/usr/bin/env python3

from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from contextlib import redirect_stdout
from urllib.error import URLError
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import blog_publish_repair_loop as loop


def write_article(repo: Path, target_date: str, *, author: str = "gugu", title: str = "安静的一天") -> None:
    progress = repo / "content" / "progress"
    progress.mkdir(parents=True, exist_ok=True)
    (repo / "public" / "covers").mkdir(parents=True, exist_ok=True)
    (progress / f"{target_date}-progress.mdx").write_text(
        "\n".join(
            [
                "---",
                f'title: "{title}"',
                f'date: "{target_date}"',
                'category: "progress"',
                f'author: "{author}"',
                f'coverImage: "/covers/{target_date}.png"',
                "---",
                "",
                "body",
            ]
        ),
        encoding="utf-8",
    )


def args_for(tmp: Path, repo: Path, rotation: Path, *, dry_run: bool = False) -> Namespace:
    return Namespace(
        target_date="2026-07-08",
        expected_author="gugu",
        blog_repo=str(repo),
        validator=str(tmp / "validator.py"),
        rotation_file=str(rotation),
        state_file=str(tmp / "state.json"),
        api_url="https://example.test/api/posts?limit=30",
        page_base_url="https://example.test/blog",
        online_retries=1,
        online_delay_seconds=0.0,
        http_timeout_seconds=1.0,
        validator_timeout_seconds=1,
        push_timeout_seconds=1,
        max_repair_steps=2,
        dry_run=dry_run,
        no_write_state=False,
        json=True,
    )


class BlogPublishRepairLoopTests(unittest.TestCase):
    def test_default_validator_uses_project_copy(self):
        expected = loop.SCRIPT_DIR / "blog_cron_validator.py"

        self.assertEqual(loop.DEFAULT_VALIDATOR, expected)
        self.assertEqual(Path(loop.parse_args([]).validator), expected)
        self.assertNotIn(".openclaw", str(loop.DEFAULT_ROTATION_FILE))

    def test_run_rejects_ok_status_when_online_terminal_reason_is_not_passed(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(
                json.dumps({"order": ["咕咕"], "current_agent": "咕咕", "current_index": 0}),
                encoding="utf-8",
            )
            args = args_for(tmp, repo, rotation)
            result = {
                "schema_version": "blog_publish_repair_loop.v1",
                "status": "ok",
                "reason": "online_probe_not_ready",
                "target_date": "2026-07-08",
                "expected_author": "gugu",
                "blog_repo": str(repo),
                "evidence": [
                    {"step": "validator", "status": "ok", "detail": "exit=0", "data": {}},
                    {
                        "step": "probe.online",
                        "status": "blocked",
                        "detail": "online_probe_not_ready",
                        "data": {},
                    },
                ],
            }

            with patch.object(loop, "execute", return_value=result), redirect_stdout(io.StringIO()):
                exit_code = loop.run(args)

            self.assertEqual(exit_code, 2)

    def test_taxonomy_exit_9_never_enters_push_or_rotation_repair(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(
                json.dumps({"order": ["咕咕"], "current_agent": "咕咕", "current_index": 0}),
                encoding="utf-8",
            )
            args = args_for(tmp, repo, rotation)

            with (
                patch.object(
                    loop,
                    "run_validator",
                    return_value=loop.CommandResult(["validator"], 9, "", "taxonomy failed"),
                ),
                patch.object(loop, "repair_git_push") as push_repair,
                patch.object(loop, "repair_rotation") as rotation_repair,
            ):
                result = loop.execute(args)

            self.assertEqual(result["status"], "notify")
            self.assertEqual(result["reason"], "validator_failed_exit_9")
            push_repair.assert_not_called()
            rotation_repair.assert_not_called()

    def test_success_requires_validator_and_online_api_page(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕", "梨子"], "current_agent": "梨子", "current_index": 1}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)

            def fake_run_validator(_args, _repo, expected_author):
                return loop.CommandResult(["validator"], 0, "", "ok")

            def fake_fetch(url, _timeout):
                if url.endswith("/api/posts?limit=30"):
                    return 200, json.dumps({"posts": [{"date": "2026-07-08", "slug": "2026-07-08-progress"}]})
                if url.endswith("/blog/2026-07-08-progress"):
                    return 200, "<html>ok</html>"
                raise AssertionError(url)

            with patch.object(loop, "run_validator", side_effect=fake_run_validator), patch.object(loop, "fetch_url", side_effect=fake_fetch):
                result = loop.execute(args)

            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["reason"], "terminal_gate_passed")
            self.assertEqual([item["step"] for item in result["evidence"]], ["validator", "probe.online"])

    def test_push_repair_blocks_when_worktree_dirty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕", "梨子"], "current_agent": "咕咕", "current_index": 0}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)
            resolved_repo = repo.resolve()

            validator_results = [loop.CommandResult(["validator"], 3, "", "push missing")]

            def fake_command(command, **_kwargs):
                if command[:4] == ["git", "-C", str(resolved_repo), "status"]:
                    return loop.CommandResult(command, 0, " M post.mdx\n", "")
                raise AssertionError(command)

            with patch.object(loop, "run_validator", side_effect=validator_results), patch.object(loop, "run_command", side_effect=fake_command):
                result = loop.execute(args)

            self.assertEqual(result["status"], "notify")
            self.assertEqual(result["reason"], "worktree_not_clean")

    def test_push_repair_retries_github_ssh_443_then_revalidates(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕", "梨子"], "current_agent": "梨子", "current_index": 1}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)
            resolved_repo = repo.resolve()
            validator_results = [
                loop.CommandResult(["validator"], 3, "", "push missing"),
                loop.CommandResult(["validator"], 0, "", "ok"),
            ]
            push_modes: list[str] = []

            def fake_command(command, **kwargs):
                if command[:4] == ["git", "-C", str(resolved_repo), "status"]:
                    return loop.CommandResult(command, 0, "", "")
                if command[:4] == ["git", "-C", str(resolved_repo), "rev-parse"]:
                    return loop.CommandResult(command, 0, "origin/main\n", "")
                if command[:4] == ["git", "-C", str(resolved_repo), "rev-list"]:
                    return loop.CommandResult(command, 0, "0 1\n", "")
                if command[:4] == ["git", "-C", str(resolved_repo), "log"]:
                    return loop.CommandResult(command, 0, "abc\x1fabc\x1fblog: publish 2026-07-08 progress\n", "")
                if command[:4] == ["git", "-C", str(resolved_repo), "merge-base"]:
                    return loop.CommandResult(command, 0, "", "")
                if command[:3] == ["git", "-C", str(resolved_repo)] and command[3] == "push":
                    mode = "ssh443" if "GIT_SSH_COMMAND" in (kwargs.get("env") or {}) else "default"
                    push_modes.append(mode)
                    if mode == "default":
                        return loop.CommandResult(command, 128, "", "Connection closed by 198.18.0.52 port 22 github.com")
                    return loop.CommandResult(command, 0, "", "")
                raise AssertionError(command)

            def fake_fetch(url, _timeout):
                if "/api/" in url:
                    return 200, json.dumps([{"date": "2026-07-08", "slug": "2026-07-08-progress"}])
                return 200, "ok"

            with patch.object(loop, "run_validator", side_effect=validator_results), patch.object(loop, "run_command", side_effect=fake_command), patch.object(loop, "fetch_url", side_effect=fake_fetch):
                result = loop.execute(args)

            self.assertEqual(result["status"], "ok")
            self.assertEqual(push_modes, ["default", "ssh443"])
            self.assertIn("git_push_succeeded_via_ssh_443", {item["detail"] for item in result["evidence"]})

    def test_rotation_repair_advances_by_article_author(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08", author="gugu", title="轮值闭环")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(
                json.dumps({"order": ["谷子", "咕咕", "梨子"], "current_agent": "咕咕", "current_index": 1}, ensure_ascii=False),
                encoding="utf-8",
            )
            args = args_for(tmp, repo, rotation)
            validator_results = [
                loop.CommandResult(["validator"], 4, "", "rotation not advanced"),
                loop.CommandResult(["validator"], 0, "", "ok"),
            ]

            def fake_fetch(url, _timeout):
                if "/api/" in url:
                    return 200, json.dumps({"date": "2026-07-08", "slug": "2026-07-08-progress"})
                return 200, "ok"

            with patch.object(loop, "run_validator", side_effect=validator_results), patch.object(loop, "fetch_url", side_effect=fake_fetch):
                result = loop.execute(args)

            updated = json.loads(rotation.read_text(encoding="utf-8"))
            self.assertEqual(result["status"], "ok")
            self.assertEqual(updated["current_agent"], "梨子")
            self.assertEqual(updated["current_index"], 2)
            self.assertEqual(updated["last_updated"], "2026-07-08")
            self.assertEqual(updated["last_task"], "轮值闭环")

    def test_non_whitelisted_validator_failure_notifies(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕", "梨子"], "current_agent": "咕咕", "current_index": 0}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)

            with patch.object(loop, "run_validator", return_value=loop.CommandResult(["validator"], 5, "", "author mismatch")):
                result = loop.execute(args)

            self.assertEqual(result["status"], "notify")
            self.assertEqual(result["reason"], "validator_failed_exit_5")

    def test_fetch_url_falls_back_to_curl(self):
        def fake_command(command, **_kwargs):
            self.assertEqual(command[:2], ["curl", "-L"])
            return loop.CommandResult(command, 0, '{"ok": true}\n200', "")

        with patch.object(loop, "fetch_url_with_urllib", side_effect=URLError("tls eof")), patch.object(loop, "run_command", side_effect=fake_command):
            status, body = loop.fetch_url("https://example.test/api", 1.0)

        self.assertEqual(status, 200)
        self.assertEqual(body, '{"ok": true}')

    def test_parse_args_defaults_target_date_to_yesterday_in_shanghai(self):
        with patch.object(loop, "default_target_date", return_value="2026-07-08"):
            args = loop.parse_args([])

        self.assertEqual(args.target_date, "2026-07-08")

    def test_no_write_state_keeps_read_only_probe_ephemeral(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(
                json.dumps({"order": ["咕咕"], "current_agent": "咕咕", "current_index": 0}),
                encoding="utf-8",
            )
            args = args_for(tmp, repo, rotation, dry_run=True)
            args.no_write_state = True
            result = {
                "schema_version": "blog_publish_repair_loop.v1",
                "status": "ok",
                "reason": "terminal_gate_passed",
                "target_date": "2026-07-08",
                "expected_author": "gugu",
                "blog_repo": str(repo),
                "evidence": [],
            }

            with patch.object(loop, "execute", return_value=result), redirect_stdout(io.StringIO()):
                exit_code = loop.run(args)

            self.assertEqual(exit_code, 0)
            self.assertFalse(Path(args.state_file).exists())

    def test_run_writes_failure_evidence_without_external_notification(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕"], "current_agent": "咕咕", "current_index": 0}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)
            args.state_file = str(tmp / "state.json")
            args.json = False

            result = {
                "schema_version": "blog_publish_repair_loop.v1",
                "status": "notify",
                "reason": "validator_failed_exit_5",
                "target_date": "2026-07-08",
                "expected_author": "gugu",
                "blog_repo": str(repo),
                "evidence": [{"step": "validator", "status": "failed", "detail": "exit=5", "data": {}}],
            }
            with patch.object(loop, "execute", return_value=result), redirect_stdout(io.StringIO()):
                exit_code = loop.run(args)

            self.assertEqual(exit_code, 2)
            state = json.loads(Path(args.state_file).read_text(encoding="utf-8"))
            self.assertEqual(state["status"], "notify")
            self.assertNotIn("notification", state)

    def test_run_writes_repair_evidence_without_external_notification(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            repo = tmp / "ajin-blog"
            write_article(repo, "2026-07-08")
            rotation = tmp / "blog-rotation.json"
            rotation.write_text(json.dumps({"order": ["咕咕"], "current_agent": "咕咕", "current_index": 0}), encoding="utf-8")
            args = args_for(tmp, repo, rotation)
            args.state_file = str(tmp / "state.json")
            args.json = False

            result = {
                "schema_version": "blog_publish_repair_loop.v1",
                "status": "ok",
                "reason": "terminal_gate_passed",
                "target_date": "2026-07-08",
                "expected_author": "gugu",
                "blog_repo": str(repo),
                "evidence": [
                    {"step": "validator", "status": "failed", "detail": "exit=3", "data": {}},
                    {"step": "repair.git_push", "status": "repaired", "detail": "git_push_succeeded", "data": {}},
                    {"step": "validator", "status": "ok", "detail": "exit=0", "data": {}},
                    {"step": "probe.online", "status": "ok", "detail": "online_probe_ok", "data": {}},
                ],
            }
            with patch.object(loop, "execute", return_value=result), redirect_stdout(io.StringIO()):
                exit_code = loop.run(args)

            self.assertEqual(exit_code, 0)
            state = json.loads(Path(args.state_file).read_text(encoding="utf-8"))
            self.assertEqual(state["status"], "ok")
            self.assertNotIn("notification", state)


if __name__ == "__main__":
    unittest.main()
