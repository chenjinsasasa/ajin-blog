#!/usr/bin/env python3
import tempfile
import unittest
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import blog_repo


class BlogRepoTests(unittest.TestCase):
    def make_repo(self, base: Path, name: str) -> Path:
        repo = base / name
        (repo / ".git").mkdir(parents=True)
        (repo / "content" / "progress").mkdir(parents=True)
        (repo / "public" / "covers").mkdir(parents=True)
        return repo

    def test_is_blog_repo_requires_expected_layout(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            repo = self.make_repo(base, "ajin-blog")
            self.assertTrue(blog_repo.is_blog_repo(repo))
            self.assertFalse(blog_repo.is_blog_repo(base / "missing"))

    def test_resolve_blog_repo_prefers_env_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp), "ajin-blog")
            with patch.dict("os.environ", {blog_repo.BLOG_REPO_ENV: str(repo)}), patch.object(
                blog_repo, "is_responsive_blog_repo", return_value=True
            ):
                resolved = blog_repo.resolve_blog_repo()
        self.assertEqual(resolved, repo.resolve())

    def test_resolve_blog_repo_rejects_unresponsive_env_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp), "ajin-blog")
            with patch.dict("os.environ", {blog_repo.BLOG_REPO_ENV: str(repo)}), patch.object(
                blog_repo, "is_responsive_blog_repo", return_value=False
            ):
                with self.assertRaises(FileNotFoundError) as ctx:
                    blog_repo.resolve_blog_repo()
        self.assertIn("not responsive", str(ctx.exception))

    def test_default_material_search_roots_include_resolved_repo_and_parent(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp), "ajin-blog")
            with patch.object(blog_repo, "resolve_blog_repo", return_value=repo.resolve()):
                roots = blog_repo.default_material_search_roots(workspace=Path(tmp) / "workspace")
        self.assertIn(repo.resolve(), roots)
        self.assertIn(repo.resolve().parent, roots)
        self.assertIn(Path("~/Documents/Codex").expanduser().resolve(), roots)

    def test_is_responsive_blog_repo_runs_probe(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp), "ajin-blog")
            with patch("blog_repo.subprocess.run") as run_mock:
                self.assertTrue(blog_repo.is_responsive_blog_repo(repo))
        run_mock.assert_called_once()

    def test_is_responsive_blog_repo_handles_probe_timeout(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.make_repo(Path(tmp), "ajin-blog")
            with patch(
                "blog_repo.subprocess.run",
                side_effect=blog_repo.subprocess.TimeoutExpired(cmd="probe", timeout=2),
            ):
                self.assertFalse(blog_repo.is_responsive_blog_repo(repo))


if __name__ == "__main__":
    unittest.main()
