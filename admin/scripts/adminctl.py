#!/usr/bin/env python3
"""Local-only administration. Never dispatches a publishing action."""

import argparse
import getpass
import json
import os
import secrets
import signal
import socket
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from datetime import datetime

from backend.api import create_app, password_hash
from backend.core import TZ, Config, backup, connection, get_meta, migrate


def private_json(path, value):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)


def running(config, name):
    p = config.data / f"{name}.pid"
    if not p.exists():
        return None
    try:
        pid = int(p.read_text())
        args = subprocess.run(
            ["ps", "-p", str(pid), "-o", "command="],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.strip()
        expected = f"-m backend.{'serve' if name == 'api' else 'worker'}"
        cwd = subprocess.run(
            ["lsof", "-a", "-p", str(pid), "-d", "cwd", "-Fn"],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.splitlines()
        return pid if args.endswith(expected) and "n" + str(ROOT) in cwd else None
    except (ValueError, OSError):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=[
            "init",
            "start",
            "stop",
            "status",
            "collect",
            "backup",
            "restore",
            "password",
            "openapi",
        ],
    )
    parser.add_argument("--repo", default=str(ROOT.parent))
    parser.add_argument("--openclaw", default=str(Path.home() / ".openclaw"))
    parser.add_argument("--port", type=int, default=4318)
    parser.add_argument("--file")
    args = parser.parse_args()
    data = Path(
        os.environ.get(
            "AJIN_ADMIN_DATA",
            str(Path.home() / "Library/Application Support/ajin-blog-admin"),
        )
    ).expanduser()
    if args.action == "init":
        data.mkdir(parents=True, exist_ok=True, mode=0o700)
        if (data / "config.json").exists():
            raise SystemExit("Already initialized; use password to change credentials.")
        if not 1024 <= args.port <= 65535:
            raise SystemExit("Invalid port")
        private_json(
            data / "config.json",
            {
                "repo": str(Path(args.repo).resolve()),
                "openclaw": str(Path(args.openclaw).resolve()),
                "port": args.port,
                "enabled_since": datetime.now(TZ).date().isoformat(),
            },
        )
        salt = secrets.token_hex(16)
        password = secrets.token_urlsafe(24)
        private_json(
            data / "credentials.json",
            {"salt": salt, "hash": password_hash(password, salt)},
        )
        fd = os.open(
            data / "initial-password.txt", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
        )
        with os.fdopen(fd, "w") as f:
            f.write(password + "\n")
        migrate(Config.load())
        print(f"Initialized. Password file: {data / 'initial-password.txt'}")
        return
    config = Config.load()
    if args.action == "password":
        password = getpass.getpass("New password (12+ characters): ")
        if len(password) < 12 or password != getpass.getpass("Confirm password: "):
            raise SystemExit("Password too short or mismatch")
        salt = secrets.token_hex(16)
        private_json(
            data / "credentials.json",
            {"salt": salt, "hash": password_hash(password, salt)},
        )
        with connection(config) as c:
            c.execute("DELETE FROM sessions")
        (data / "initial-password.txt").unlink(missing_ok=True)
        print("Password changed; sessions revoked.")
        return
    if args.action == "openapi":
        schema = create_app(config).openapi()
        out = Path(args.file) if args.file else ROOT / "docs/api/openapi.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(schema, ensure_ascii=False, indent=2) + "\n")
        print(out)
        return
    if args.action == "status":
        with connection(config) as c:
            state = get_meta(c, "collector", {})
        print(
            json.dumps(
                {
                    "url": f"http://127.0.0.1:{config.port}",
                    "api_pid": running(config, "api"),
                    "worker_pid": running(config, "worker"),
                    "last_success": state.get("last_success"),
                    "report_count": state.get("report_count"),
                    "errors": state.get("errors", []),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    if args.action == "collect":
        if running(config, "worker"):
            raise SystemExit(
                "Worker already collecting; do not run a second collector."
            )
        from backend.collector import collect

        print(f"Collected {collect(config)} reports")
        return
    if args.action == "backup":
        print(backup(config))
        return
    if args.action == "restore":
        if running(config, "api") or running(config, "worker"):
            raise SystemExit("Stop admin services before restore.")
        if not args.file:
            raise SystemExit("--file is required")
        source = Path(args.file).resolve()
        if not source.is_file() or source == config.db.resolve():
            raise SystemExit("Invalid backup path")
        check = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
        try:
            if (
                check.execute("PRAGMA integrity_check").fetchone()[0] != "ok"
                or check.execute("PRAGMA foreign_key_check").fetchall()
                or check.execute("PRAGMA user_version").fetchone()[0] != 1
            ):
                raise SystemExit("Invalid backup schema/integrity")
            backup(config)
            with connection(config) as dest:
                check.backup(dest)
                dest.execute("DELETE FROM sessions")
                dest.execute("DELETE FROM meta WHERE key='heartbeat'")
        finally:
            check.close()
        print("Restored. Sessions revoked. Start to reconcile current source evidence.")
        return
    if args.action == "stop":
        for name in ("worker", "api"):
            pid = running(config, name)
            if pid:
                os.kill(pid, signal.SIGTERM)
            for _ in range(50):
                if not running(config, name):
                    break
                time.sleep(0.1)
            if running(config, name):
                raise SystemExit(f"{name} still running; not force killed")
            (data / f"{name}.pid").unlink(missing_ok=True)
        print("Stopped admin services. Production scheduler untouched.")
        return
    if args.action == "start":
        if running(config, "api") or running(config, "worker"):
            raise SystemExit("A service is already running; inspect status first.")
        if not (ROOT / "frontend/dist/index.html").exists():
            raise SystemExit("Build frontend first.")
        with socket.socket() as s:
            s.bind(("127.0.0.1", config.port))
        migrate(config)
        logs = data / "logs"
        logs.mkdir(exist_ok=True, mode=0o700)
        env = {**os.environ, "AJIN_ADMIN_DATA": str(data)}
        processes = []
        try:
            for name, module in [("api", "serve"), ("worker", "worker")]:
                fd = os.open(
                    logs / f"{name}.log", os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600
                )
                with os.fdopen(fd, "a") as log:
                    p = subprocess.Popen(
                        [str(ROOT / ".venv/bin/python"), "-m", f"backend.{module}"],
                        cwd=ROOT,
                        env=env,
                        stdout=log,
                        stderr=log,
                        start_new_session=True,
                    )
                processes.append(p)
                (data / f"{name}.pid").write_text(str(p.pid))
            time.sleep(1)
            if any(p.poll() is not None for p in processes):
                raise RuntimeError("Service failed. Check local log files.")
        except Exception:
            for p in processes:
                if p.poll() is None:
                    p.terminate()
            raise
        print(f"Started http://127.0.0.1:{config.port}")


if __name__ == "__main__":
    main()
