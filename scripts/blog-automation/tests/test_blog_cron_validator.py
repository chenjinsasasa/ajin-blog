#!/usr/bin/env python3
import io
import json
import subprocess
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import blog_cron_validator


class BlogCronValidatorTests(unittest.TestCase):
    def test_default_state_paths_are_project_local(self):
        self.assertIn("/.local/blog-automation/", blog_cron_validator.ROTATION_FILE)
        self.assertNotIn(".openclaw", blog_cron_validator.ROTATION_FILE)

    def run_git(self, repo: Path, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", "-C", str(repo), *args],
            check=True,
            capture_output=True,
            text=True,
        )

    def commit_file(self, repo: Path, name: str, content: str, message: str) -> None:
        path = repo / name
        path.write_text(content, encoding="utf-8")
        self.run_git(repo, "add", name)
        self.run_git(repo, "commit", "-m", message)

    def make_repo(self, base: Path) -> Path:
        repo = base / "ajin-blog"
        repo.mkdir()
        self.run_git(repo, "init", "-q")
        self.run_git(repo, "config", "user.email", "test@example.com")
        self.run_git(repo, "config", "user.name", "Test")
        self.run_git(repo, "branch", "-M", "main")
        return repo

    def test_post_taxonomy_rejects_nonzero_and_preserves_original_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "ajin-blog"
            repo.mkdir()
            (repo / "package.json").write_text(
                json.dumps(
                    {
                        "scripts": {
                            "posts:validate": (
                                "node -e \"console.error('businessArea 非法：not-a-business-area'); "
                                "process.exit(17)\""
                            )
                        }
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            with patch.object(blog_cron_validator, "BLOG_REPO", str(repo)):
                ok, detail = blog_cron_validator.check_post_taxonomy()

        self.assertFalse(ok)
        self.assertIn("exit=17", detail)
        self.assertIn("businessArea 非法：not-a-business-area", detail)

    def test_main_stops_at_taxonomy_gate_before_git_checks(self):
        passing = (True, "ok")
        raw_error = "npm run posts:validate 失败 (exit=1):\nbusinessArea 非法：not-a-business-area"

        with (
            patch.object(blog_cron_validator, "check_article_file", return_value=passing),
            patch.object(blog_cron_validator, "check_post_taxonomy", return_value=(False, raw_error)) as taxonomy,
            patch.object(blog_cron_validator, "check_author_consistency", return_value=passing),
            patch.object(blog_cron_validator, "check_cover_integrity", return_value=passing),
            patch.object(blog_cron_validator, "check_summary_artifacts", return_value=passing),
            patch.object(blog_cron_validator, "check_git_commit", return_value=passing) as git_commit,
            patch.object(blog_cron_validator, "check_git_push", return_value=passing) as git_push,
            patch.object(blog_cron_validator, "check_rotation_updated", return_value=passing),
            patch.object(blog_cron_validator.sys, "argv", ["validator", "2026-07-13", "guzi"]),
            redirect_stderr(io.StringIO()) as stderr,
        ):
            with self.assertRaises(SystemExit) as raised:
                blog_cron_validator.main()

        self.assertEqual(raised.exception.code, 9)
        taxonomy.assert_called_once_with()
        git_commit.assert_not_called()
        git_push.assert_not_called()
        self.assertIn("businessArea 非法：not-a-business-area", stderr.getvalue())

    def test_git_push_accepts_target_commit_when_current_head_is_ahead(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp))
            self.commit_file(repo, "post.md", "one", "blog: publish 2026-05-22 progress")
            self.run_git(repo, "branch", "origin-main")
            self.run_git(repo, "branch", "--set-upstream-to=origin-main", "main")
            self.commit_file(repo, "other.md", "two", "blog: align 2026-05-21 title")

            with patch.object(blog_cron_validator, "BLOG_REPO", str(repo)):
                ok, detail = blog_cron_validator.check_git_push("2026-05-22")

        self.assertTrue(ok, detail)

    def test_git_push_rejects_newer_target_commit_not_in_upstream(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp))
            self.commit_file(repo, "post.md", "one", "blog: publish 2026-05-22 progress")
            self.run_git(repo, "branch", "origin-main")
            self.run_git(repo, "branch", "--set-upstream-to=origin-main", "main")
            self.commit_file(repo, "post.md", "two", "blog: polish 2026-05-22 progress")

            with patch.object(blog_cron_validator, "BLOG_REPO", str(repo)):
                ok, detail = blog_cron_validator.check_git_push("2026-05-22")

        self.assertFalse(ok)
        self.assertIn("尚未进入 upstream", detail)

    def test_rotation_check_treats_display_name_as_not_advanced(self):
        with tempfile.TemporaryDirectory() as tmp:
            rotation = Path(tmp) / "blog-rotation.json"
            rotation.write_text(json.dumps({"current_agent": "阿龙"}), encoding="utf-8")

            with (
                patch.object(blog_cron_validator, "ROTATION_FILE", str(rotation)),
                patch.object(blog_cron_validator, "should_check_rotation", return_value=True),
            ):
                ok, detail = blog_cron_validator.check_rotation_updated("2026-05-23", "along")

        self.assertFalse(ok)
        self.assertIn("轮值未推进", detail)

    def test_rotation_check_passes_after_display_name_moves_on(self):
        with tempfile.TemporaryDirectory() as tmp:
            rotation = Path(tmp) / "blog-rotation.json"
            rotation.write_text(json.dumps({"current_agent": "阿毛"}), encoding="utf-8")

            with (
                patch.object(blog_cron_validator, "ROTATION_FILE", str(rotation)),
                patch.object(blog_cron_validator, "should_check_rotation", return_value=True),
            ):
                ok, detail = blog_cron_validator.check_rotation_updated("2026-05-23", "along")

        self.assertTrue(ok, detail)

    def test_rotation_check_skips_historical_backfill(self):
        with tempfile.TemporaryDirectory() as tmp:
            rotation = Path(tmp) / "blog-rotation.json"
            rotation.write_text(json.dumps({"current_agent": "阿毛"}), encoding="utf-8")

            with (
                patch.object(blog_cron_validator, "ROTATION_FILE", str(rotation)),
                patch.object(blog_cron_validator, "should_check_rotation", return_value=False),
            ):
                ok, detail = blog_cron_validator.check_rotation_updated("2026-05-12", "amao")

        self.assertTrue(ok, detail)
        self.assertIn("历史回填", detail)


if __name__ == "__main__":
    unittest.main()
