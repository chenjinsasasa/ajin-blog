#!/usr/bin/env python3
"""
Session materials adapter for the blog pipeline.

This adapter turns Codex and Hermes session records into compact material
summaries. It intentionally avoids copying full transcripts into L1 output.
"""
from __future__ import annotations

import json
import hashlib
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

TZ_GMT8 = timezone(timedelta(hours=8))
CODEX_SESSIONS_DIR = Path(os.path.expanduser("~/.codex/sessions"))
HERMES_SESSIONS_DIR = Path(os.path.expanduser("~/.hermes/sessions"))

SENSITIVE_RE = re.compile(
    r"(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|cookie|authorization|bearer|open[_-]?id|app[_-]?secret|feishu_app|user_code|flow_id|oauth|credential|凭据|密钥)",
    re.IGNORECASE,
)
PROGRESS_RE = re.compile(
    r"(完成|修复|补齐|补全|补发|发布|推送|接入|验证|通过|落盘|更新|实现|重构|优化|commit|push|build|test)",
    re.IGNORECASE,
)
NOISE_MARKERS = (
    "# AGENTS.md instructions",
    "<environment_context>",
    "Review the conversation above",
    "执行完成后无需回复任何内容",
    "proactive_heartbeat.py",
    "bg_task_cron.py",
)


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(TZ_GMT8)
    except Exception:
        return None


def target_window(target_date: str) -> tuple[datetime, datetime]:
    start = datetime.strptime(target_date, "%Y-%m-%d").replace(tzinfo=TZ_GMT8)
    return start, start + timedelta(days=1)


def iso_from_path_mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=TZ_GMT8).isoformat()


def coerce_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str):
                parts.append(text)
        return "\n".join(part for part in parts if part)
    if isinstance(content, dict):
        text = content.get("text")
        return text if isinstance(text, str) else ""
    return ""


