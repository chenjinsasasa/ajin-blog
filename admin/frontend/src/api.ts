export type Event = {
  stage: string;
  status: string;
  at: string;
  reason?: string;
  attempt?: number;
  seq: number;
};
export type Run = {
  id: string;
  date: string;
  events: Event[];
  last_event: string | null;
  source: string;
};
export type Report = {
  date: string;
  status: string;
  stage: string;
  title: string;
  reason: string;
  last_event: string | null;
  observed_at: string;
  scheduled_at: string | null;
  run_count: number;
  latest_run_id: string | null;
  schedule: { known: boolean; enabled: boolean | null; time?: string };
  evidence: Record<string, unknown>;
  article: { hash: string; path: string; cover: string | null } | null;
  capabilities: { retry: boolean; backfill: boolean; reason: string };
  runs?: Run[];
  notes?: { id: number; body: string; created_at: string }[];
};
export type System = {
  worker_online: boolean;
  repo_ready: boolean;
  last_success?: string;
  errors?: string[];
  backup?: { status: string; date?: string };
  schedule?: { enabled: boolean; time?: string };
};
export type Page = {
  items: Report[];
  total: number;
  page: number;
  size: number;
};
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path != "/auth/login")
      window.dispatchEvent(new window.Event("session-expired"));
    throw new ApiError(response.status, value.message || "请求失败，请重试");
  }
  return value.data;
}
export const statusNames: Record<string, string> = {
  published: "已发布",
  skipped: "已跳过",
  blocked: "已阻塞",
  unknown: "待核实",
  not_started: "未开始",
  running: "进行中",
};
export const stageNames: Record<string, string> = {
  workflow: "整体流程",
  prepare: "素材准备",
  draft: "正文写作",
  "review-1": "事实审稿",
  revision: "正文修订",
  "review-2": "事实复审",
  "review-result": "审稿结论",
  "check-pass": "审稿验收",
  publish: "发布处理",
  brief: "封面简报",
  image: "封面生成",
  visual: "视觉验收",
};
export function time(value?: string | null) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚无记录";
}
export function duration(start?: string, end?: string) {
  if (!start || !end) return "未记录";
  const seconds = Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 1000),
  );
  return seconds < 60
    ? `${seconds} 秒`
    : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
