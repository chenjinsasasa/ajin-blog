#!/usr/bin/env python3
"""
Bounded repair loop for ajin-blog publish closeout.

The loop treats blog_cron_validator.py as the business terminal gate. It only
repairs low-risk failure classes, then re-runs the validator and online probes.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
WORKSPACE = PROJECT_ROOT
sys.path.insert(0, str(SCRIPT_DIR))

from blog_repo import automation_state_dir, resolve_blog_repo

DEFAULT_VALIDATOR = SCRIPT_DIR / "blog_cron_validator.py"
DEFAULT_AUTOMATION_STATE_DIR = automation_state_dir(PROJECT_ROOT)
DEFAULT_ROTATION_FILE = DEFAULT_AUTOMATION_STATE_DIR / "blog-rotation.json"
DEFAULT_STATE_FILE = DEFAULT_AUTOMATION_STATE_DIR / "blog-publish-repair-loop-latest.json"
DEFAULT_API_URL = "https://blog.chenjin.ai/api/posts?limit=30"
DEFAULT_PAGE_BASE_URL = "https://blog.chenjin.ai/blog"

AUTHOR_DISPLAY_NAMES = {
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
DISPLAY_AUTHOR_IDS = {display: author_id for author_id, display in AUTHOR_DISPLAY_NAMES.items()}


@dataclass
class CommandResult:
    args: list[str]
    returncode: int
    stdout: str = ""
    stderr: str = ""


@dataclass
class Evidence:
    step: str
    status: str
    detail: str
    data: dict[str, Any] = field(default_factory=dict)


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def default_target_date() -> str:
    tz8 = timezone(timedelta(hours=8))
    return (datetime.now(tz8).date() - timedelta(days=1)).isoformat()


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2, sort_keys=True)
            fh.write("\n")
        os.replace(tmp_name, path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


def run_command(
    args: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int = 30,
) -> CommandResult:
    result = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return CommandResult(args=args, returncode=result.returncode, stdout=result.stdout, stderr=result.stderr)


def load_blog_repo(path_arg: str | None) -> Path:
    if path_arg:
        return Path(os.path.expanduser(path_arg)).resolve()
    return resolve_blog_repo()


def article_path(blog_repo: Path, target_date: str) -> Path:
    return blog_repo / "content" / "progress" / f"{target_date}-progress.mdx"


def read_frontmatter(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}
    data: dict[str, str] = {}
    for line in match.group(1).splitlines():
        key_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not key_match:
            continue
        key, value = key_match.groups()
        value = value.strip().strip('"').strip("'")
        if value:
            data[key] = value
    return data


def rotation_author_to_id(value: str) -> str:
    return DISPLAY_AUTHOR_IDS.get(value, value)


def resolve_expected_author(blog_repo: Path, target_date: str, provided: str | None, rotation_file: Path) -> str:
    if provided:
        return rotation_author_to_id(provided.strip())

    frontmatter = read_frontmatter(article_path(blog_repo, target_date))
    if frontmatter.get("author"):
        return rotation_author_to_id(frontmatter["author"])

    try:
        rotation = json.loads(rotation_file.read_text(encoding="utf-8"))
    except Exception:
        return ""
    return rotation_author_to_id(str(rotation.get("current_agent") or "").strip())


def run_validator(args: argparse.Namespace, blog_repo: Path, expected_author: str) -> CommandResult:
    env = os.environ.copy()
    env["AJIN_BLOG_REPO"] = str(blog_repo)
    return run_command(
        [sys.executable, str(args.validator), args.target_date, expected_author],
        cwd=blog_repo,
        env=env,
        timeout=args.validator_timeout_seconds,
    )


def find_target_commit(blog_repo: Path, target_date: str) -> tuple[str | None, str]:
    result = run_command(
        [
            "git",
            "-C",
            str(blog_repo),
            "log",
            "--format=%H%x1f%h%x1f%s",
            "--max-count=50",
            "--grep",
            target_date,
            "HEAD",
        ],
        timeout=10,
    )
    if result.returncode != 0:
        return None, result.stderr.strip() or "git log failed"
    line = result.stdout.strip().splitlines()[0] if result.stdout.strip() else ""
    if not line:
        return None, "target commit not found"
    parts = line.split("\x1f", 2)
    if len(parts) != 3:
        return None, f"unparseable git log line: {line}"
    return parts[0], f"{parts[1]} {parts[2]}"


def git_clean_status(blog_repo: Path) -> tuple[bool, str]:
    result = run_command(["git", "-C", str(blog_repo), "status", "--porcelain=v1"], timeout=10)
    if result.returncode != 0:
        return False, result.stderr.strip() or "git status failed"
    if result.stdout.strip():
        return False, result.stdout.strip()
    return True, "clean"


def ahead_behind(blog_repo: Path) -> tuple[int | None, int | None, str]:
    upstream = run_command(["git", "-C", str(blog_repo), "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], timeout=10)
    if upstream.returncode != 0:
        return None, None, upstream.stderr.strip() or "upstream missing"
    result = run_command(["git", "-C", str(blog_repo), "rev-list", "--left-right", "--count", "@{upstream}...HEAD"], timeout=10)
    if result.returncode != 0:
        return None, None, result.stderr.strip() or "rev-list failed"
    parts = result.stdout.strip().split()
    if len(parts) != 2:
        return None, None, f"unparseable ahead/behind: {result.stdout.strip()}"
    behind, ahead = int(parts[0]), int(parts[1])
    return ahead, behind, f"upstream={upstream.stdout.strip()} ahead={ahead} behind={behind}"


def target_commit_is_on_head(blog_repo: Path, target_commit: str) -> bool:
    result = run_command(["git", "-C", str(blog_repo), "merge-base", "--is-ancestor", target_commit, "HEAD"], timeout=10)
    return result.returncode == 0


def looks_like_ssh22_failure(text: str) -> bool:
    lowered = text.lower()
    return (
        "port 22" in lowered
        or "connection timed out" in lowered
        or "connection closed" in lowered
        or "operation timed out" in lowered
    ) and "github" in lowered


def repair_git_push(args: argparse.Namespace, blog_repo: Path) -> Evidence:
    clean, clean_detail = git_clean_status(blog_repo)
    if not clean:
        return Evidence("repair.git_push", "blocked", "worktree_not_clean", {"status": clean_detail})

    ahead, behind, ahead_detail = ahead_behind(blog_repo)
    if ahead is None or behind is None:
        return Evidence("repair.git_push", "blocked", "upstream_unavailable", {"detail": ahead_detail})
    if behind > 0:
        return Evidence("repair.git_push", "blocked", "remote_diverged_or_non_fast_forward", {"detail": ahead_detail})
    if ahead < 1:
        return Evidence("repair.git_push", "blocked", "not_ahead_of_upstream", {"detail": ahead_detail})

    target_commit, commit_detail = find_target_commit(blog_repo, args.target_date)
    if not target_commit:
        return Evidence("repair.git_push", "blocked", "target_commit_missing", {"detail": commit_detail})
    if not target_commit_is_on_head(blog_repo, target_commit):
        return Evidence("repair.git_push", "blocked", "target_commit_not_on_head", {"commit": commit_detail})

    if args.dry_run:
        return Evidence("repair.git_push", "dry_run", "would_run_git_push", {"detail": ahead_detail, "commit": commit_detail})

    first = run_command(["git", "-C", str(blog_repo), "push"], timeout=args.push_timeout_seconds)
    attempts = [
        {
            "mode": "default",
            "returncode": first.returncode,
            "stderr": first.stderr.strip(),
            "stdout": first.stdout.strip(),
        }
    ]
    if first.returncode == 0:
        return Evidence("repair.git_push", "repaired", "git_push_succeeded", {"attempts": attempts, "commit": commit_detail})

    combined = f"{first.stdout}\n{first.stderr}"
    if looks_like_ssh22_failure(combined):
        env = os.environ.copy()
        env["GIT_SSH_COMMAND"] = "ssh -o Hostname=ssh.github.com -o Port=443"
        retry = run_command(["git", "-C", str(blog_repo), "push"], env=env, timeout=args.push_timeout_seconds)
        attempts.append(
            {
                "mode": "github_ssh_443",
                "returncode": retry.returncode,
                "stderr": retry.stderr.strip(),
                "stdout": retry.stdout.strip(),
            }
        )
        if retry.returncode == 0:
            return Evidence(
                "repair.git_push",
                "repaired",
                "git_push_succeeded_via_ssh_443",
                {"attempts": attempts, "commit": commit_detail},
            )

    return Evidence("repair.git_push", "blocked", "git_push_failed", {"attempts": attempts, "commit": commit_detail})


def article_title(blog_repo: Path, target_date: str) -> str:
    return read_frontmatter(article_path(blog_repo, target_date)).get("title", "")


def repair_rotation(args: argparse.Namespace, blog_repo: Path, expected_author: str) -> Evidence:
    rotation_path = Path(args.rotation_file).expanduser()
    try:
        rotation = json.loads(rotation_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return Evidence("repair.rotation", "blocked", "rotation_read_failed", {"error": str(exc)})

    order = rotation.get("order")
    if not isinstance(order, list) or not order:
        return Evidence("repair.rotation", "blocked", "rotation_order_missing")

    expected_display = AUTHOR_DISPLAY_NAMES.get(expected_author, expected_author)
    current_agent = str(rotation.get("current_agent") or "").strip()
    current_id = rotation_author_to_id(current_agent)
    if current_id != expected_author:
        return Evidence(
            "repair.rotation",
            "blocked",
            "rotation_not_pointing_to_expected_author",
            {"current_agent": current_agent, "expected_author": expected_author},
        )

    if expected_display not in order:
        return Evidence("repair.rotation", "blocked", "expected_author_not_in_rotation_order", {"expected_display": expected_display})

    current_index = order.index(expected_display)
    next_index = (current_index + 1) % len(order)
    next_agent = str(order[next_index])
    title = article_title(blog_repo, args.target_date)
    if not title:
        return Evidence("repair.rotation", "blocked", "article_title_missing")

    if args.dry_run:
        return Evidence(
            "repair.rotation",
            "dry_run",
            "would_advance_rotation",
            {"from": expected_display, "to": next_agent, "last_updated": args.target_date, "last_task": title},
        )

    rotation["current_index"] = next_index
    rotation["current_agent"] = next_agent
    rotation["last_updated"] = args.target_date
    rotation["last_task"] = title
    write_json_atomic(rotation_path, rotation)
    return Evidence(
        "repair.rotation",
        "repaired",
        "rotation_advanced",
        {"from": expected_display, "to": next_agent, "last_updated": args.target_date, "last_task": title},
    )


def slug_for_article(blog_repo: Path, target_date: str) -> str:
    frontmatter = read_frontmatter(article_path(blog_repo, target_date))
    slug = frontmatter.get("slug", "").strip().strip("/")
    return slug or f"{target_date}-progress"


def json_contains_post(value: Any, target_date: str, slug: str) -> bool:
    if isinstance(value, dict):
        text_fields = [
            str(value.get(key) or "")
            for key in ("date", "publishedAt", "createdAt", "slug", "url", "href", "path", "id")
        ]
        if any(field.startswith(target_date) or field.endswith(f"/{slug}") or field == slug for field in text_fields):
            return True
        return any(json_contains_post(child, target_date, slug) for child in value.values())
    if isinstance(value, list):
        return any(json_contains_post(item, target_date, slug) for item in value)
    return False


def fetch_url_with_urllib(url: str, timeout_seconds: float) -> tuple[int, str]:
    request = Request(url, headers={"User-Agent": "Codex-blog-publish-repair-loop/1.0"})
    with urlopen(request, timeout=timeout_seconds) as response:
        body = response.read(1_000_000).decode("utf-8", errors="replace")
        return int(getattr(response, "status", 200)), body


def fetch_url_with_curl(url: str, timeout_seconds: float) -> tuple[int, str]:
    result = run_command(
        [
            "curl",
            "-L",
            "--silent",
            "--show-error",
            "--max-time",
            str(max(1, int(timeout_seconds))),
            "--write-out",
            "\n%{http_code}",
            url,
        ],
        timeout=max(2, int(timeout_seconds) + 2),
    )
    output = result.stdout
    if "\n" not in output:
        raise RuntimeError(result.stderr.strip() or "curl output missing status code")
    body, status_text = output.rsplit("\n", 1)
    try:
        status = int(status_text.strip())
    except ValueError as exc:
        raise RuntimeError(f"curl status parse failed: {status_text!r}") from exc
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"curl failed with status={status}")
    return status, body


def fetch_url(url: str, timeout_seconds: float) -> tuple[int, str]:
    try:
        return fetch_url_with_urllib(url, timeout_seconds)
    except Exception:
        return fetch_url_with_curl(url, timeout_seconds)


def probe_online_once(args: argparse.Namespace, blog_repo: Path) -> Evidence:
    slug = slug_for_article(blog_repo, args.target_date)
    api_ok = False
    page_ok = False
    api_detail = ""
    page_detail = ""

    try:
        status, body = fetch_url(args.api_url, args.http_timeout_seconds)
        parsed = json.loads(body)
        api_ok = 200 <= status < 300 and json_contains_post(parsed, args.target_date, slug)
        api_detail = f"status={status} contains_target={api_ok}"
    except Exception as exc:
        api_detail = f"{type(exc).__name__}: {exc}"

    page_url = f"{args.page_base_url.rstrip('/')}/{slug}"
    try:
        status, _body = fetch_url(page_url, args.http_timeout_seconds)
        page_ok = 200 <= status < 300
        page_detail = f"status={status}"
    except (URLError, TimeoutError, Exception) as exc:
        page_detail = f"{type(exc).__name__}: {exc}"

    status = "ok" if api_ok and page_ok else "wait"
    detail = "online_probe_ok" if status == "ok" else "online_probe_not_ready"
    return Evidence(
        "probe.online",
        status,
        detail,
        {
            "api_url": args.api_url,
            "api": api_detail,
            "page_url": page_url,
            "page": page_detail,
            "slug": slug,
        },
    )


def probe_online(args: argparse.Namespace, blog_repo: Path) -> Evidence:
    last = Evidence("probe.online", "wait", "not_run")
    attempts = max(1, args.online_retries)
    for index in range(attempts):
        last = probe_online_once(args, blog_repo)
        last.data["attempt"] = index + 1
        last.data["attempts"] = attempts
        if last.status == "ok":
            return last
        if index < attempts - 1:
            time.sleep(max(0.0, args.online_delay_seconds))
    last.status = "blocked"
    return last


def validator_evidence(result: CommandResult, expected_author: str) -> Evidence:
    return Evidence(
        "validator",
        "ok" if result.returncode == 0 else "failed",
        f"exit={result.returncode}",
        {
            "expected_author": expected_author,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        },
    )


def build_result(
    *,
    args: argparse.Namespace,
    blog_repo: Path,
    expected_author: str,
    status: str,
    reason: str,
    evidence: list[Evidence],
) -> dict[str, Any]:
    return {
        "schema_version": "blog_publish_repair_loop.v1",
        "generated_at": now_iso(),
        "status": status,
        "reason": reason,
        "target_date": args.target_date,
        "expected_author": expected_author,
        "blog_repo": str(blog_repo),
        "dry_run": bool(args.dry_run),
        "evidence": [
            {"step": item.step, "status": item.status, "detail": item.detail, "data": item.data}
            for item in evidence
        ],
    }


def execute(args: argparse.Namespace) -> dict[str, Any]:
    blog_repo = load_blog_repo(args.blog_repo)
    expected_author = resolve_expected_author(blog_repo, args.target_date, args.expected_author, Path(args.rotation_file))
    evidence: list[Evidence] = []

    if not expected_author:
        evidence.append(Evidence("input", "blocked", "expected_author_unresolved"))
        return build_result(args=args, blog_repo=blog_repo, expected_author="", status="notify", reason="expected_author_unresolved", evidence=evidence)

    for _attempt in range(max(1, args.max_repair_steps + 1)):
        validator = run_validator(args, blog_repo, expected_author)
        evidence.append(validator_evidence(validator, expected_author))

        if validator.returncode == 0:
            online = probe_online(args, blog_repo)
            evidence.append(online)
            if online.status == "ok":
                return build_result(args=args, blog_repo=blog_repo, expected_author=expected_author, status="ok", reason="terminal_gate_passed", evidence=evidence)
            return build_result(args=args, blog_repo=blog_repo, expected_author=expected_author, status="notify", reason=online.detail, evidence=evidence)

        if validator.returncode == 3:
            repair = repair_git_push(args, blog_repo)
            evidence.append(repair)
        elif validator.returncode == 4:
            repair = repair_rotation(args, blog_repo, expected_author)
            evidence.append(repair)
        else:
            return build_result(
                args=args,
                blog_repo=blog_repo,
                expected_author=expected_author,
                status="notify",
                reason=f"validator_failed_exit_{validator.returncode}",
                evidence=evidence,
            )

        if repair.status not in {"repaired", "dry_run"}:
            return build_result(args=args, blog_repo=blog_repo, expected_author=expected_author, status="notify", reason=repair.detail, evidence=evidence)
        if repair.status == "dry_run":
            return build_result(args=args, blog_repo=blog_repo, expected_author=expected_author, status="dry_run", reason=repair.detail, evidence=evidence)

    return build_result(args=args, blog_repo=blog_repo, expected_author=expected_author, status="notify", reason="repair_step_limit_exceeded", evidence=evidence)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run bounded ajin-blog publish repair loop")
    parser.add_argument("target_date", nargs="?", default=default_target_date(), help="Target date in YYYY-MM-DD; defaults to yesterday in Asia/Shanghai")
    parser.add_argument("expected_author", nargs="?", help="Expected article author id or display name")
    parser.add_argument("--blog-repo", help="Override ajin-blog repo path")
    parser.add_argument("--validator", default=str(DEFAULT_VALIDATOR), help="Path to blog_cron_validator.py")
    parser.add_argument("--rotation-file", default=str(DEFAULT_ROTATION_FILE), help="Path to blog-rotation.json")
    parser.add_argument("--state-file", default=str(DEFAULT_STATE_FILE), help="Evidence JSON output path")
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--page-base-url", default=DEFAULT_PAGE_BASE_URL)
    parser.add_argument("--online-retries", type=int, default=4)
    parser.add_argument("--online-delay-seconds", type=float, default=20.0)
    parser.add_argument("--http-timeout-seconds", type=float, default=12.0)
    parser.add_argument("--validator-timeout-seconds", type=int, default=60)
    parser.add_argument("--push-timeout-seconds", type=int, default=90)
    parser.add_argument("--max-repair-steps", type=int, default=2)
    parser.add_argument("--dry-run", action="store_true", help="Evaluate the repair path without mutating git or rotation state")
    parser.add_argument("--no-write-state", action="store_true", help="Do not persist the evidence JSON file; intended for read-only probes")
    parser.add_argument("--json", action="store_true", help="Print full JSON result")
    return parser.parse_args(argv)


def run(args: argparse.Namespace) -> int:
    result = execute(args)
    if not args.no_write_state:
        write_json_atomic(Path(args.state_file).expanduser(), result)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(f"{result['status']} {result['target_date']} {result['reason']}")
    if result["status"] == "ok" and result.get("reason") == "terminal_gate_passed":
        return 0
    if result["status"] == "dry_run":
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(run(parse_args()))
