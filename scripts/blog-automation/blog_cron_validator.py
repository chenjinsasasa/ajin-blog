#!/usr/bin/env python3
from __future__ import annotations

"""
博客 cron 终态完整性校验脚本
用于验证博客写作任务是否真正完成闭环

用法：
    python3 blog_cron_validator.py <target_date> <expected_author>

示例：
    python3 blog_cron_validator.py 2026-04-20 xiaou

返回码：
    0 - 所有校验通过
    1 - 文章文件不存在
    2 - git commit 失败（本地无对应提交）
    3 - git push 失败（远程无对应提交）
    4 - 轮值未推进（blog-rotation.json 未更新）
    5 - 文章署名与轮值不一致
    6 - 其他错误
    7 - 封面缺失或封面文件不存在
    8 - L2 summary 缺失或不完整
    9 - 文章 frontmatter/taxonomy 校验失败
"""

import sys
import os
import re
import json
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from blog_repo import automation_state_dir, progress_article_path, resolve_blog_repo

# 配置
try:
    BLOG_REPO = str(resolve_blog_repo())
    BLOG_REPO_ERROR = None
except FileNotFoundError as exc:
    BLOG_REPO = None
    BLOG_REPO_ERROR = str(exc)

STATE_DIR = automation_state_dir(Path(BLOG_REPO)) if BLOG_REPO else None
ROTATION_FILE = str(STATE_DIR / "blog-rotation.json") if STATE_DIR else ""
SUMMARY_DIR = str(STATE_DIR / "blog-materials") if STATE_DIR else ""
RAW_BLOG_DIR = str(STATE_DIR / "raw" / "blog-materials") if STATE_DIR else ""
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

def log(msg):
    print(f"[blog-cron-validator] {msg}", file=sys.stderr)


def ensure_blog_repo_available() -> tuple[bool, str]:
    if BLOG_REPO:
        return True, BLOG_REPO
    return False, BLOG_REPO_ERROR or "博客仓库不可用"

