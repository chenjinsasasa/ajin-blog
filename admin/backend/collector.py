"""Read-only source adapter. Never invokes publishing, repair, model or Git writes."""

import json
import re
from datetime import datetime, timedelta

from .core import (
    TZ,
    connection,
    digest,
    get_meta,
    now,
    redact,
    safe_read,
    set_meta,
    valid_date,
)
from .publication_status import observe

JOB_ID = "08628be0-7925-42a8-9101-f5122343e0d0"
STAGES = {
    "prepare": "素材准备",
    "draft": "正文写作",
    "review-1": "事实审稿",
    "review-result": "事实审稿结果",
    "publish": "发布处理",
    "brief": "封面简报",
    "image": "封面生成",
    "visual": "视觉验收",
}


def schedule(config):
    p = config.openclaw / "cron/jobs.json"
    raw = safe_read(p, config.openclaw)
    jobs = json.loads(raw)["jobs"]
    job = next((j for j in jobs if j.get("id") == JOB_ID), None)
    if not job:
        return {"known": False, "enabled": None, "reason": "未找到主调度任务"}
    s = job.get("schedule", {})
    parts = s.get("expr", "").split()
    supported = (
        s.get("kind") == "cron"
        and s.get("tz") == "Asia/Shanghai"
        and len(parts) == 5
        and parts[2:] == ["*", "*", "*"]
        and parts[0].isdigit()
        and parts[1].isdigit()
        and 0 <= int(parts[0]) < 60
        and 0 <= int(parts[1]) < 24
    )
    return {
        "known": bool(supported),
        "enabled": job.get("enabled") is True,
        "time": f"{int(parts[1]):02}:{int(parts[0]):02}" if supported else None,
        "reason": None if supported else "当前调度格式未支持",
        "hash": digest(raw),
    }


def read_article(config, date):
    p = config.repo / f"content/progress/{date}-progress.mdx"
    if not p.exists():
        return None
    raw = safe_read(p, config.repo)
    text = raw.decode("utf-8")
    parts = text.split("---", 2)
    front = parts[1] if len(parts) == 3 and text.startswith("---") else ""

    def field(key):
        m = re.search(r"^" + key + r":\s*(.+)$", front, re.M)
        return m.group(1).strip().strip("\"'") if m else ""

    cover = field("coverImage")
    if not re.fullmatch(r"/covers/[\w.-]+\.(?:png|jpg|jpeg|webp)", cover):
        cover = None
    return {
        "title": field("title"),
        "body": redact_body(parts[2].strip() if front else text),
        "hash": digest(raw),
        "cover": cover,
        "path": str(p.relative_to(config.repo)),
    }


def redact_body(text):
    return "\n".join(redact(line) for line in text.splitlines())[:200000]


def journal(config, path, common):
    raw = safe_read(path, common)
    v = json.loads(raw)
    date = valid_date(v["target_date"])
    rid = v["guard_run_id"]
    if (
        v.get("schema") != "blog-program-workflow.v1"
        or not re.fullmatch("[0-9a-f]{32}", rid)
        or path.parent.name != rid
        or path.parent.parent.name != date
    ):
        raise ValueError("journal_identity_invalid")
    events = []
    for seq, e in enumerate(v.get("events", [])):
        ts = datetime.fromisoformat(e["at"])
        if ts.tzinfo is None:
            raise ValueError("event_timezone_missing")
        # Only approved metadata; never ingest raw model prompts or command output.
        public = {
            k: e[k]
            for k in (
                "stage",
                "status",
                "at",
                "attempt",
                "post_sha256",
                "receipt_sha256",
            )
            if k in e
        }
        if "reason" in e:
            public["reason"] = redact(e["reason"])
        public["seq"] = seq
        events.append(public)
    return {
        "id": rid,
        "date": date,
        "events": events,
        "source_hash": digest(raw),
        "last_event": events[-1]["at"] if events else None,
        "source": "未核实触发来源",
    }


