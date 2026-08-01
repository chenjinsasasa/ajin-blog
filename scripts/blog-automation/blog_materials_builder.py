#!/usr/bin/env python3
"""
Blog materials builder.

职责：
1. 采集多源候选素材
2. 生成 L1 material jsonl
3. 生成 L2 summary json / md
4. 为博客写作链路提供稳定上游

当前版本重点修正：
- task-insight 仅接受严格日期归属
- runtime 降低 updated_at 权重，优先 completed_at / task_id 日期
- 低置信度或仅弱证据素材不进入 L2 public 主叙事
- git 同日多 commit 改为按主线覆盖优先，避免前端/后端/文档主进展漏召回
- git log 使用显式 record separator，避免 merge commit 无文件列表时吞掉下一条主线 commit
- Codex 缺少 .codex-summary.md 时，仍优先保留同日强 git 事实，不让结构化缺失掩盖真实代码推进
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from collections import OrderedDict, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Iterable

from blog_repo import (
    automation_state_dir,
    default_material_search_roots,
    progress_article_path,
    resolve_blog_repo,
)
from codex_materials import collect_codex_materials
from session_materials import collect_session_materials

TZ_GMT8 = timezone(timedelta(hours=8))
SCRIPT_DIR = Path(__file__).resolve().parent
BLOG_REPO = resolve_blog_repo(require_responsive=False)
WORKSPACE = BLOG_REPO
MEMORY_DIR = automation_state_dir(BLOG_REPO)
RAW_BLOG_DIR = MEMORY_DIR / "raw" / "blog-materials"
SUMMARY_DIR = MEMORY_DIR / "blog-materials"
TASK_RUNTIME_DIR = MEMORY_DIR / "task-runtime"
TASK_INSIGHT_DIR = MEMORY_DIR / "raw"
BLOG_ROTATION = MEMORY_DIR / "blog-rotation.json"
BLOG_GIT_RULES_PATH = SCRIPT_DIR / "blog_git_rules.json"
LEGACY_OPENCLAW_WORKSPACE = Path(
    os.path.expanduser(os.getenv("AJIN_BLOG_LEGACY_OPENCLAW_WORKSPACE", "~/.openclaw/workspace"))
)
DEFAULT_PROJECT_ROOTS = default_material_search_roots(WORKSPACE)
DATE_RE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
TASK_ID_DATE_RE = re.compile(r"(?:-|_)(20\d{6})(?:\b|[-_])")
GIT_RECORD_SEP = "\x1e"
GIT_FIELD_SEP = "\x1f"


@dataclass
class MaterialContext:
    target_date: str
    search_roots: list[Path]


def now_tz() -> datetime:
    return datetime.now(TZ_GMT8)


def default_target_date(now: datetime | None = None) -> str:
    """Default late-night reruns before dawn to the previous workday."""
    current = now or now_tz()
    if current.tzinfo is None:
        current = current.replace(tzinfo=TZ_GMT8)
    if current.hour < 6:
        current = current - timedelta(days=1)
    return current.strftime("%Y-%m-%d")


def ensure_dirs() -> None:
    RAW_BLOG_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARY_DIR.mkdir(parents=True, exist_ok=True)


AUTHOR_ID_TO_DISPLAY = {
    "guzi": "谷子",
    "along": "阿龙",
    "amao": "阿毛",
    "xiaojin": "小锦",
    "ashang": "阿商",
    "gugu": "咕咕",
    "lizi": "梨子",
    "xiaou": "小U",
    "dangao": "蛋糕",
    "ajin": "阿锦",
}
AUTHOR_DISPLAY_TO_ID = {value: key for key, value in AUTHOR_ID_TO_DISPLAY.items()}


def load_article_author(target_date: str) -> dict | None:
    try:
        article = progress_article_path(target_date)
        if not article.exists():
            return None
        content = article.read_text(encoding="utf-8", errors="ignore")
    except (FileNotFoundError, OSError):
        return None
    match = re.search(r'^author:\s*["\']?([^"\'\n]+)', content, re.MULTILINE)
    if not match:
        return None
    author_id = match.group(1).strip()
    return {"display_name": AUTHOR_ID_TO_DISPLAY.get(author_id, author_id), "author_id": author_id}


def load_rotation_author(target_date: str | None = None) -> dict:
    if target_date:
        article_author = load_article_author(target_date)
        if article_author:
            return article_author
    if BLOG_ROTATION.exists():
        data = json.loads(BLOG_ROTATION.read_text(encoding="utf-8"))
        display = data.get("current_agent", "未知")
        return {"display_name": display, "author_id": AUTHOR_DISPLAY_TO_ID.get(display, "unknown")}
    return {"display_name": "未知", "author_id": "unknown"}


def load_blog_git_rules() -> dict:
    if BLOG_GIT_RULES_PATH.exists():
        return json.loads(BLOG_GIT_RULES_PATH.read_text(encoding="utf-8"))
    return {"repo_rules": {}, "fallback_templates": {}, "mainline_detection": {}}


BLOG_GIT_RULES = load_blog_git_rules()


def material_id(prefix: str, value: str) -> str:
    safe = value.replace("/", "_").replace(" ", "-")
    return f"{prefix}-{safe}"


def pick_action_type_from_path(path: Path) -> str:
    name = path.name.lower()
    if "review" in name:
        return "review_completed"
    if "insight" in name:
        return "decision_made"
    if path.suffix == ".json":
        return "task_completed"
    return "summary_generated"


def extract_first_date(text: str) -> str | None:
    m = DATE_RE.search(text)
    return m.group(1) if m else None


def parse_compact_date(value: str | None) -> str | None:
    if not value:
        return None
    m = TASK_ID_DATE_RE.search(value)
    if not m:
        return None
    raw = m.group(1)
    return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"


def parse_iso_to_target_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(TZ_GMT8)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        m = DATE_RE.search(value)
        return m.group(1) if m else None


def determine_task_insight_date(path: Path) -> tuple[str | None, str, float]:
    filename_date = parse_compact_date(path.name) or extract_first_date(path.name.replace("_", "-"))
    if filename_date:
        return filename_date, "filename:task_id_suffix", 0.95
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None, "task-insight:no-read", 0.0

    field_patterns = [
        r"\*\*时间\*\*:\s*[^\n]*?(20\d{2}-\d{2}-\d{2})",
        r"\*自动生成\s*·\s*(20\d{2}-\d{2}-\d{2})",
        r"\*\*任务 ID\*\*:\s*`[^`]*?(20\d{6})`",
    ]
    for pattern in field_patterns:
        m = re.search(pattern, text)
        if not m:
            continue
        value = m.group(1)
        if len(value) == 8 and value.isdigit():
            value = f"{value[:4]}-{value[4:6]}-{value[6:8]}"
        return value, "content:strict-field", 0.9
    return None, "task-insight:no-strict-date", 0.0


def determine_runtime_date(path: Path) -> tuple[str | None, str, float]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None, "runtime:no-read", 0.0

    completed = parse_iso_to_target_date(data.get("completed_at"))
    if completed:
        return completed, "json:completed_at", 0.95

    task_id_date = parse_compact_date(str(data.get("task_id", "")))
    if task_id_date:
        return task_id_date, "json:task_id_suffix", 0.9

    started = parse_iso_to_target_date(data.get("started_at"))
    if started:
        return started, "json:started_at", 0.8

    created = parse_iso_to_target_date(data.get("created_at"))
    if created:
        return created, "json:created_at", 0.7

    updated = parse_iso_to_target_date(data.get("updated_at"))
    if updated:
        return updated, "json:updated_at_weak", 0.35

    return None, "runtime:no-date", 0.0


def determine_memory_date(path: Path, source_type: str) -> tuple[str | None, str, float]:
    filename_date = extract_first_date(path.name)
    if filename_date:
        return filename_date, "filename:first_date", 0.98
    if source_type == "hermes_session":
        return None, "session:no-filename-date", 0.0
    try:
        stat_date = datetime.fromtimestamp(path.stat().st_mtime, tz=TZ_GMT8).strftime("%Y-%m-%d")
        return stat_date, "mtime:fallback", 0.2
    except OSError:
        return None, "no-date", 0.0


def determine_target_date_for_path(path: Path, source_type: str) -> tuple[str | None, str, float]:
    if source_type == "openclaw_task":
        return determine_task_insight_date(path)
    if source_type == "openclaw_runtime":
        return determine_runtime_date(path)
    if source_type in {"openclaw_memory", "hermes_session"}:
        return determine_memory_date(path, source_type)
    try:
        stat_date = datetime.fromtimestamp(path.stat().st_mtime, tz=TZ_GMT8).strftime("%Y-%m-%d")
        return stat_date, "mtime:fallback", 0.2
    except OSError:
        return None, "no-date", 0.0


def classify_git_mainline(item: dict) -> str:
    subject = str(item.get("title", "")).lower()
    files = [str(x).lower() for x in item.get("files", [])]
    joined = "\n".join(files)

    if "frontend" in subject or "ui" in subject or "tailwind" in subject or "shadcn" in subject:
        return "frontend"
    if any(
        token in joined
        for token in (
            "frontend/",
            "/components/",
            "/pages/",
            "app.tsx",
            "globals.css",
            "app.css",
            "/ui/",
        )
    ):
        return "frontend"

    if any(token in subject for token in ("docs", "doc", "standard", "spec", "guide")):
        return "docs"
    if any(token in joined for token in ("docs/", ".md", "prd", "spec")):
        return "docs"

    if any(token in subject for token in ("backend", "api", "model", "service", "feat")):
        return "backend"
    if any(token in joined for token in ("backend/", "/api", "/services", "/models", "/routes")):
        return "backend"

    return "other"


def summarize_git_material(item: dict) -> str:
    repo = str(item.get("repo") or "未知仓库")
    subject = str(item.get("title", "")).strip()
    subject_lower = subject.lower()
    mainline = classify_git_mainline(item)
    repo_rule = BLOG_GIT_RULES.get("repo_rules", {}).get(repo, {})

    publish_tokens = repo_rule.get("publish_subject_tokens", [])
    if publish_tokens and any(token in subject_lower for token in publish_tokens):
        return repo_rule.get("publish_summary") or f"{repo} 完成发布链路闭环。"

    mainline_templates = repo_rule.get("mainline_templates", {})
    if mainline in mainline_templates:
        return mainline_templates[mainline]

    if repo_rule.get("default_summary"):
        return repo_rule["default_summary"]

    fallback = BLOG_GIT_RULES.get("fallback_templates", {})
    template = fallback.get(mainline) or fallback.get("other") or "{repo} 在目标日期内有提交：{subject}。"
    return template.format(repo=repo, subject=subject)


def git_material_actor(repo_name: str) -> str:
    repo_rule = BLOG_GIT_RULES.get("repo_rules", {}).get(repo_name, {})
    if repo_rule.get("actor"):
        return repo_rule["actor"]
    return "ajin"


def git_material_relevance(repo_name: str, subject: str, mainline: str) -> float:
    subject_lower = subject.lower()
    repo_rule = BLOG_GIT_RULES.get("repo_rules", {}).get(repo_name, {})
    publish_tokens = repo_rule.get("publish_subject_tokens", [])
    if publish_tokens and any(token in subject_lower for token in publish_tokens):
        return float(repo_rule.get("publish_relevance", 0.35))
    base = 0.9
    if mainline in {"frontend", "backend", "docs"}:
        base += 0.05
    return min(base, 0.98)


def parse_git_log_records(output: str) -> list[tuple[str, str, str, list[str]]]:
    records: list[tuple[str, str, str, list[str]]] = []
    for raw_record in output.split(GIT_RECORD_SEP):
        record = raw_record.strip("\n")
        if not record:
            continue
        lines = [line for line in record.splitlines() if line.strip()]
        if not lines:
            continue
        header = lines[0].split(GIT_FIELD_SEP, 2)
        if len(header) != 3:
            continue
        commit_hash, commit_time, subject = header
        records.append((commit_hash, commit_time, subject, lines[1:]))
    return records


def iter_git_repos(search_roots: Iterable[Path]) -> Iterable[Path]:
    seen: set[Path] = set()
    for root in search_roots:
        if not root.exists():
            continue
        candidates = []
        if (root / ".git").exists():
            candidates.append(root)
        candidates.extend(git_dir.parent for git_dir in root.glob("*/.git"))
        for repo in candidates:
            resolved = repo.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            yield repo


def collect_git_materials(ctx: MaterialContext) -> list[dict]:
    items: list[dict] = []
    start = f"{ctx.target_date} 00:00"
    end = f"{ctx.target_date} 23:59"
    for repo in iter_git_repos(ctx.search_roots):
        cmd = [
            "git", "-C", str(repo), "log", "--after", start, "--before", end,
            f"--pretty=format:%x1e%H%x1f%cI%x1f%s", "--name-only"
        ]
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=False)
        except Exception:
            continue
        if out.returncode != 0 or not out.stdout.strip():
            continue
        for commit_hash, commit_time, subject, files in parse_git_log_records(out.stdout):
            mainline = classify_git_mainline({"title": subject, "files": files})
            items.append({
                "material_id": material_id("git", commit_hash[:12]),
                "target_date": ctx.target_date,
                "source_type": "git",
                "source_id": commit_hash,
                "event_time": commit_time,
                "actor": git_material_actor(repo.name),
                "action_type": "code_changed",
                "title": subject,
                "summary": summarize_git_material({"repo": repo.name, "title": subject, "files": files}),
                "visibility": "public",
                "fingerprint": f"git|{repo.name}|{commit_hash}",
                "repo": repo.name,
                "files": files,
                "tags": ["git", "blog-materials", f"mainline:{mainline}"],
                "evidence_path": f"repo:{repo.name}@{commit_hash}",
                "confidence": 0.98,
                "publishability_score": 0.95,
                "novelty_score": 0.92,
                "relevance_score": git_material_relevance(repo.name, subject, mainline),
                "date_evidence": "git-log-range",
                "target_date_confidence": 0.99,
            })
    return items


def collect_file_materials(ctx: MaterialContext, base_dir: Path, glob_pattern: str, source_type: str, actor: str, visibility: str = "public") -> list[dict]:
    items: list[dict] = []
    if not base_dir.exists():
        return items
    for path in sorted(base_dir.glob(glob_pattern)):
        derived_date, date_evidence, target_conf = determine_target_date_for_path(path, source_type)
        if derived_date != ctx.target_date:
            continue
        if source_type == "openclaw_task" and target_conf < 0.9:
            continue
        if source_type == "openclaw_runtime" and target_conf < 0.7:
            continue
        try:
            stat = path.stat()
            event_time = datetime.fromtimestamp(stat.st_mtime, tz=TZ_GMT8).isoformat()
        except OSError:
            continue
        items.append({
            "material_id": material_id(source_type, path.stem),
            "target_date": ctx.target_date,
            "source_type": source_type,
            "source_id": str(path),
            "event_time": event_time,
            "actor": actor,
            "action_type": pick_action_type_from_path(path),
            "title": path.name,
            "summary": f"检测到 {source_type} 候选文件 {path.name}。",
            "visibility": visibility,
            "fingerprint": f"{source_type}|{path}",
            "files": [str(path)],
            "tags": [source_type, "blog-materials"],
            "evidence_path": str(path),
            "confidence": 0.82,
            "publishability_score": 0.75 if visibility == "public" else 0.35,
            "novelty_score": 0.85,
            "relevance_score": 0.8,
            "date_evidence": date_evidence,
            "target_date_confidence": target_conf,
        })
    return items


def dedupe_materials(materials: list[dict]) -> tuple[list[dict], list[dict]]:
    canonical = {}
    discarded = []
    for item in materials:
        fp = item["fingerprint"]
        if fp not in canonical:
            canonical[fp] = item
            continue
        existing = canonical[fp]
        score_a = (existing.get("confidence", 0) + existing.get("relevance_score", 0))
        score_b = (item.get("confidence", 0) + item.get("relevance_score", 0))
        if score_b > score_a:
            discarded.append({"material_id": existing["material_id"], "reason": "duplicate"})
            canonical[fp] = item
        else:
            discarded.append({"material_id": item["material_id"], "reason": "duplicate"})
    return list(canonical.values()), discarded


def sort_materials_for_summary(materials: list[dict]) -> list[dict]:
    git_items = [m for m in materials if m.get("source_type") == "git"]
    non_git_items = [m for m in materials if m.get("source_type") != "git"]

    picked_git_ids: set[str] = set()
    selected_git: list[dict] = []

    by_repo_mainline: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for item in git_items:
        repo = str(item.get("repo") or "unknown")
        mainline = classify_git_mainline(item)
        by_repo_mainline[(repo, mainline)].append(item)

    preferred_mainlines = ["frontend", "backend", "docs"]
    for (repo, mainline), items_in_bucket in by_repo_mainline.items():
        repo_rule = BLOG_GIT_RULES.get("repo_rules", {}).get(repo, {})
        if repo_rule.get("mainline_selection_exclude"):
            continue
        if mainline not in preferred_mainlines:
            continue
        best = max(
            items_in_bucket,
            key=lambda x: (
                len(x.get("files", [])),
                x.get("relevance_score", 0),
                x.get("novelty_score", 0),
                str(x.get("event_time", "")),
            ),
        )
        if best["material_id"] not in picked_git_ids:
            selected_git.append(best)
            picked_git_ids.add(best["material_id"])

    remaining_git = sorted(
        [m for m in git_items if m["material_id"] not in picked_git_ids],
        key=lambda x: (
            x.get("relevance_score", 0),
            len(x.get("files", [])),
            x.get("novelty_score", 0),
            str(x.get("event_time", "")),
        ),
        reverse=True,
    )

    selected_git.extend(remaining_git)

    ordered_non_git = sorted(
        non_git_items,
        key=lambda x: (
            x.get("source_type") != "codex",
            x.get("confidence", 0),
            x.get("relevance_score", 0),
            str(x.get("event_time", "")),
        ),
        reverse=True,
    )
    return selected_git + ordered_non_git


def classify_coverage_thread(item: dict) -> str:
    blob = " ".join(
        str(part)
        for part in [
            item.get("repo") or "",
            item.get("source_id") or "",
            item.get("evidence_path") or "",
            item.get("title") or "",
            item.get("summary") or "",
            " ".join(str(x) for x in (item.get("files") or [])),
            " ".join(str(x) for x in (item.get("tags") or [])),
        ]
    ).lower()
    rules = [
        ("Obsidian 知识库", ("obsidian", "知识库", "vault", "草儿绽放", "阿锦（陈锦）", "历史兼容层")),
        ("飞书 / Hermes 会话治理", ("飞书", "feishu", "lark-cli", "机器人", "im:chat", "home channel", "session_search", "长连接")),
        ("Eomji / 创作工作台", ("eomji", "创作工作台", "assistant-ui", "小红书", "/create", "create.css")),
        ("博客素材链", ("博客素材", "blog-materials", "每日博客", "coverimage", "frontmatter", "progress post")),
        ("OpenClaw / 执行内核", ("openclaw", "控制面", "workflow-engine", "claude-agent-sdk", "执行内核")),
    ]
    for label, keywords in rules:
        if any(keyword.lower() in blob for keyword in keywords):
            return label
    repo = str(item.get("repo") or "").strip()
    if repo:
        return repo
    source_type = str(item.get("source_type") or "其他素材").strip()
    return source_type or "其他素材"


def build_coverage_threads(materials: list[dict]) -> list[dict]:
    threads: OrderedDict[str, dict] = OrderedDict()
    for item in materials:
        label = classify_coverage_thread(item)
        thread = threads.setdefault(
            label,
            {
                "label": label,
                "material_count": 0,
                "highlights": [],
                "supporting_material_ids": [],
            },
        )
        thread["material_count"] += 1
        if len(thread["supporting_material_ids"]) < 12:
            thread["supporting_material_ids"].append(item["material_id"])
        if len(thread["highlights"]) < 4:
            thread["highlights"].append({
                "text": item["summary"],
                "source_type": item.get("source_type"),
                "actor": item.get("actor", "unknown"),
                "supporting_material_ids": [item["material_id"]],
            })

    return sorted(
        threads.values(),
        key=lambda x: (x["material_count"], len(x["highlights"])),
        reverse=True,
    )[:10]


def build_summary(ctx: MaterialContext, materials: list[dict], discarded: list[dict]) -> dict:
    public_materials = [
        m for m in sort_materials_for_summary(materials)
        if m.get("visibility") == "public" and m.get("target_date_confidence", 0) >= 0.7
    ]
    by_source = defaultdict(list)
    for item in materials:
        by_source[item["source_type"]].append(item["material_id"])

    core_progress = []
    factual_outputs = []
    execution_progress = []
    key_decisions = []
    leftovers = []
    missing_repo_configs: set[str] = set()

    def is_documents_codex_item(item: dict) -> bool:
        blob_parts = [
            str(item.get("source_id") or ""),
            str(item.get("evidence_path") or ""),
            str(item.get("summary") or ""),
            str(item.get("title") or ""),
            " ".join(str(x) for x in (item.get("files") or [])),
        ]
        return "/Users/chenjin/Documents/Codex" in " ".join(blob_parts)

    def item_priority(item: dict) -> tuple:
        source_type = str(item.get("source_type") or "")
        action = str(item.get("action_type") or "")
        summary_text = str(item.get("summary") or "")
        source_rank = {
            "openclaw_memory": 6,
            "openclaw_task": 5,
            "codex": 4,
            "codex_session": 3,
            "hermes_session": 2,
            "git": 1,
        }.get(source_type, 0)
        if source_type == "codex_session" and "博客的素材来源" in summary_text:
            source_rank += 2
        if source_type == "hermes_session" and any(
            marker in summary_text for marker in ["Obsidian", "知识库", "阿锦（陈锦）", "草儿绽放"]
        ):
            source_rank += 2
        if is_documents_codex_item(item):
            source_rank += 1
        action_rank = 1 if action in {"decision_made", "review_completed", "code_changed", "doc_written"} else 0
        return (
            source_rank,
            action_rank,
            item.get("confidence", 0),
            item.get("relevance_score", 0),
            item.get("publishability_score", 0),
            item.get("novelty_score", 0),
            str(item.get("event_time", "")),
        )

    prioritized_materials = sorted(public_materials, key=item_priority, reverse=True)

    for item in prioritized_materials[:16]:
        action = item.get("action_type")
        summary_text = item["summary"]
        if item.get("source_type") == "openclaw_memory":
            try:
                text = Path(item["source_id"]).read_text(encoding="utf-8", errors="ignore")
                highlights = []
                if "### 今日核心进展" in text:
                    block = text.split("### 今日核心进展", 1)[1].split("\n### ", 1)[0]
                    for line in block.splitlines():
                        stripped = line.strip()
                        m = re.match(r"^\*\*\d+\.\s*(.+?)\*\*$", stripped)
                        if m:
                            highlights.append(m.group(1).strip())
                for marker in ("**完成亮点**", "**关键决策**", "**待办遗留**"):
                    if highlights:
                        break
                    if marker in text:
                        block = text.split(marker, 1)[1]
                        for line in block.splitlines()[1:6]:
                            if line.strip().startswith("- "):
                                highlights.append(line.strip()[2:])
                        if highlights:
                            break
                if highlights:
                    summary_text = "；".join(highlights[:3])
            except Exception:
                pass
        if action in {"code_changed", "doc_written", "config_changed", "asset_created", "review_completed"}:
            factual_outputs.append({
                "type": action,
                "text": summary_text,
                "files": item.get("files", []),
                "repo": item.get("repo"),
                "commit": item.get("source_id") if item.get("source_type") == "git" else None,
                "supporting_material_ids": [item["material_id"]],
            })
        if item.get("source_type") == "git" and item.get("repo") == "ajin-blog" and "发布链路证据" in summary_text:
            continue
        if item.get("source_type") == "git":
            repo_name = str(item.get("repo") or "")
            repo_rules = BLOG_GIT_RULES.get("repo_rules", {})
            if repo_name and repo_name not in repo_rules:
                missing_repo_configs.add(repo_name)
        if action in {"decision_made", "option_rejected", "review_completed"}:
            key_decisions.append({
                "decision": item["title"],
                "reason": summary_text,
                "rejected_options": [],
                "supporting_material_ids": [item["material_id"]],
            })
        execution_progress.append({
            "actor": item.get("actor", "unknown"),
            "text": summary_text,
            "supporting_material_ids": [item["material_id"]],
        })
        core_progress.append({
            "text": summary_text,
            "supporting_material_ids": [item["material_id"]],
        })

    if not public_materials:
        leftovers.append({
            "text": "当天公开候选素材为空，需人工补充或确认是否允许生成空素材进展文。",
            "owner": "芝麻",
            "next_step": "检查 target_date、visibility 与多源抓取是否命中。",
            "supporting_material_ids": [],
        })

    if missing_repo_configs:
        repo_list = ", ".join(sorted(missing_repo_configs))
        leftovers.append({
            "text": f"检测到缺少 blog_git_rules 配置的活跃仓库：{repo_list}。",
            "owner": "芝麻",
            "next_step": "为这些 repo 补 actor、mainline_templates 或 fallback 规则，避免长期只走通用摘要。",
            "supporting_material_ids": [],
        })

    selected_ids = [m["material_id"] for m in public_materials]
    rotation_author = load_rotation_author(ctx.target_date)

    session_material_count = len(by_source.get("codex_session", [])) + len(by_source.get("hermes_session", []))
    risks = [
        "若 Codex 无稳定结构化落盘，后续素材采集仍会退化到 memory/session 转述。",
        "若同日多条强 git commit 未按主线覆盖选材，博客仍可能低估真实推进量。",
    ]
    if session_material_count:
        risks.append(f"session 素材已接入，本次命中 {session_material_count} 条；仍需确认公开性过滤有效。")
    else:
        risks.append("session 素材未命中；若主干素材不足，需检查 Codex/Hermes session 目录。")

    summary = {
        "target_date": ctx.target_date,
        "generated_at": now_tz().isoformat(),
        "rotation_author": rotation_author,
        "summary_ready": bool(public_materials),
        "headline_candidates": [
            f"{ctx.target_date} 的工作推进汇总",
            "把今天做了什么整理成统一素材总账",
            "从多源素材收口到博客工作汇总的一天",
        ],
        "coverage_threads": build_coverage_threads(prioritized_materials),
        "core_progress": core_progress[:5],
        "factual_outputs": factual_outputs[:8],
        "execution_progress": execution_progress[:8],
        "key_decisions": key_decisions[:6],
        "leftovers": leftovers[:6],
        "people_contributions": {
            "ajin": [x["text"] for x in execution_progress if x["actor"] == "ajin"],
            "guzi": [x["text"] for x in execution_progress if x["actor"] == "guzi"],
            "zhima": [x["text"] for x in execution_progress if x["actor"] == "zhima"],
            "codex": [x["text"] for x in execution_progress if x["actor"] == "codex"],
            "claude": [x["text"] for x in execution_progress if x["actor"] == "claude"],
            "others": [x["text"] for x in execution_progress if x["actor"] not in {"ajin", "guzi", "zhima", "codex", "claude"}],
        },
        "sources": [
            {"source_type": key, "count": len(vals), "primary_items": vals[:5]}
            for key, vals in sorted(by_source.items())
        ],
        "selected_material_ids": selected_ids,
        "discarded_materials": discarded,
        "risks": risks,
        "notes": [
            "当前为 MVP 骨架，已改为严格归属日期优先。"
        ],
    }
    return summary


def render_summary_md(summary: dict) -> str:
    rotation = summary["rotation_author"]
    lines = [
        f"今日工作汇总 · {summary['target_date']}",
        "",
        "基本信息",
        f"- 目标日期：{summary['target_date']}",
        f"- 轮值作者：{rotation['display_name']}（{rotation['author_id']}）",
        f"- 生成时间：{summary['generated_at']}",
        f"- 是否可生成博客：{'是' if summary['summary_ready'] else '否'}",
        "",
        "0. 项目覆盖清单（写作前必须扫）",
    ]
    for thread in summary.get("coverage_threads", []):
        lines.append(f"- {thread['label']}：{thread['material_count']} 条")
        for item in thread.get("highlights", [])[:3]:
            lines.append(f"  - {item['actor']}: {item['text']}")
    lines += [
        "",
        "1. 今日核心推进",
    ]
    for item in summary["core_progress"]:
        lines.append(f"- {item['text']}")
    lines += ["", "2. 事实产出"]
    for item in summary["factual_outputs"]:
        lines.append(f"- {item['text']}")
        if item.get("repo"):
            lines.append(f"  - repo: {item['repo']}")
        if item.get("files"):
            lines.append(f"  - 路径: {', '.join(item['files'][:3])}")
        if item.get("commit"):
            lines.append(f"  - commit: {item['commit']}")
    lines += ["", "3. 执行推进"]
    for item in summary["execution_progress"]:
        lines.append(f"- {item['actor']}: {item['text']}")
    lines += ["", "4. 关键判断"]
    for item in summary["key_decisions"]:
        lines.append(f"- 判断：{item['decision']}")
        lines.append(f"  - 原因：{item['reason']}")
    lines += ["", "5. 遗留 / 未完成"]
    for item in summary["leftovers"]:
        lines.append(f"- {item['text']}")
        lines.append(f"  - owner: {item['owner']}")
        lines.append(f"  - next step: {item['next_step']}")
    lines += ["", "6. 来源索引"]
    for item in summary["sources"]:
        lines.append(f"- {item['source_type']}: {', '.join(item['primary_items'])}")
    lines += ["", "7. 公开表达风险"]
    for item in summary["risks"]:
        lines.append(f"- {item}")
    return "\n".join(lines) + "\n"


def write_jsonl(path: Path, materials: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for item in materials:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def run(target_date: str, search_roots: Iterable[str | Path]) -> dict:
    ensure_dirs()
    ctx = MaterialContext(target_date=target_date, search_roots=[Path(p).expanduser() for p in search_roots])

    materials: list[dict] = []
    materials.extend(collect_git_materials(ctx))
    materials.extend(collect_file_materials(ctx, TASK_INSIGHT_DIR, "task-insight-*.md", "openclaw_task", "guzi"))
    materials.extend(collect_file_materials(ctx, TASK_RUNTIME_DIR, "*.json", "openclaw_runtime", "guzi", visibility="internal"))
    materials.extend(collect_file_materials(ctx, MEMORY_DIR, f"{target_date}.md", "openclaw_memory", "guzi"))
    materials.extend(collect_file_materials(ctx, MEMORY_DIR, f"daily_summary_{target_date}.md", "hermes_session", "zhima"))
    legacy_memory = LEGACY_OPENCLAW_WORKSPACE / "memory"
    legacy_runtime = LEGACY_OPENCLAW_WORKSPACE / "state" / "harness" / "task-runtime"
    if LEGACY_OPENCLAW_WORKSPACE.exists() and LEGACY_OPENCLAW_WORKSPACE != WORKSPACE:
        materials.extend(collect_file_materials(ctx, legacy_memory / "raw", "task-insight-*.md", "openclaw_task", "guzi"))
        materials.extend(collect_file_materials(ctx, legacy_runtime, "*.json", "openclaw_runtime", "guzi", visibility="internal"))
        materials.extend(collect_file_materials(ctx, legacy_memory, f"{target_date}.md", "openclaw_memory", "guzi"))
        materials.extend(collect_file_materials(ctx, legacy_memory, f"daily_summary_{target_date}.md", "hermes_session", "zhima"))
    materials.extend(collect_codex_materials(target_date, search_roots))
    materials.extend(collect_session_materials(target_date))

    deduped, discarded = dedupe_materials(materials)
    summary = build_summary(ctx, deduped, discarded)

    l1_path = RAW_BLOG_DIR / f"{target_date}.jsonl"
    summary_json_path = SUMMARY_DIR / f"{target_date}-summary.json"
    summary_md_path = SUMMARY_DIR / f"{target_date}-summary.md"

    write_jsonl(l1_path, deduped)
    summary_json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    summary_md_path.write_text(render_summary_md(summary), encoding="utf-8")

    return {
        "l1_path": str(l1_path),
        "summary_json_path": str(summary_json_path),
        "summary_md_path": str(summary_md_path),
        "materials_count": len(deduped),
        "discarded_count": len(discarded),
        "summary_ready": summary["summary_ready"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build blog materials L1/L2 artifacts")
    parser.add_argument(
        "target_date",
        nargs="?",
        help="素材归属日期；不传时 00:00-05:59 默认补前一日，其他时间默认当天。",
    )
    parser.add_argument("--root", action="append", dest="roots", default=[], help="额外搜索根目录")
    args = parser.parse_args()

    target_date = args.target_date or default_target_date()
    roots = [Path(r).expanduser() for r in (args.roots or [])] or DEFAULT_PROJECT_ROOTS
    roots = [r for r in roots if r.exists()]
    result = run(target_date, roots)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
