import hashlib
import hmac
import json
import re
import secrets
import time
from datetime import datetime
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyCookie
from pydantic import BaseModel, Field

from . import models as m
from .collector import read_article
from .core import (
    ADMIN_ROOT,
    TZ,
    Config,
    connection,
    digest,
    get_meta,
    now,
    safe_read,
    valid_date,
)


class Error(BaseModel):
    code: str
    message: str


class Login(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class Note(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class Action(BaseModel):
    action: str = Field(pattern="^(retry|backfill)$")


cookie = APIKeyCookie(name="ajin_admin_session", auto_error=False)


def password_hash(password, salt):
    return hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
    ).hex()


def create_app(config: Config):
    app = FastAPI(
        title="ajin-blog 本机日报管理 API",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    failures = []

    def envelope(data):
        return {"data": data, "observed_at": now()}

    def authorized(token: Annotated[str | None, Depends(cookie)]):
        if not token:
            raise HTTPException(401, "请先登录")
        with connection(config) as c:
            row = c.execute(
                "SELECT * FROM sessions WHERE token_hash=? AND expires>?",
                (digest(token.encode()), time.time()),
            ).fetchone()
        if not row:
            raise HTTPException(401, "登录已过期")
        return dict(row)

    auth = [Depends(authorized)]

    def report(date):
        try:
            valid_date(date)
        except ValueError:
            raise HTTPException(422, "日期格式无效")
        with connection(config) as c:
            row = c.execute(
                "SELECT payload FROM reports WHERE date=?", (date,)
            ).fetchone()
        if not row:
            raise HTTPException(404, "日报记录不存在")
        return json.loads(row[0])

    @app.exception_handler(HTTPException)
    async def error_handler(request, exc):
        return JSONResponse(
            {"code": str(exc.status_code), "message": str(exc.detail)},
            status_code=exc.status_code,
        )

    @app.middleware("http")
    async def protection(request: Request, call_next):
        if request.headers.get("host") != f"127.0.0.1:{config.port}":
            return JSONResponse(
                {"code": "invalid_host", "message": "仅允许本机访问"}, status_code=403
            )
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            if request.headers.get("origin") != f"http://127.0.0.1:{config.port}":
                return JSONResponse(
                    {"code": "invalid_origin", "message": "请求来源无效"},
                    status_code=403,
                )
            if request.url.path != "/api/auth/login":
                token = request.cookies.get("ajin_admin_session", "")
                with connection(config) as c:
                    r = c.execute(
                        "SELECT csrf FROM sessions WHERE token_hash=? AND expires>?",
                        (digest(token.encode()), time.time()),
                    ).fetchone()
                if not r:
                    return JSONResponse(
                        {"code": "unauthorized", "message": "请先登录"}, status_code=401
                    )
                if not hmac.compare_digest(
                    r[0], request.headers.get("x-csrf-token", "")
                ):
                    return JSONResponse(
                        {"code": "csrf_invalid", "message": "请求校验失败"},
                        status_code=403,
                    )
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
        )
        return response

    responses = {
        401: {"model": Error},
        403: {"model": Error},
        404: {"model": Error},
        503: {"model": Error},
    }

    def route(method, path, **kw):
        return getattr(app, method)(
            path,
            response_model=kw.pop("response_model", m.Envelope[dict[str, Any]]),
            responses=responses,
            **kw,
        )

    @route(
        "post",
        "/api/auth/login",
        operation_id="login",
        response_model=m.Envelope[m.Session],
        tags=["认证"],
        summary="登录本机后台",
    )
    def login(body: Login, response: Response):
        failures[:] = [t for t in failures if time.time() - t < 300]
        if len(failures) >= 10:
            raise HTTPException(429, "尝试过多，请稍后重试")
        settings = json.loads((config.data / "credentials.json").read_text())
        if not hmac.compare_digest(
            password_hash(body.password, settings["salt"]), settings["hash"]
        ):
            failures.append(time.time())
            raise HTTPException(401, "密码不正确")
        failures.clear()
        token = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(32)
        with connection(config) as c:
            c.execute("DELETE FROM sessions WHERE expires<=?", (time.time(),))
            c.execute(
                "INSERT INTO sessions VALUES(?,?,?)",
                (digest(token.encode()), csrf, time.time() + 28800),
            )
            c.execute(
                "INSERT INTO audit(action,target,created_at) VALUES(?,?,?)",
                ("login", "admin", now()),
            )
        response.set_cookie(
            "ajin_admin_session", token, httponly=True, samesite="strict", max_age=28800
        )
        return envelope({"csrf": csrf})

    @route(
        "get",
        "/api/auth/session",
        operation_id="session",
        response_model=m.Envelope[m.Session],
        tags=["认证"],
        summary="读取会话",
    )
    def session(value: Annotated[dict, Depends(authorized)]):
        return envelope({"csrf": value["csrf"]})

    @route(
        "post",
        "/api/auth/logout",
        operation_id="logout",
        response_model=m.Envelope[m.Ok],
        tags=["认证"],
        summary="退出登录",
        dependencies=auth,
    )
    def logout(request: Request, response: Response):
        with connection(config) as c:
            c.execute(
                "DELETE FROM sessions WHERE token_hash=?",
                (digest(request.cookies["ajin_admin_session"].encode()),),
            )
        response.delete_cookie("ajin_admin_session")
        return envelope({"ok": True})

    @route(
        "get",
        "/api/system/status",
        operation_id="system_status",
        response_model=m.Envelope[m.System],
        tags=["系统"],
        summary="读取采集状态",
        dependencies=auth,
    )
    def system():
        with connection(config) as c:
            state = get_meta(c, "collector", {})
            beat = get_meta(c, "heartbeat")
            backup = get_meta(c, "backup")
        online = bool(beat and time.time() - beat < 90)
        state.update(
            worker_online=online,
            repo_ready=config.repo.is_dir(),
            backup=backup,
            mode="observe",
            host="本机",
            port=config.port,
        )
        return envelope(state)

    @route(
        "get",
        "/api/reports",
        operation_id="reports",
        response_model=m.Envelope[m.Page],
        tags=["日报"],
        summary="筛选日报",
        dependencies=auth,
    )
    def reports(
        status: str = "",
        q: str = Query("", max_length=100),
        start: str = "",
        end: str = "",
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=100),
        issues: bool = False,
    ):
        where = []
        params = []
        if status:
            where.append("status=?")
            params.append(status)
        if q:
            where.append("(title LIKE ? OR date LIKE ?)")
            params.extend(["%" + q + "%"] * 2)
        for val, op in ((start, ">="), (end, "<=")):
            if val:
                try:
                    valid_date(val)
                except ValueError:
                    raise HTTPException(422, "日期无效")
                where.append("date" + op + "?")
                params.append(val)
        if issues:
            where.append(
                "(status='blocked' OR (status='unknown' AND reason!='历史记录不足，发布状态未核实') OR reason LIKE '超过计划%')"
            )
        condition = " WHERE " + " AND ".join(where) if where else ""
        with connection(config) as c:
            total = c.execute(
                "SELECT count(*) FROM reports" + condition, params
            ).fetchone()[0]
            rows = c.execute(
                "SELECT payload FROM reports"
                + condition
                + " ORDER BY date DESC LIMIT ? OFFSET ?",
                params + [size, (page - 1) * size],
            ).fetchall()
        return envelope(
            {
                "items": [json.loads(r[0]) for r in rows],
                "total": total,
                "page": page,
                "size": size,
            }
        )

    @route(
        "get",
        "/api/overview",
        operation_id="overview",
        response_model=m.Envelope[m.Overview],
        tags=["日报"],
        summary="今日日报与未完成记录",
        dependencies=auth,
    )
    def overview():
        date = datetime.now(TZ).date().isoformat()
        with connection(config) as c:
            row = c.execute(
                "SELECT payload FROM reports WHERE date=?", (date,)
            ).fetchone()
            unfinished = c.execute(
                "SELECT payload FROM reports WHERE date<? AND status='blocked' ORDER BY date DESC LIMIT 5",
                (date,),
            ).fetchall()
        return envelope(
            {
                "today": json.loads(row[0]) if row else None,
                "unfinished": [json.loads(r[0]) for r in unfinished],
            }
        )

    @route(
        "get",
        "/api/reports/{date}",
        operation_id="report_detail",
        response_model=m.Envelope[m.Detail],
        tags=["日报"],
        summary="日报详情及运行历史",
        dependencies=auth,
    )
    def detail(date: str):
        result = report(date)
        with connection(config) as c:
            result["runs"] = [
                json.loads(r[0])
                for r in c.execute(
                    "SELECT payload FROM runs WHERE date=?", (date,)
                ).fetchall()
            ]
            result["notes"] = [
                dict(r)
                for r in c.execute(
                    "SELECT id,body,created_at FROM notes WHERE date=? ORDER BY id DESC",
                    (date,),
                ).fetchall()
            ]
        result["runs"].sort(key=lambda r: r.get("last_event") or "", reverse=True)
        return envelope(result)

    @route(
        "post",
        "/api/reports/{date}/notes",
        operation_id="add_note",
        response_model=m.Envelope[m.Created],
        tags=["日报"],
        summary="记录处理意见",
        dependencies=auth,
    )
    def add_note(date: str, body: Note):
        report(date)
        if not body.body.strip():
            raise HTTPException(422, "意见不能为空")
        with connection(config) as c:
            r = c.execute(
                "INSERT INTO notes(date,body,created_at) VALUES(?,?,?)",
                (date, body.body.strip(), now()),
            )
            c.execute(
                "INSERT INTO audit(action,target,created_at) VALUES(?,?,?)",
                ("add_note", date, now()),
            )
        return envelope({"id": r.lastrowid})

    @route(
        "get",
        "/api/reports/{date}/article",
        operation_id="article",
        response_model=m.Envelope[m.Article],
        tags=["产物"],
        summary="只读正文预览",
        dependencies=auth,
    )
    def article(date: str):
        expected = report(date).get("article")
        try:
            value = read_article(config, date)
        except (ValueError, OSError):
            raise HTTPException(409, "产物不可读或路径无效")
        if not value:
            raise HTTPException(404, "尚未生成正文")
        if not expected or value["hash"] != expected["hash"]:
            raise HTTPException(409, "正文版本已变化，等待重新采集")
        return envelope(value)

    @app.get(
        "/api/reports/{date}/cover",
        operation_id="cover",
        tags=["产物"],
        summary="当前文章引用的封面",
        dependencies=auth,
        response_class=Response,
        responses={
            200: {
                "content": {
                    t: {"schema": {"type": "string", "format": "binary"}}
                    for t in ("image/png", "image/jpeg", "image/webp")
                }
            },
            **responses,
        },
    )
    def cover(date: str):
        expected = report(date).get("article")
        value = read_article(config, date)
        if not expected or not value or not value["cover"]:
            raise HTTPException(404, "尚无封面")
        if value["hash"] != expected["hash"]:
            raise HTTPException(409, "正文版本变化")
        p = config.repo / "public" / value["cover"].lstrip("/")
        try:
            raw = safe_read(p, config.repo / "public/covers", 20_000_000)
        except (ValueError, OSError):
            raise HTTPException(404, "封面不存在或不可读")
        media = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
        }[p.suffix[1:]]
        return Response(raw, media_type=media, headers={"ETag": digest(raw)})

    @route(
        "post",
        "/api/reports/{date}/action-preview",
        operation_id="action_preview",
        response_model=m.Envelope[m.Preview],
        tags=["能力"],
        summary="检查恢复能力（当前只读版）",
        dependencies=auth,
    )
    def preview(date: str, body: Action):
        report(date)
        return envelope(
            {
                "supported": False,
                "action": body.action,
                "reason": "当前版本只读接入生产流程，尚未启用恢复或补跑",
                "allowed_actions": [],
            }
        )

    @app.get("/api/openapi.json", include_in_schema=False, dependencies=auth)
    def schema():
        return app.openapi()

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "接口不存在")
        root = ADMIN_ROOT / "frontend/dist"
        p = (root / path).resolve()
        if not p.is_relative_to(root.resolve()):
            raise HTTPException(404, "文件不存在")
        if path.startswith("assets/") and p.is_file():
            return FileResponse(p)
        if path not in ("", "reports", "issues", "login") and not re.fullmatch(
            r"reports/\d{4}-\d{2}-\d{2}", path
        ):
            raise HTTPException(404, "页面不存在")
        index = root / "index.html"
        if not index.exists():
            raise HTTPException(503, "前端尚未构建")
        return FileResponse(index)

    from .schema import enrich

    original_openapi = app.openapi
    app.openapi = lambda: enrich(original_openapi(), config)
    return app
