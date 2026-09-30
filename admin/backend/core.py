from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import subprocess
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Shanghai")
ADMIN_ROOT = Path(__file__).resolve().parents[1]
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def now():
    return datetime.now(timezone.utc).isoformat()


def valid_date(value):
    if not isinstance(value, str) or not DATE.fullmatch(value):
        raise ValueError("invalid_date")
    datetime.strptime(value, "%Y-%m-%d")
    return value


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def safe_read(path: Path, root: Path, limit=4_000_000):
    path = Path(path)
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError("path_outside_root")
    # Refuse symlinks in all components beneath the trusted root.
    for component in (path, *path.parents):
        if component == root:
            break
        if component.is_symlink():
            raise ValueError("symlink_rejected")
    with path.open("rb") as f:
        before = os.fstat(f.fileno())
        raw = f.read(limit + 1)
        after = os.fstat(f.fileno())
    current = path.stat()
    if (
        len(raw) > limit
        or (before.st_ino, before.st_mtime_ns, before.st_size)
        != (after.st_ino, after.st_mtime_ns, after.st_size)
        or (after.st_ino, after.st_mtime_ns) != (current.st_ino, current.st_mtime_ns)
    ):
        raise ValueError("source_changed_or_too_large")
    return raw


def redact(value):
    text = str(value)
    text = re.sub(r'(?i)(bearer\s+)[^\s"\']+', r"\1[REDACTED]", text)
    text = re.sub(
        r"(?i)((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+",
        r"\1[REDACTED]",
        text,
    )
    text = re.sub(r"\bsk-[A-Za-z0-9_-]{10,}", "[REDACTED]", text)
    return text[:2000]


@dataclass
class Config:
    repo: Path
    openclaw: Path
    data: Path
    port: int = 4318
    enabled_since: str = ""

    @property
    def db(self):
        return self.data / "admin.sqlite3"

    @property
    def workspace(self):
        return self.openclaw / "workspace"

    @property
    def common(self):
        result = subprocess.run(
            ["git", "-C", str(self.repo), "rev-parse", "--git-common-dir"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        return (self.repo / result.stdout.strip()).resolve()

    @classmethod
    def load(cls):
        data = Path(
            os.environ.get(
                "AJIN_ADMIN_DATA",
                str(Path.home() / "Library/Application Support/ajin-blog-admin"),
            )
        ).expanduser()
        settings = json.loads((data / "config.json").read_text())
        return cls(
            Path(settings["repo"]),
            Path(settings["openclaw"]),
            data,
            settings.get("port", 4318),
            settings["enabled_since"],
        )


@contextmanager
def connection(config):
    c = sqlite3.connect(config.db, timeout=5)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("PRAGMA busy_timeout=5000")
    c.execute("PRAGMA synchronous=FULL")
    try:
        with c:
            yield c
    finally:
        c.close()


def migrate(config):
    config.data.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(config.data, 0o700)
    with connection(config) as c:
        v = c.execute("PRAGMA user_version").fetchone()[0]
        if v > 1:
            raise RuntimeError("database_version_newer_than_code")
        c.execute("PRAGMA journal_mode=WAL")
        if v == 0:
            c.executescript((ADMIN_ROOT / "migrations/001.sql").read_text())
    os.chmod(config.db, 0o600)


def set_meta(c, key, value):
    c.execute(
        "INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, json.dumps(value, ensure_ascii=False)),
    )


def get_meta(c, key, default=None):
    row = c.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return json.loads(row[0]) if row else default


def backup(config):
    out = config.data / "backups"
    out.mkdir(exist_ok=True, mode=0o700)
    path = out / (datetime.now().strftime("%Y%m%d-%H%M%S-%f") + ".sqlite3")
    with connection(config) as source:
        dest = sqlite3.connect(path)
        try:
            source.backup(dest)
            if (
                dest.execute("PRAGMA integrity_check").fetchone()[0] != "ok"
                or dest.execute("PRAGMA foreign_key_check").fetchall()
            ):
                raise RuntimeError("backup_invalid")
        finally:
            dest.close()
    os.chmod(path, 0o600)
    for old in sorted(out.glob("*.sqlite3"))[:-14]:
        old.unlink()
    return path
