"""Code-first local API response contract; no unimplemented command endpoints."""

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    """Successful response with server observation time."""

    data: T
    observed_at: str


class Session(BaseModel):
    csrf: str


class Ok(BaseModel):
    ok: bool


class Created(BaseModel):
    id: int


class Schedule(BaseModel):
    known: bool
    enabled: bool | None
    time: str | None = None
    reason: str | None = None
    hash: str | None = None


class ArtifactRef(BaseModel):
    hash: str
    path: str
    cover: str | None


class Capabilities(BaseModel):
    retry: bool
    backfill: bool
    reason: str


class Evidence(BaseModel):
    status: str
    reason: str | None = None
    run_id: str | None = None
    receipt_sha256: str | None = None
    ledger_sha256: str | None = None
    recovery_type: str | None = None
    natural_schedule_verified: bool | None = None


class Event(BaseModel):
    stage: str
    status: str
    at: str
    seq: int
    attempt: int | None = None
    reason: str | None = None
    post_sha256: str | None = None
    receipt_sha256: str | None = None


class Run(BaseModel):
    id: str
    date: str
    events: list[Event]
    source_hash: str
    last_event: str | None
    source: str


class NoteRecord(BaseModel):
    id: int
    body: str
    created_at: str


class Report(BaseModel):
    date: str
    status: Literal[
        "published", "skipped", "blocked", "unknown", "not_started", "running"
    ]
    stage: str
    title: str
    reason: str
    last_event: str | None
    observed_at: str
    schedule: Schedule
    scheduled_at: str | None
    run_count: int
    latest_run_id: str | None
    evidence: Evidence
    article: ArtifactRef | None
    capabilities: Capabilities


class Detail(Report):
    runs: list[Run]
    notes: list[NoteRecord]


class Page(BaseModel):
    items: list[Report]
    total: int
    page: int
    size: int


class Overview(BaseModel):
    today: Report | None
    unfinished: list[Report]


class Backup(BaseModel):
    status: str
    date: str | None = None
    file: str | None = None
    reason: str | None = None


class System(BaseModel):
    worker_online: bool
    repo_ready: bool
    backup: Backup | None = None
    mode: Literal["observe"]
    host: str
    port: int
    last_success: str | None = None
    last_attempt: str | None = None
    errors: list[str] = Field(default_factory=list)
    schedule: Schedule | None = None
    report_count: int | None = None


class Article(BaseModel):
    title: str
    body: str
    hash: str
    cover: str | None
    path: str


class Preview(BaseModel):
    supported: Literal[False]
    action: Literal["retry", "backfill"]
    reason: str
    allowed_actions: list[str]