def compact_text(text: str, limit: int = 180) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def is_noise(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    return any(marker in stripped for marker in NOISE_MARKERS)


def first_meaningful(texts: Iterable[str]) -> str:
    for text in texts:
        if not is_noise(text):
            return text
    return ""


def last_meaningful(texts: Iterable[str]) -> str:
    picked = ""
    for text in texts:
        if not is_noise(text):
            picked = text
    return picked


def safe_id(prefix: str, value: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_.-]+", "-", value).strip("-")
    return f"{prefix}-{safe[:120] or 'unknown'}"


def content_fingerprint(source_type: str, prompt: str, outcome: str) -> str:
    digest = hashlib.sha256(
        f"{source_type}\n{compact_text(prompt, 500)}\n{compact_text(outcome, 800)}".encode("utf-8")
    ).hexdigest()
    return f"{source_type}|content|{digest[:16]}"


def material(
    *,
    material_id: str,
    target_date: str,
    source_type: str,
    source_id: str,
    event_time: str,
    actor: str,
    title: str,
    summary: str,
    evidence_path: str,
    visibility: str,
    tags: list[str],
    confidence: float,
    fingerprint: str | None = None,
) -> dict:
    publishability = 0.78 if visibility == "public" else 0.25
    return {
        "material_id": material_id,
        "target_date": target_date,
        "source_type": source_type,
        "source_id": source_id,
        "event_time": event_time,
        "actor": actor,
        "action_type": "summary_generated",
        "title": title,
        "summary": summary,
        "visibility": visibility,
        "fingerprint": fingerprint or f"{source_type}|{source_id}",
        "files": [evidence_path],
        "tags": tags,
        "evidence_path": evidence_path,
        "confidence": confidence,
        "publishability_score": publishability,
        "novelty_score": 0.82,
        "relevance_score": 0.78 if visibility == "public" else 0.35,
        "date_evidence": "session-timestamp",
        "target_date_confidence": 0.9,
    }


def session_visibility(*texts: str) -> str:
    combined = "\n".join(texts)
    if SENSITIVE_RE.search(combined):
        return "internal"
    if not PROGRESS_RE.search(combined):
        return "internal"
    return "public"


def build_turn_pairs(records: list[tuple[str, str, datetime | None]]) -> list[tuple[str, str, datetime | None]]:
    pairs: list[tuple[str, str, datetime | None]] = []
    current_user = ""
    current_user_ts: datetime | None = None
    assistant_texts: list[str] = []
    assistant_times: list[datetime] = []

    def close_current() -> None:
        nonlocal current_user, current_user_ts, assistant_texts, assistant_times
        if current_user:
            outcome = last_meaningful(assistant_texts)
            if outcome:
                pair_ts = assistant_times[-1] if assistant_times else current_user_ts
                pairs.append((current_user, outcome, pair_ts))
        current_user = ""
        current_user_ts = None
        assistant_texts = []
        assistant_times = []

    for role, text, ts in records:
        if is_noise(text):
            continue
        if role == "user":
            close_current()
            current_user = text
            current_user_ts = ts
            continue
        if role == "assistant" and current_user:
            assistant_texts.append(text)
            if ts:
                assistant_times.append(ts)

    close_current()
    return pairs


def iter_codex_session_files(target_date: str, codex_sessions_dir: Path = CODEX_SESSIONS_DIR) -> Iterable[Path]:
    year, month, day = target_date.split("-")
    dated_dir = codex_sessions_dir / year / month / day
    if not dated_dir.exists():
        return []
    return sorted(dated_dir.glob("*.jsonl"))


def collect_codex_session_materials(target_date: str, codex_sessions_dir: Path = CODEX_SESSIONS_DIR) -> list[dict]:
    start, end = target_window(target_date)
    items: list[dict] = []
    for path in iter_codex_session_files(target_date, codex_sessions_dir):
        session_id = path.stem
        cwd = ""
        records: list[tuple[str, str, datetime | None]] = []
        event_times: list[datetime] = []
        try:
            with path.open(encoding="utf-8") as fh:
                for line in fh:
                    if not line.strip():
                        continue
                    try:
                        event = json.loads(line)
                    except Exception:
                        continue
                    ts = parse_ts(event.get("timestamp"))
                    if ts:
                        event_times.append(ts)
                    payload = event.get("payload") or {}
                    if event.get("type") == "session_meta":
                        session_id = str(payload.get("id") or session_id)
                        cwd = str(payload.get("cwd") or cwd)
                        continue
                    if event.get("type") != "response_item":
                        continue
                    if payload.get("type") != "message":
                        continue
                    role = payload.get("role")
                    text = coerce_text(payload.get("content"))
                    if role in {"user", "assistant"}:
                        records.append((str(role), text, ts))
        except OSError:
            continue

        if event_times and not any(start <= ts < end for ts in event_times):
            continue

        for idx, (prompt, outcome, pair_ts) in enumerate(build_turn_pairs(records), start=1):
            if pair_ts and not (start <= pair_ts < end):
                continue
            visibility = session_visibility(prompt, outcome, cwd)
            title = f"Codex 会话：{compact_text(prompt, 72)}"
            summary = f"Codex 会话围绕「{compact_text(prompt, 90)}」推进，结果线索：{compact_text(outcome, 180)}"
            items.append(
                material(
                    material_id=safe_id("codex-session", f"{session_id}-{idx}"),
                    target_date=target_date,
                    source_type="codex_session",
                    source_id=f"{session_id}#turn-{idx}",
                    event_time=(pair_ts.isoformat() if pair_ts else iso_from_path_mtime(path)),
                    actor="codex",
                    title=title,
                    summary=summary,
                    evidence_path=str(path),
                    visibility=visibility,
                    tags=["codex", "codex-session", "blog-materials"],
                    confidence=0.78 if visibility == "public" else 0.45,
                    fingerprint=content_fingerprint("codex_session", prompt, outcome),
                )
            )
    return items


def collect_hermes_session_materials(target_date: str, hermes_sessions_dir: Path = HERMES_SESSIONS_DIR) -> list[dict]:
    start, end = target_window(target_date)
    items: list[dict] = []
    if not hermes_sessions_dir.exists():
        return items
    for path in sorted(hermes_sessions_dir.glob(f"session_{target_date.replace('-', '')}*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        session_start = parse_ts(data.get("session_start"))
        session_end = parse_ts(data.get("last_updated")) or session_start
        if session_start and session_end and (session_end < start or session_start >= end):
            continue
        messages = data.get("messages")
        if not isinstance(messages, list):
            continue
        span_seconds = max(((session_end or start) - (session_start or start)).total_seconds(), 0.0)
        records: list[tuple[str, str, datetime | None]] = []
        for idx, msg in enumerate(messages):
            if not isinstance(msg, dict):
                continue
            role = str(msg.get("role") or "")
            if role not in {"user", "assistant"}:
                continue
            if len(messages) <= 1 or not session_start:
                msg_ts = session_start
            else:
                msg_ts = session_start + timedelta(seconds=span_seconds * (idx / (len(messages) - 1)))
            records.append((role, coerce_text(msg.get("content")), msg_ts))
        platform = str(data.get("platform") or "unknown")
        session_id = str(data.get("session_id") or path.stem)

        for idx, (prompt, outcome, pair_ts) in enumerate(build_turn_pairs(records), start=1):
            if pair_ts and not (start <= pair_ts < end):
                continue
            visibility = session_visibility(prompt, outcome, platform)
            title = f"Hermes {platform} 会话：{compact_text(prompt, 66)}"
            summary = f"Hermes {platform} 会话围绕「{compact_text(prompt, 90)}」推进，结果线索：{compact_text(outcome, 180)}"
            items.append(
                material(
                    material_id=safe_id("hermes-session", f"{session_id}-{idx}"),
                    target_date=target_date,
                    source_type="hermes_session",
                    source_id=f"{session_id}#turn-{idx}",
                    event_time=(pair_ts.isoformat() if pair_ts else iso_from_path_mtime(path)),
                    actor="zhima",
                    title=title,
                    summary=summary,
                    evidence_path=str(path),
                    visibility=visibility,
                    tags=["hermes", "hermes-session", platform, "blog-materials"],
                    confidence=0.76 if visibility == "public" else 0.43,
                    fingerprint=content_fingerprint("hermes_session", prompt, outcome),
                )
            )
    return items


def collect_session_materials(
    target_date: str,
    *,
    codex_sessions_dir: Path = CODEX_SESSIONS_DIR,
    hermes_sessions_dir: Path = HERMES_SESSIONS_DIR,
) -> list[dict]:
    materials: list[dict] = []
    materials.extend(collect_codex_session_materials(target_date, codex_sessions_dir))
    materials.extend(collect_hermes_session_materials(target_date, hermes_sessions_dir))
    return materials


if __name__ == "__main__":
    import sys

    date = sys.argv[1] if len(sys.argv) > 1 else datetime.now(TZ_GMT8).strftime("%Y-%m-%d")
    print(json.dumps(collect_session_materials(date), ensure_ascii=False, indent=2))
