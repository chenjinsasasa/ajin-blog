#!/usr/bin/env python3
import tempfile
import unittest
import sys
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import blog_materials_builder


class BlogMaterialsBuilderTests(unittest.TestCase):
    def test_default_state_paths_are_project_local(self):
        self.assertEqual(
            blog_materials_builder.MEMORY_DIR,
            blog_materials_builder.BLOG_REPO / ".local" / "blog-automation",
        )
        self.assertNotIn(".openclaw", str(blog_materials_builder.MEMORY_DIR))

    def test_parse_git_log_records_keeps_commit_after_merge_without_files(self):
        output = (
            "\x1e7ba2010b091dea619804fcefaf0e7265596a364e"
            "\x1f2026-05-18T14:14:18+08:00"
            "\x1fmerge: integrate codex/20260505-project-updates into main\n"
            "\x1ea2a08bf30fd5c852b51c5437a5f1aa4a720d2a6e"
            "\x1f2026-05-18T13:46:09+08:00"
            "\x1ffeat: update eomji-mvp frontend and content assets\n"
            "frontend/src/App.tsx\n"
            "frontend/src/styles/app-shell.css\n"
        )

        records = blog_materials_builder.parse_git_log_records(output)

        self.assertEqual(len(records), 2)
        self.assertEqual(records[0][0], "7ba2010b091dea619804fcefaf0e7265596a364e")
        self.assertEqual(records[0][3], [])
        self.assertEqual(records[1][0], "a2a08bf30fd5c852b51c5437a5f1aa4a720d2a6e")
        self.assertEqual(records[1][3], ["frontend/src/App.tsx", "frontend/src/styles/app-shell.css"])

    def test_collect_git_materials_keeps_merge_and_following_commit(self):
        output = (
            "\x1e7ba2010b091dea619804fcefaf0e7265596a364e"
            "\x1f2026-05-18T14:14:18+08:00"
            "\x1fmerge: integrate codex/20260505-project-updates into main\n"
            "\x1ea2a08bf30fd5c852b51c5437a5f1aa4a720d2a6e"
            "\x1f2026-05-18T13:46:09+08:00"
            "\x1ffeat: update eomji-mvp frontend and content assets\n"
            "frontend/src/App.tsx\n"
            "frontend/src/styles/app-shell.css\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = root / "eomji-mvp"
            (repo / ".git").mkdir(parents=True)

            with patch.object(
                blog_materials_builder.subprocess,
                "run",
                return_value=SimpleNamespace(returncode=0, stdout=output),
            ):
                materials = blog_materials_builder.collect_git_materials(
                    blog_materials_builder.MaterialContext(
                        target_date="2026-05-18",
                        search_roots=[root],
                    )
                )

        material_ids = {item["material_id"] for item in materials}
        self.assertIn("git-7ba2010b091d", material_ids)
        self.assertIn("git-a2a08bf30fd5", material_ids)
        frontend = next(item for item in materials if item["material_id"] == "git-a2a08bf30fd5")
        self.assertEqual(frontend["tags"][-1], "mainline:frontend")

    def test_collect_git_materials_accepts_repo_root_as_search_root(self):
        output = (
            "\x1eabc123456789"
            "\x1f2026-05-18T10:00:00+08:00"
            "\x1ffeat: direct repo root\n"
            "frontend/src/App.tsx\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "direct-repo"
            (repo / ".git").mkdir(parents=True)

            with patch.object(
                blog_materials_builder.subprocess,
                "run",
                return_value=SimpleNamespace(returncode=0, stdout=output),
            ):
                materials = blog_materials_builder.collect_git_materials(
                    blog_materials_builder.MaterialContext(
                        target_date="2026-05-18",
                        search_roots=[repo],
                    )
                )

        self.assertEqual(len(materials), 1)
        self.assertEqual(materials[0]["repo"], "direct-repo")
        self.assertEqual(materials[0]["material_id"], "git-abc123456789")

    def test_default_target_date_uses_previous_day_before_dawn(self):
        target = blog_materials_builder.default_target_date(
            datetime(2026, 5, 24, 1, 30, tzinfo=blog_materials_builder.TZ_GMT8)
        )

        self.assertEqual(target, "2026-05-23")

    def test_default_target_date_uses_same_day_after_dawn(self):
        target = blog_materials_builder.default_target_date(
            datetime(2026, 5, 24, 23, 5, tzinfo=blog_materials_builder.TZ_GMT8)
        )

        self.assertEqual(target, "2026-05-24")

    def test_build_summary_does_not_claim_sessions_are_not_connected(self):
        material = {
            "material_id": "codex-session-test",
            "target_date": "2026-05-23",
            "source_type": "codex_session",
            "source_id": "session#turn-1",
            "event_time": "2026-05-23T10:00:00+08:00",
            "title": "Codex 会话",
            "summary": "Codex session 已进入博客素材链。",
            "action_type": "summary_generated",
            "actor": "codex",
            "visibility": "public",
            "confidence": 0.9,
            "relevance_score": 0.9,
            "publishability_score": 0.9,
            "novelty_score": 0.9,
            "target_date_confidence": 0.9,
        }

        summary = blog_materials_builder.build_summary(
            blog_materials_builder.MaterialContext(target_date="2026-05-23", search_roots=[]),
            [material],
            [],
        )

        self.assertTrue(any("session 素材已接入" in risk for risk in summary["risks"]))
        self.assertFalse(any("session 当前未作为主扫描源接入" in risk for risk in summary["risks"]))

    def test_build_summary_surfaces_project_coverage_threads(self):
        base = {
            "target_date": "2026-05-23",
            "source_id": "session#turn-1",
            "event_time": "2026-05-23T10:00:00+08:00",
            "action_type": "summary_generated",
            "actor": "codex",
            "visibility": "public",
            "confidence": 0.9,
            "relevance_score": 0.9,
            "publishability_score": 0.9,
            "novelty_score": 0.9,
            "target_date_confidence": 0.9,
        }
        materials = [
            {
                **base,
                "material_id": "feishu-material",
                "source_type": "codex_session",
                "title": "飞书机器人权限闭环",
                "summary": "飞书机器人完成 im:chat:readonly 权限与 home channel 验证。",
            },
            {
                **base,
                "material_id": "eomji-material",
                "source_type": "codex_session",
                "title": "创作工作台会话管理",
                "summary": "Eomji 创作工作台接入 assistant-ui 线程模型。",
            },
        ]

        summary = blog_materials_builder.build_summary(
            blog_materials_builder.MaterialContext(target_date="2026-05-23", search_roots=[]),
            materials,
            [],
        )
        rendered = blog_materials_builder.render_summary_md(summary)
        labels = {item["label"] for item in summary["coverage_threads"]}

        self.assertIn("飞书 / Hermes 会话治理", labels)
        self.assertIn("Eomji / 创作工作台", labels)
        self.assertIn("0. 项目覆盖清单（写作前必须扫）", rendered)

    def test_build_summary_uses_existing_article_author_for_historical_rerun(self):
        with tempfile.TemporaryDirectory() as tmp:
            article = Path(tmp) / "2026-05-23-progress.mdx"
            article.write_text(
                '---\ndate: "2026-05-23"\nauthor: along\n---\n\nbody\n',
                encoding="utf-8",
            )
            material = {
                "material_id": "blog-material",
                "target_date": "2026-05-23",
                "source_type": "codex_session",
                "source_id": "session#turn-1",
                "event_time": "2026-05-23T10:00:00+08:00",
                "title": "博客素材链",
                "summary": "博客素材链完成补强。",
                "action_type": "summary_generated",
                "actor": "codex",
                "visibility": "public",
                "confidence": 0.9,
                "relevance_score": 0.9,
                "publishability_score": 0.9,
                "novelty_score": 0.9,
                "target_date_confidence": 0.9,
            }

            with patch.object(blog_materials_builder, "progress_article_path", return_value=article):
                summary = blog_materials_builder.build_summary(
                    blog_materials_builder.MaterialContext(target_date="2026-05-23", search_roots=[]),
                    [material],
                    [],
                )

        self.assertEqual(summary["rotation_author"], {"display_name": "阿龙", "author_id": "along"})


if __name__ == "__main__":
    unittest.main()
