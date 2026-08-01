#!/usr/bin/env python3
"""
Codex materials adapter for blog pipeline.

职责：
- 读取 Codex 相关结构化产物与本地活跃痕迹
- 优先支持 .codex-summary.md / .codex-task.json / .codex-review-*.md
- 统一转成 L1 material dict 列表
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Iterable

TZ_GMT8 = timezone(timedelta(hours=8))
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CODEX_HOME = Path(os.path.expanduser("~/.codex"))
CODEX_LOG_DIR = Path(os.path.expanduser("~/Library/Logs/com.openai.codex"))
BULLET_RE = re.compile(r"^\s*-\s+(.*)$")
KV_RE = re.compile(r"^\s*-\s*([a-zA-Z_]+):\s*(.*)$")


@dataclass
class CodexMaterialContext:
    target_date: str
    workspace: Path
    visibility_default: str = "public"


def iso_from_ts(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=TZ_GMT8).isoformat()


def material_base(*, material_id: str, target_date: str, source_id: str, event_time: str,
                  title: str, summary: str, action_type: str, visibility: str,
                  evidence_path: str, files: list[str] | None = None,
                  tags: list[str] | None = None, confidence: float = 0.7,
                  publishability_score: float = 0.8, novelty_score: float = 0.8,
                  relevance_score: float = 0.8, codex_role: str | None = None,
                  prompt_source: str | None = None, output_artifacts: list[str] | None = None,
                  target_date_confidence: float = 0.9) -> dict:
    data = {
        "material_id": material_id,
        "target_date": target_date,
        "source_type": "codex",
        "source_id": source_id,
        "event_time": event_time,
        "actor": "codex",
        "action_type": action_type,
        "title": title,
        "summary": summary,
        "visibility": visibility,
        "fingerprint": f"codex|{source_id}",
        "confidence": confidence,
        "publishability_score": publishability_score,
        "novelty_score": novelty_score,
        "relevance_score": relevance_score,
        "evidence_path": evidence_path,
        "tags": tags or ["codex"],
        "files": files or [],
        "target_date_confidence": target_date_confidence,
    }
    if codex_role:
        data["codex_role"] = codex_role
    if prompt_source:
        data["prompt_source"] = prompt_source
    if output_artifacts:
        data["output_artifacts"] = output_artifacts
    return data


def iter_structured_codex_files(search_roots: Iterable[Path]) -> Iterable[Path]:
    patterns = [".codex-summary.md", ".codex-task.json", ".codex-review-*.md"]
    for root in search_roots:
        if not root.exists():
            continue
        for pattern in patterns:
            yield from root.rglob(pattern)


def parse_codex_summary_md(path: Path) -> dict | None:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        return None
    data: dict[str, object] = {
        "key_files": [],
        "key_decisions": [],
        "leftovers": [],
        "must_mention": [],
        "verification": [],
    }
    current_list_key = None
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") or not stripped:
            continue
        if stripped.startswith("- "):
            stripped = stripped[2:]
        if ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = value.strip()
            if key in {"key_files", "key_decisions", "leftovers", "must_mention", "verification"}:
                current_list_key = key
                if value:
                    data[key] = [value]
            else:
                data[key] = value
                current_list_key = None
            continue
        bullet = BULLET_RE.match(line)
        if bullet and current_list_key:
            cast = data.setdefault(current_list_key, [])
            if isinstance(cast, list):
                cast.append(bullet.group(1).strip())
    return data


def load_structured_materials(ctx: CodexMaterialContext, search_roots: Iterable[Path]) -> list[dict]:
    materials: list[dict] = []
    for path in iter_structured_codex_files(search_roots):
        lowered = str(path).lower()
        if any(token in lowered for token in ("sandbox", "demo", "test")):
            continue
        try:
            stat = path.stat()
        except OSError:
            continue
        event_time = iso_from_ts(stat.st_mtime)
        name = path.name
        path_score = 0.0
        if "ajin-blog" in lowered:
            path_score = 0.08
        elif "/documents/开发项目/" in lowered or "/volumes/sata/chenjinprojects/active/" in lowered:
            path_score = 0.05
        if name == ".codex-summary.md":
            parsed = parse_codex_summary_md(path) or {}
            target_date = str(parsed.get("target_date", "")).strip()
            if target_date != ctx.target_date:
                continue
            publishable = str(parsed.get("publishable", "true")).lower() == "true"
            candidate = str(parsed.get("blog_material_candidate", "true")).lower() == "true"
            if not publishable or not candidate:
                continue
            summary = str(parsed.get("public_summary") or parsed.get("what_changed") or parsed.get("objective") or "Codex 完成了一次结构化任务总结。")
            title = str(parsed.get("task_name") or "Codex 结构化任务总结")
            key_files = parsed.get("key_files") if isinstance(parsed.get("key_files"), list) else []
            key_decisions = parsed.get("key_decisions") if isinstance(parsed.get("key_decisions"), list) else []
            leftovers = parsed.get("leftovers") if isinstance(parsed.get("leftovers"), list) else []
            must_mention = parsed.get("must_mention") if isinstance(parsed.get("must_mention"), list) else []
            materials.append(material_base(
                material_id=f"codex-summary-{path.parent.name}-{int(stat.st_mtime)}",
                target_date=ctx.target_date,
                source_id=str(path),
                event_time=event_time,
                title=title,
                summary=summary,
                action_type="code_changed",
                visibility="public",
                evidence_path=str(path),
                files=[str(path), *[str(x) for x in key_files]],
                tags=["codex", "summary", "blog-materials", *[str(x) for x in must_mention[:5]]],
                confidence=0.94 + path_score,
                publishability_score=0.96,
                novelty_score=0.9 + min(path_score, 0.05),
                relevance_score=0.96 + path_score,
                codex_role=str(parsed.get("role") or "implementation"),
                prompt_source=str(parsed.get("prompt_source") or "manual"),
                output_artifacts=[str(x) for x in key_files],
                target_date_confidence=0.98,
            ))
            for idx, decision in enumerate(key_decisions[:5], start=1):
                materials.append(material_base(
                    material_id=f"codex-decision-{path.parent.name}-{idx}-{int(stat.st_mtime)}",
                    target_date=ctx.target_date,
                    source_id=f"{path}#decision-{idx}",
                    event_time=event_time,
                    title=f"{title} · 关键决策 {idx}",
                    summary=decision,
                    action_type="decision_made",
                    visibility="public",
                    evidence_path=str(path),
                    files=[str(path)],
                    tags=["codex", "decision", "blog-materials"],
                    confidence=0.9 + path_score,
                    publishability_score=0.94,
                    novelty_score=0.88 + min(path_score, 0.05),
                    relevance_score=0.95 + path_score,
                    codex_role=str(parsed.get("role") or "implementation"),
                    prompt_source=str(parsed.get("prompt_source") or "manual"),
                    target_date_confidence=0.98,
                ))
            for idx, item in enumerate(leftovers[:5], start=1):
                materials.append(material_base(
                    material_id=f"codex-leftover-{path.parent.name}-{idx}-{int(stat.st_mtime)}",
                    target_date=ctx.target_date,
                    source_id=f"{path}#leftover-{idx}",
                    event_time=event_time,
                    title=f"{title} · 遗留事项 {idx}",
                    summary=item,
                    action_type="summary_generated",
                    visibility="public",
                    evidence_path=str(path),
                    files=[str(path)],
                    tags=["codex", "leftover", "blog-materials"],
                    confidence=0.85 + path_score,
                    publishability_score=0.9,
                    novelty_score=0.85 + min(path_score, 0.05),
                    relevance_score=0.9 + path_score,
                    codex_role=str(parsed.get("role") or "implementation"),
                    prompt_source=str(parsed.get("prompt_source") or "manual"),
                    target_date_confidence=0.98,
                ))
            continue

        title = f"Codex 结构化产物：{name}"
        summary = f"检测到 Codex 结构化产物 {name}，可作为博客素材候选。"
        action_type = "review_completed" if "review" in name else "summary_generated"
        if name == ".codex-task.json":
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                data = {}
            target_date = str(data.get("target_date", "")).strip()
            if target_date != ctx.target_date:
                continue
            title = str(data.get("task_name") or title)
            summary = str(data.get("summary") or summary)
            action_type = "code_changed"
            key_files = data.get("files") if isinstance(data.get("files"), list) else []
            materials.append(material_base(
                material_id=f"codex-task-{path.parent.name}-{int(stat.st_mtime)}",
                target_date=ctx.target_date,
                source_id=str(path),
                event_time=event_time,
                title=title,
                summary=summary,
                action_type=action_type,
                visibility=ctx.visibility_default,
                evidence_path=str(path),
                files=[str(path), *[str(x) for x in key_files]],
                tags=["codex", "task", "blog-materials"],
                confidence=0.9 + path_score,
                publishability_score=0.92,
                novelty_score=0.88 + min(path_score, 0.05),
                relevance_score=0.94 + path_score,
                codex_role=str(data.get("role") or "implementation"),
                prompt_source=str(data.get("prompt_source") or "manual"),
                output_artifacts=[str(x) for x in key_files],
                target_date_confidence=0.98,
            ))
            continue

        materials.append(material_base(
            material_id=f"codex-{path.stem}-{int(stat.st_mtime)}",
            target_date=ctx.target_date,
            source_id=str(path),
            event_time=event_time,
            title=title,
            summary=summary,
            action_type=action_type,
            visibility=ctx.visibility_default,
            evidence_path=str(path),
            files=[str(path)],
            codex_role="review",
            prompt_source="manual",
            output_artifacts=[str(path)],
            target_date_confidence=0.9,
        ))
    return materials


def load_activity_fallback(ctx: CodexMaterialContext) -> list[dict]:
    materials: list[dict] = []
    if CODEX_LOG_DIR.exists():
        dated_dir = CODEX_LOG_DIR / ctx.target_date[:4] / ctx.target_date[5:7] / ctx.target_date[8:10]
        if dated_dir.exists():
            for path in sorted(dated_dir.glob("*.log"))[:20]:
                try:
                    stat = path.stat()
                except OSError:
                    continue
                materials.append(material_base(
                    material_id=f"codex-activity-{path.stem}",
                    target_date=ctx.target_date,
                    source_id=str(path),
                    event_time=iso_from_ts(stat.st_mtime),
                    title="Codex 当日活跃记录",
                    summary="检测到 Codex 当日活跃日志，仅作活跃补证，不作为博客正文主依据。",
                    action_type="summary_generated",
                    visibility="internal",
                    evidence_path=str(path),
                    files=[str(path)],
                    confidence=0.45,
                    publishability_score=0.2,
                    novelty_score=0.75,
                    relevance_score=0.5,
                    codex_role="validation",
                    prompt_source="manual",
                    target_date_confidence=0.95,
                ))
    state_file = CODEX_HOME / ".codex-global-state.json"
    if state_file.exists():
        try:
            stat = state_file.stat()
            payload = json.loads(state_file.read_text(encoding="utf-8"))
            prompt_history = payload.get("electron-persisted-atom-state", {}).get("prompt-history", [])
            if prompt_history:
                materials.append(material_base(
                    material_id=f"codex-global-state-{ctx.target_date}",
                    target_date=ctx.target_date,
                    source_id=str(state_file),
                    event_time=iso_from_ts(stat.st_mtime),
                    title="Codex prompt-history 活跃痕迹",
                    summary="检测到 Codex prompt-history，可作为当日使用痕迹补证，不能直接作为博客正文主依据。",
                    action_type="summary_generated",
                    visibility="internal",
                    evidence_path=str(state_file),
                    files=[str(state_file)],
                    confidence=0.35,
                    publishability_score=0.1,
                    novelty_score=0.6,
                    relevance_score=0.4,
                    codex_role="validation",
                    prompt_source="manual",
                    target_date_confidence=0.85,
                ))
        except Exception:
            pass
    return materials


def collect_codex_materials(target_date: str, search_roots: Iterable[str | Path]) -> list[dict]:
    roots = [Path(p).expanduser() for p in search_roots]
    ctx = CodexMaterialContext(target_date=target_date, workspace=PROJECT_ROOT)
    materials = []
    materials.extend(load_structured_materials(ctx, roots))
    materials.extend(load_activity_fallback(ctx))
    return materials


if __name__ == "__main__":
    import sys

    target_date = sys.argv[1] if len(sys.argv) > 1 else datetime.now(TZ_GMT8).strftime("%Y-%m-%d")
    roots = sys.argv[2:] or [
        os.path.expanduser("~/Documents/开发项目"),
        "/Volumes/Sata/Work/开发项目",
        str(PROJECT_ROOT),
    ]
    print(json.dumps(collect_codex_materials(target_date, roots), ensure_ascii=False, indent=2))
