import json
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.api import create_app, password_hash
from backend.collector import JOB_ID, collect
from backend.core import (
    TZ,
    Config,
    backup,
    connection,
    digest,
    get_meta,
    migrate,
    safe_read,
)

DATE = "2026-09-20"
RID = "a" * 32


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value))


@pytest.fixture
def config(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    oc = tmp_path / "oc"
    today = datetime.now(TZ).date().isoformat()
    cfg = Config(repo, oc, tmp_path / "data", 4318, today)
    migrate(cfg)
    write(
        oc / "cron/jobs.json",
        {
            "jobs": [
                {
                    "id": JOB_ID,
                    "enabled": True,
                    "schedule": {
                        "kind": "cron",
                        "expr": "30 23 * * *",
                        "tz": "Asia/Shanghai",
                    },
                }
            ]
        },
    )
    write(
        repo / ".git/blog-publish-guard.json",
        {
            "schema_version": "blog_publish_pending.v1",
            "pending": None,
            "completed_dates": {},
        },
    )
    write(
        cfg.data / "credentials.json",
        {"salt": "00" * 16, "hash": password_hash("fixture-password", "00" * 16)},
    )
    return cfg


def state(config, events):
    write(
        config.repo / f".git/blog-program-workflow/{DATE}/{RID}/state.json",
        {
            "schema": "blog-program-workflow.v1",
            "target_date": DATE,
            "guard_run_id": RID,
            "events": events,
        },
    )


def event(stage, status, at="2026-09-20T15:30:00+00:00", **kw):
    return dict(stage=stage, status=status, at=at, **kw)


def get_report(config, date=DATE):
    with connection(config) as c:
        return json.loads(
            c.execute("SELECT payload FROM reports WHERE date=?", (date,)).fetchone()[0]
        )


def client_login(config):
    c = TestClient(create_app(config), base_url="http://127.0.0.1:4318")
    c.headers["Origin"] = "http://127.0.0.1:4318"
    r = c.post("/api/auth/login", json={"password": "fixture-password"})
    assert r.status_code == 200, r.text
    c.headers["X-CSRF-Token"] = r.json()["data"]["csrf"]
    return c


def test_independent_calendar_and_idempotent_import(config):
    state(
        config,
        [
            event("draft", "started"),
            event("workflow", "needs_attention", reason="writer_error"),
        ],
    )
    collect(config)
    collect(config)
    assert get_report(config)["status"] == "blocked"
    assert get_report(config, config.enabled_since)["status"] == "not_started"
    with connection(config) as c:
        assert c.execute("SELECT count(*) FROM events").fetchone()[0] == 2


def test_event_change_is_conflict_not_overwrite(config):
    state(config, [event("draft", "started")])
    collect(config)
    state(config, [event("draft", "completed")])
    collect(config)
    assert "冲突" in get_report(config)["reason"]
    with connection(config) as c:
        assert (
            json.loads(c.execute("SELECT payload FROM events").fetchone()[0])["status"]
            == "started"
        )


def test_completed_workflow_without_receipt_is_not_published(config):
    state(config, [event("publish", "completed"), event("workflow", "completed")])
    collect(config)
    assert get_report(config)["status"] == "unknown"


def test_other_date_pending_does_not_claim_today_running(config):
    write(
        config.repo / ".git/blog-publish-guard.json",
        {
            "schema_version": "blog_publish_pending.v1",
            "pending": {
                "target_date": DATE,
                "guard_run_id": RID,
                "session_id": RID,
                "reserved_at": "2026-09-20T15:30:00+00:00",
            },
            "completed_dates": {},
        },
    )
    collect(config)
    assert get_report(config, config.enabled_since)["status"] == "not_started"
    assert get_report(config)["status"] == "unknown"


def test_verified_skip_and_tampered_receipt(config):
    at = "2026-09-20T15:30:00+00:00"
    receipt = (
        config.workspace / f"state/ajin-blog/blog-publish-terminal/{DATE}/{RID}.json"
    )
    v = {
        "schema_version": "blog_publish_terminal_guard.v2",
        "guard_run_id": RID,
        "target_date": DATE,
        "executor": {"run_id": RID, "session_id": RID},
        "started_at": at,
        "completed_at": at,
        "status": "skipped_no_public_material",
        "reason": "no_public_material",
        "published": False,
        "terminal_gate_passed": False,
        "side_effects_allowed": False,
    }
    write(receipt, v)
    write(
        config.repo / ".git/blog-publish-guard.json",
        {
            "schema_version": "blog_publish_pending.v1",
            "pending": None,
            "completed_dates": {
                DATE: {
                    "target_date": DATE,
                    "guard_run_id": RID,
                    "session_id": RID,
                    "reserved_at": at,
                    "completed_at": at,
                    "status": v["status"],
                    "terminal_receipt_path": str(receipt),
                    "terminal_receipt_sha256": digest(receipt.read_bytes()),
                }
            },
        },
    )
    collect(config)
    assert get_report(config)["status"] == "skipped", get_report(config)["evidence"]
    v["published"] = True
    write(receipt, v)
    collect(config)
    assert get_report(config)["status"] == "unknown"


def test_auth_origin_csrf_and_private_artifacts(config):
    collect(config)
    client = TestClient(create_app(config), base_url="http://127.0.0.1:4318")
    assert client.get("/api/reports").status_code == 401
    assert client.get("/api/reports/2026-09-20/cover").status_code == 401
    assert (
        client.post(
            "/api/auth/login", json={"password": "fixture-password"}
        ).status_code
        == 403
    )
    client = client_login(config)
    assert (
        "HttpOnly"
        in client.cookies.jar._cookies["127.0.0.1"]["/"]["ajin_admin_session"]._rest
    )
    assert client.get("/api/auth/session").status_code == 200
    assert client.get("/api/reports").status_code == 200
    assert (
        client.get("/api/reports", headers={"Host": "evil.example"}).status_code == 403
    )
    assert (
        client.post(
            "/api/reports/" + config.enabled_since + "/notes",
            json={"body": "test"},
            headers={"X-CSRF-Token": "wrong"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/reports/" + config.enabled_since + "/notes", json={"body": "checked"}
        ).status_code
        == 200
    )
    assert client.post("/api/auth/logout", json={}).status_code == 200
    assert client.get("/api/reports").status_code == 401


def test_note_persists_without_business_mutation(config):
    state(config, [event("workflow", "needs_attention", reason="failed")])
    collect(config)
    c = client_login(config)
    assert (
        c.post(
            "/api/reports/" + DATE + "/notes", json={"body": "已核查，等待修复"}
        ).status_code
        == 200
    )
    collect(config)
    value = c.get("/api/reports/" + DATE).json()["data"]
    assert (
        value["status"] == "blocked" and value["notes"][0]["body"] == "已核查，等待修复"
    )
    assert (
        c.post(
            "/api/reports/" + DATE + "/action-preview", json={"action": "retry"}
        ).json()["data"]["supported"]
        is False
    )
    assert c.post("/api/commands", json={}).status_code in (404, 405)


def test_article_change_and_symlink_rejected(config, tmp_path):
    p = config.repo / f"content/progress/{DATE}-progress.mdx"
    p.parent.mkdir(parents=True)
    p.write_text('---\ntitle: "Fixture"\n---\nBody')
    collect(config)
    c = client_login(config)
    assert c.get("/api/reports/" + DATE + "/article").status_code == 200
    p.write_text("Changed")
    assert c.get("/api/reports/" + DATE + "/article").status_code == 409
    secret = tmp_path / "secret"
    secret.write_text("private")
    p.unlink()
    p.symlink_to(secret)
    with pytest.raises(ValueError):
        safe_read(p, config.repo)
    assert c.get("/api/reports/" + DATE + "/article").status_code == 409


def test_schedule_snapshot_and_backup(config):
    collect(config)
    write(
        config.openclaw / "cron/jobs.json",
        {
            "jobs": [
                {
                    "id": JOB_ID,
                    "enabled": False,
                    "schedule": {
                        "kind": "cron",
                        "expr": "0 1 * * *",
                        "tz": "Asia/Shanghai",
                    },
                }
            ]
        },
    )
    collect(config)
    assert get_report(config, config.enabled_since)["schedule"]["time"] == "23:30"
    path = backup(config)
    with sqlite3.connect(path) as c:
        assert c.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert c.execute("SELECT count(*) FROM reports").fetchone()[0] >= 1


def test_restore_and_openapi_contract(config, tmp_path):
    import os

    write(
        config.data / "config.json",
        {
            "repo": str(config.repo),
            "openclaw": str(config.openclaw),
            "port": config.port,
            "enabled_since": config.enabled_since,
        },
    )
    collect(config)
    saved = backup(config)
    with connection(config) as c:
        c.execute("DELETE FROM reports")
    script = Path(__file__).resolve().parents[1] / "scripts/adminctl.py"
    env = {**os.environ, "AJIN_ADMIN_DATA": str(config.data)}
    result = subprocess.run(
        [sys.executable, str(script), "restore", "--file", str(saved)],
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert get_report(config, config.enabled_since)["status"] == "not_started"
    app = create_app(config)
    schema = app.openapi()
    assert schema == app.openapi()
    assert len(schema["paths"]) == 11
    assert schema["paths"]["/api/auth/session"]["get"]["security"] == [
        {"APIKeyCookie": []}
    ]
    assert schema["paths"]["/api/auth/login"]["post"]["security"] == []
    assert "/api/commands" not in schema["paths"]
    assert schema["components"]["schemas"]["Report"]["properties"]["status"]["enum"]


def test_login_rate_limit_and_untrusted_paths(config):
    c = TestClient(
        create_app(config),
        base_url="http://127.0.0.1:4318",
        headers={"Origin": "http://127.0.0.1:4318"},
    )
    for _ in range(10):
        assert c.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    assert (
        c.post("/api/auth/login", json={"password": "fixture-password"}).status_code
        == 429
    )
    assert c.get("/api/unknown").status_code == 404
    assert c.get("/../../backend/api.py").status_code in (404, 503)


def test_missing_journal_preserves_previous_run(config):
    state(
        config,
        [
            event("draft", "started"),
            event("workflow", "needs_attention", reason="writer_error"),
        ],
    )
    collect(config)
    (config.repo / f".git/blog-program-workflow/{DATE}/{RID}/state.json").unlink()
    collect(config)
    assert get_report(config)["run_count"] == 1
    with connection(config) as c:
        assert get_meta(c, "collector")["errors"]