def check_article_file(target_date: str) -> tuple[bool, str]:
    """校验点1：文章文件是否真实生成"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail
    article_path = progress_article_path(target_date)
    if not article_path.exists():
        return False, f"文章文件不存在: {article_path}"

    content = article_path.read_text(encoding="utf-8")

    # 检查 frontmatter 中的 date 字段
    date_match = re.search(r'^date:\s*"?(\d{4}-\d{2}-\d{2})"?', content, re.MULTILINE)
    if not date_match:
        return False, "文章 frontmatter 缺少 date 字段"

    if date_match.group(1) != target_date:
        return False, f"文章 date 字段 ({date_match.group(1)}) 与目标日期 ({target_date}) 不一致"

    return True, f"文章文件存在且日期正确: {article_path}"


def check_post_taxonomy() -> tuple[bool, str]:
    """运行仓库自身的 frontmatter/taxonomy 真相源校验。"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail

    try:
        result = subprocess.run(
            ["npm", "run", "posts:validate"],
            cwd=BLOG_REPO,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except subprocess.TimeoutExpired:
        return False, "npm run posts:validate 执行超时"
    except Exception as exc:
        return False, f"npm run posts:validate 执行异常: {exc}"

    output = "\n".join(
        part for part in (result.stderr.strip(), result.stdout.strip()) if part
    )
    if result.returncode != 0:
        raw_summary = output or "命令未返回输出"
        return False, f"npm run posts:validate 失败 (exit={result.returncode}):\n{raw_summary}"

    return True, "npm run posts:validate 通过"


def find_target_commit(target_date: str) -> tuple[str | None, str]:
    """Find the newest local commit whose message names the target date."""
    result = subprocess.run(
        [
            "git",
            "-C",
            BLOG_REPO,
            "log",
            "--format=%H%x1f%h%x1f%s",
            "--max-count=50",
            "--grep",
            target_date,
            "HEAD",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        return None, f"git log 执行失败: {result.stderr}"

    line = result.stdout.strip().splitlines()[0] if result.stdout.strip() else ""
    if not line:
        return None, "未找到包含目标日期的本地 commit"

    parts = line.split("\x1f", 2)
    if len(parts) != 3:
        return None, f"git log 输出无法解析: {line}"
    full_hash, short_hash, subject = parts
    return full_hash, f"{short_hash} {subject}"


def check_git_commit(target_date: str) -> tuple[bool, str]:
    """校验点2：git commit 是否成功"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail
    try:
        commit_hash, detail = find_target_commit(target_date)
        if not commit_hash:
            return False, detail
        return True, f"git commit 验证通过: {detail}"
    except subprocess.TimeoutExpired:
        return False, "git log 执行超时"
    except Exception as e:
        return False, f"git commit 检查异常: {e}"

def check_git_push(target_date: str) -> tuple[bool, str]:
    """校验点3：git push 是否成功"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail
    try:
        target_commit, commit_detail = find_target_commit(target_date)
        if not target_commit:
            return False, commit_detail

        upstream_result = subprocess.run(
            ["git", "-C", BLOG_REPO, "rev-parse", "@{upstream}"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if upstream_result.returncode != 0:
            return False, f"获取 upstream 失败（可能未设置 upstream）: {upstream_result.stderr}"

        remote_hash = upstream_result.stdout.strip()
        contains_result = subprocess.run(
            ["git", "-C", BLOG_REPO, "merge-base", "--is-ancestor", target_commit, remote_hash],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if contains_result.returncode != 0:
            return False, f"目标日期 commit 尚未进入 upstream: {commit_detail}"

        return True, f"git push 验证通过: {commit_detail}"

    except subprocess.TimeoutExpired:
        return False, "git push 检查执行超时"
    except Exception as e:
        return False, f"git push 检查异常: {e}"

def should_check_rotation(target_date: str) -> bool:
    """Only the active daily cycle should mutate/check the current rotation file."""
    try:
        target = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        return True
    today = datetime.now().date()
    return target >= today - timedelta(days=1)


def check_rotation_updated(target_date: str, expected_author: str) -> tuple[bool, str]:
    """校验点4：轮值是否推进"""
    try:
        if not should_check_rotation(target_date):
            return True, f"历史回填日期 {target_date} 跳过当前轮值推进检查"

        if not os.path.exists(ROTATION_FILE):
            return False, f"轮值文件不存在: {ROTATION_FILE}"

        with open(ROTATION_FILE, 'r', encoding='utf-8') as f:
            rotation = json.load(f)

        current_agent = rotation.get('current_agent', '')

        expected_display = AUTHOR_DISPLAY_NAMES.get(expected_author)
        not_advanced_values = {expected_author}
        if expected_display:
            not_advanced_values.add(expected_display)

        # 检查当前轮值是否已不是本次作者（说明已推进）
        if current_agent in not_advanced_values:
            return False, f"轮值未推进: blog-rotation.json 仍指向 {expected_author}"

        return True, f"轮值已推进: {expected_author} → {current_agent}"

    except json.JSONDecodeError as e:
        return False, f"轮值文件 JSON 解析失败: {e}"
    except Exception as e:
        return False, f"轮值检查异常: {e}"

def check_summary_artifacts(target_date: str, expected_author: str) -> tuple[bool, str]:
    """校验点4.5：L1 material 与 L2 summary 是否已生成且包含基础内容"""
    try:
        l1_jsonl = Path(RAW_BLOG_DIR) / f"{target_date}.jsonl"
        summary_json = Path(SUMMARY_DIR) / f"{target_date}-summary.json"
        summary_md = Path(SUMMARY_DIR) / f"{target_date}-summary.md"
        if not l1_jsonl.exists():
            return False, f"L1 material jsonl missing: {l1_jsonl}"
        if l1_jsonl.stat().st_size <= 0:
            return False, f"L1 material jsonl empty: {l1_jsonl}"
        if not summary_json.exists():
            return False, f"summary json missing: {summary_json}"
        if not summary_md.exists():
            return False, f"summary md missing: {summary_md}"
        with open(summary_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        selected_ids = data.get('selected_material_ids', [])
        if not selected_ids:
            return False, "summary selected_material_ids empty"
        rotation_author = (data.get('rotation_author') or {}).get('author_id')
        if rotation_author and rotation_author != expected_author:
            return False, f"summary rotation_author={rotation_author}, expected={expected_author}"
        return True, f"L1/L2 summary ok: {len(selected_ids)} selected materials"
    except Exception as e:
        return False, f"check summary error: {e}"

def check_author_consistency(target_date: str, expected_author: str) -> tuple[bool, str]:
    """校验点5：文章署名与轮值是否一致"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail
    try:
        article_path = progress_article_path(target_date)
        if not article_path.exists():
            return False, "文章文件不存在，无法检查署名"

        content = article_path.read_text(encoding="utf-8")

        # 检查 frontmatter 中的 author 字段（支持带引号和不带引号）
        author_match = re.search(r'^author:\s*["\']?(\w+)["\']?', content, re.MULTILINE)
        if not author_match:
            return False, "文章 frontmatter 缺少 author 字段"

        actual_author = author_match.group(1)

        if actual_author != expected_author:
            return False, f"文章署名 ({actual_author}) 与期望轮值 ({expected_author}) 不一致"

        return True, f"文章署名验证通过: {actual_author}"

    except Exception as e:
        return False, f"署名检查异常: {e}"

def check_cover_integrity(target_date: str) -> tuple[bool, str]:
    """校验点6：封面文件与 Codex Image 2 来源合同是否完整。"""
    ok, detail = ensure_blog_repo_available()
    if not ok:
        return False, detail
    try:
        article_path = progress_article_path(target_date)
        if not article_path.exists():
            return False, "文章文件不存在，无法检查封面"

        content = article_path.read_text(encoding="utf-8")

        cover_match = re.search(r'^coverImage:\s*["\']?([^"\'\n]+)["\']?', content, re.MULTILINE)
        if not cover_match:
            return False, "文章 frontmatter 缺少 coverImage 字段"

        cover_image = cover_match.group(1).strip()
        if not cover_image:
            return False, "文章 coverImage 为空"

        cover_rel = cover_image.lstrip('/')
        cover_path = Path(BLOG_REPO) / 'public' / cover_rel
        if not cover_path.exists():
            return False, f"封面文件不存在: {cover_path}"

        if not cover_path.is_file():
            return False, f"封面路径不是文件: {cover_path}"

        relative_article = article_path.relative_to(Path(BLOG_REPO))
        result = subprocess.run(
            [
                "npm",
                "run",
                "cover:image2:validate",
                "--",
                "--post",
                str(relative_article),
            ],
            cwd=BLOG_REPO,
            capture_output=True,
            text=True,
            timeout=60,
        )
        output = "\n".join(
            part for part in (result.stderr.strip(), result.stdout.strip()) if part
        )
        if result.returncode != 0:
            raw_summary = output or "命令未返回输出"
            return False, (
                "Codex Image 2 封面校验失败 "
                f"(exit={result.returncode}):\n{raw_summary}"
            )

        return True, f"Codex Image 2 封面验证通过: {cover_image}"

    except subprocess.TimeoutExpired:
        return False, "npm run cover:image2:validate 执行超时"

    except Exception as e:
        return False, f"封面检查异常: {e}"

def main():
    if len(sys.argv) < 3:
        log("用法: python3 blog_cron_validator.py <target_date> <expected_author>")
        log("示例: python3 blog_cron_validator.py 2026-04-20 xiaou")
        sys.exit(6)

    target_date = sys.argv[1]
    expected_author = sys.argv[2]

    log(f"开始校验: 目标日期={target_date}, 期望作者={expected_author}")

    # 执行所有校验
    checks = [
        ("文章文件", check_article_file, target_date),
        ("文章 taxonomy", check_post_taxonomy),
        ("文章署名", check_author_consistency, target_date, expected_author),
        ("封面完整性", check_cover_integrity, target_date),
        ("L2 summary", check_summary_artifacts, target_date, expected_author),
        ("git commit", check_git_commit, target_date),
        ("git push", check_git_push, target_date),
        ("轮值推进", check_rotation_updated, target_date, expected_author),
    ]

    exit_codes = {
        "文章文件": 1,
        "git commit": 2,
        "git push": 3,
        "轮值推进": 4,
        "文章署名": 5,
        "封面完整性": 7,
        "L2 summary": 8,
        "文章 taxonomy": 9,
    }

    all_passed = True
    for check_name, check_func, *args in checks:
        try:
            passed, message = check_func(*args)
            status = "✅" if passed else "❌"
            log(f"{status} {check_name}: {message}")

            if not passed:
                all_passed = False
                sys.exit(exit_codes.get(check_name, 6))

        except Exception as e:
            log(f"❌ {check_name}: 执行异常 - {e}")
            all_passed = False
            sys.exit(6)

    if all_passed:
        log("所有校验通过 ✓")
        sys.exit(0)
    else:
        sys.exit(6)

if __name__ == "__main__":
    main()
