#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
WORKSPACE = PROJECT_ROOT
BLOG_REPO_ENV = "AJIN_BLOG_REPO"
AUTOMATION_STATE_DIR_ENV = "AJIN_BLOG_AUTOMATION_STATE_DIR"
MATERIAL_ROOTS_ENV = "AJIN_BLOG_MATERIAL_ROOTS"
BLOG_REPO_CANDIDATES = [
    PROJECT_ROOT,
    Path("/Volumes/Sata/ChenjinProjects/active/ajin-blog"),
    Path(os.path.expanduser("~/Documents/开发项目/ajin-blog")),
    Path(os.path.expanduser("~/Documents/ajin-blog")),
]


def is_blog_repo(path: Path) -> bool:
    return (
        path.exists()
        and path.is_dir()
        and (path / ".git").exists()
        and (path / "content" / "progress").is_dir()
        and (path / "public" / "covers").is_dir()
    )


def is_responsive_blog_repo(path: Path, timeout_sec: float = 2.0) -> bool:
    if not is_blog_repo(path):
        return False

    probe_code = """
import sys
from pathlib import Path
repo = Path(sys.argv[1])
(repo / ".git" / "HEAD").read_text(encoding="utf-8")
"""
    try:
        subprocess.run(
            [sys.executable, "-c", probe_code, str(path)],
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return True


def resolve_blog_repo(*, require_responsive: bool = True) -> Path:
    env_value = os.getenv(BLOG_REPO_ENV, "").strip()
    if env_value:
        env_path = Path(os.path.expanduser(env_value)).resolve()
        if is_blog_repo(env_path) and (
            not require_responsive or is_responsive_blog_repo(env_path)
        ):
            return env_path
        responsiveness_hint = ""
        if is_blog_repo(env_path) and require_responsive:
            responsiveness_hint = " but it is not responsive"
        raise FileNotFoundError(
            f"{BLOG_REPO_ENV} points to an invalid ajin-blog repo{responsiveness_hint}: {env_path}"
        )

    unresponsive: list[Path] = []
    unresponsive_seen: set[str] = set()
    for candidate in BLOG_REPO_CANDIDATES:
        expanded = candidate.expanduser().resolve()
        if not is_blog_repo(expanded):
            continue
        if require_responsive and not is_responsive_blog_repo(expanded):
            key = str(expanded)
            if key not in unresponsive_seen:
                unresponsive_seen.add(key)
                unresponsive.append(expanded)
            continue
        if is_blog_repo(expanded):
            return expanded

    checked = ", ".join(str(path.expanduser()) for path in BLOG_REPO_CANDIDATES)
    extra = ""
    if unresponsive:
        extra = " Unresponsive candidates: " + ", ".join(str(path) for path in unresponsive) + "."
    raise FileNotFoundError(
        "Unable to resolve ajin-blog repo. Checked: "
        f"{checked}.{extra} Set {BLOG_REPO_ENV} to the real repo path if needed."
    )


def progress_article_path(target_date: str, repo: Path | None = None) -> Path:
    root = repo or resolve_blog_repo()
    return root / "content" / "progress" / f"{target_date}-progress.mdx"


def automation_state_dir(repo: Path | None = None) -> Path:
    override = os.getenv(AUTOMATION_STATE_DIR_ENV, "").strip()
    if override:
        return Path(os.path.expanduser(override)).resolve()
    root = repo or resolve_blog_repo(require_responsive=False)
    return root / ".local" / "blog-automation"


def default_material_search_roots(workspace: Path | None = None) -> list[Path]:
    configured_roots = [
        Path(os.path.expanduser(value))
        for value in os.getenv(MATERIAL_ROOTS_ENV, "").split(os.pathsep)
        if value.strip()
    ]
    roots = configured_roots + [
        Path(os.path.expanduser("~/Documents/开发项目")),
        Path(os.path.expanduser("~/Documents/Codex")),
        Path("/Volumes/Sata/Work/开发项目"),
        Path("/Volumes/Sata/ChenjinProjects/active"),
        workspace or WORKSPACE,
    ]
    try:
        repo = resolve_blog_repo()
    except FileNotFoundError:
        repo = None
    if repo is not None:
        roots.extend([repo, repo.parent])
    else:
        roots.extend(
            [
                Path(os.path.expanduser("~/Documents/开发项目/ajin-blog")),
                Path("/Volumes/Sata/ChenjinProjects/active"),
            ]
        )

    deduped: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        expanded = root.expanduser().resolve()
        key = str(expanded)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(expanded)
    return deduped


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve the real ajin-blog repo path")
    parser.add_argument("--target-date", help="Print the progress article path for this date")
    parser.add_argument(
        "--allow-unresponsive",
        action="store_true",
        help="Resolve a matching repo even if responsiveness checks fail",
    )
    args = parser.parse_args()

    repo = resolve_blog_repo(require_responsive=not args.allow_unresponsive)
    if args.target_date:
        print(progress_article_path(args.target_date, repo=repo))
    else:
        print(repo)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