def collect(config):
    stamp = now()
    today = datetime.now(TZ).date()
    common = config.common
    errors = []
    try:
        sched = schedule(config)
    except Exception as e:
        sched = {"known": False, "enabled": None, "reason": type(e).__name__}
    ledger_path = common / "blog-publish-guard.json"
    ledger = (
        json.loads(safe_read(ledger_path, common))
        if ledger_path.exists()
        else {"completed_dates": {}, "pending": None}
    )
    incoming = []
    for path in sorted((common / "blog-program-workflow").glob("*/*/state.json")):
        try:
            incoming.append(journal(config, path, common))
        except Exception as e:
            errors.append(f"{path.parent.name}: {type(e).__name__}")
    with connection(config) as c:
        retained = [
            json.loads(row[0])
            for row in c.execute("SELECT payload FROM runs").fetchall()
        ]
    seen = {r["id"] for r in incoming}
    for previous in retained:
        if previous["id"] not in seen:
            incoming.append(previous)
            errors.append(previous["id"] + ": retained_missing_source")
    dates = {r["date"] for r in incoming}
    dates.update(valid_date(d) for d in ledger.get("completed_dates", {}))
    pending = ledger.get("pending") or {}
    if pending.get("target_date"):
        dates.add(valid_date(pending["target_date"]))
    start = datetime.strptime(valid_date(config.enabled_since), "%Y-%m-%d").date()
    # Historical articles are useful, but are never evidence of successful publication.
    for p in (config.repo / "content/progress").glob("*.mdx"):
        try:
            dates.add(valid_date(p.name[:10]))
        except ValueError:
            pass
    d = start
    while d <= today:
        dates.add(d.isoformat())
        d += timedelta(days=1)
    grouped = {d: [] for d in dates}
    for r in incoming:
        grouped[r["date"]].append(r)
    projected = []
    receipt_root = config.workspace / "state/ajin-blog/blog-publish-terminal"
    for date in sorted(dates):
        runs = sorted(grouped[date], key=lambda r: r["last_event"] or "")
        latest = runs[-1] if runs else None
        events = latest["events"] if latest else []
        stage_events = [e for e in events if e["stage"] in STAGES]
        stage = (
            STAGES.get(stage_events[-1]["stage"], "尚未开始")
            if stage_events
            else "尚未开始"
        )
        result = (
            observe(date, ledger_path, receipt_root)
            if ledger_path.exists()
            else {"status": "unknown", "reason": "ledger_missing"}
        )
        same_pending = pending.get("target_date") == date
        # The existing observer reports a global pending even for another date.
        if result.get("status") == "pending" and not same_pending:
            result = {"status": "unknown", "reason": "other_date_pending"}
        status = "unknown"
        reason = "历史记录不足，发布状态未核实"
        if date >= config.enabled_since and not latest:
            status = "not_started"
            reason = "等待计划启动"
        if latest:
            status = "unknown"
            reason = "仅有阶段事件，执行进程状态待核实"
            if events and events[-1]["status"] == "needs_attention":
                status = "blocked"
                reason = events[-1].get("reason", "执行需要处理")
        if result.get("status") in ("published", "skipped", "failed"):
            status = {
                "published": "published",
                "skipped": "skipped",
                "failed": "blocked",
            }[result["status"]]
            reason = result.get(
                "reason", "终态回执已核验" if status == "published" else "无公开素材"
            )
        elif (
            date in ledger.get("completed_dates", {})
            and result.get("status") == "unknown"
        ):
            status = "unknown"
            reason = "终态证据校验失败，需要核实"
        elif same_pending and status != "blocked":
            status = "unknown"
            reason = "存在未结算占用，需要核对进程与回执"
        due = None
        # Persisted per-date snapshot below prevents later config edits rewriting history.
        with connection(config) as c:
            saved = get_meta(c, "schedule:" + date)
        snapshot = saved or (
            sched if date >= config.enabled_since else {"known": False, "enabled": None}
        )
        if (
            snapshot.get("known")
            and snapshot.get("enabled")
            and date >= config.enabled_since
        ):
            due = datetime.fromisoformat(date + "T" + snapshot["time"] + ":00").replace(
                tzinfo=TZ
            )
            if status == "not_started" and datetime.now(TZ) > due + timedelta(
                minutes=10
            ):
                reason = "超过计划时间，尚未发现运行"
        elif snapshot.get("enabled") is False and status == "not_started":
            reason = "计划已停用"
        if status == "published":
            stage = "发布完成"
        elif status == "skipped":
            stage = "正常跳过"
        reason = {
            "program_workflow_failed": "生产流程失败，请查看阶段证据",
            "unresolved_quote_retained": "修订后仍保留未核实引文",
            "editorial_review_exhausted": "旧版审稿阶段未通过",
            "writer_error": "正文生成失败",
        }.get(reason, reason)
        article = None
        try:
            article = read_article(config, date)
        except Exception as e:
            errors.append(date + ": article " + type(e).__name__)
        report = {
            "date": date,
            "status": status,
            "stage": stage,
            "reason": redact(reason),
            "title": article["title"] if article else "",
            "last_event": latest["last_event"] if latest else None,
            "observed_at": stamp,
            "schedule": snapshot,
            "scheduled_at": due.isoformat() if due else None,
            "run_count": len(runs),
            "latest_run_id": latest["id"] if latest else None,
            "evidence": {
                k: result[k]
                for k in (
                    "status",
                    "reason",
                    "run_id",
                    "receipt_sha256",
                    "ledger_sha256",
                    "recovery_type",
                    "natural_schedule_verified",
                )
                if k in result
            },
            "article": {k: article[k] for k in ("hash", "path", "cover")}
            if article
            else None,
            "capabilities": {
                "retry": False,
                "backfill": False,
                "reason": "当前版本只读接入生产流程；阶段恢复尚未启用",
            },
        }
        projected.append((report, runs))
    with connection(config) as c:
        for report, runs in projected:
            date = report["date"]
            if date >= config.enabled_since and not get_meta(c, "schedule:" + date):
                set_meta(c, "schedule:" + date, report["schedule"])
            conflict = False
            for r in runs:
                for seq, e in enumerate(r["events"]):
                    old = c.execute(
                        "SELECT digest FROM events WHERE run_id=? AND seq=?",
                        (r["id"], seq),
                    ).fetchone()
                    if old and old[0] != digest(json.dumps(e, sort_keys=True).encode()):
                        conflict = True
                old_count = c.execute(
                    "SELECT count(*) FROM events WHERE run_id=?", (r["id"],)
                ).fetchone()[0]
                if old_count > len(r["events"]):
                    conflict = True
            if conflict:
                report["status"] = "unknown"
                report["reason"] = "阶段记录发生变更，证据冲突"
                errors.append(date + ": journal_conflict")
            c.execute(
                "INSERT INTO reports VALUES(?,?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET status=excluded.status,stage=excluded.stage,title=excluded.title,reason=excluded.reason,last_event=excluded.last_event,payload=excluded.payload",
                (
                    date,
                    report["status"],
                    report["stage"],
                    report["title"],
                    report["reason"],
                    report["last_event"],
                    json.dumps(report, ensure_ascii=False),
                ),
            )
            for r in runs:
                if conflict:
                    continue
                c.execute(
                    "INSERT INTO runs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
                    (r["id"], date, json.dumps(r, ensure_ascii=False)),
                )
                for seq, e in enumerate(r["events"]):
                    c.execute(
                        "INSERT OR IGNORE INTO events VALUES(?,?,?,?)",
                        (
                            r["id"],
                            seq,
                            digest(json.dumps(e, sort_keys=True).encode()),
                            json.dumps(e, ensure_ascii=False),
                        ),
                    )
        set_meta(
            c,
            "collector",
            {
                "last_success": stamp,
                "last_attempt": stamp,
                "errors": errors[:20],
                "schedule": sched,
                "report_count": len(projected),
                "repo_ready": True,
            },
        )
    return len(projected)
