import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Link,
  useLocation,
} from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Inbox,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  api,
  setCsrf,
  statusNames,
  stageNames,
  time,
  duration,
  type Report,
  type Page,
  type System,
  type Run,
} from "./api";
import "./styles/index.css";
import "./styles/admin.css";

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchInterval: 15000, refetchOnWindowFocus: true },
  },
});
function Status({ value }: { value: string }) {
  const Icon =
    value === "published"
      ? CheckCircle2
      : value === "blocked"
        ? XCircle
        : value === "unknown"
          ? TriangleAlert
          : Clock3;
  return (
    <Badge variant="outline" className={"status status-" + value}>
      <Icon size={12} />
      {statusNames[value] || value}
    </Badge>
  );
}
function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <TriangleAlert size={18} />
      <span>{error instanceof Error ? error.message : String(error)}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          重试
        </Button>
      )}
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}
function Login({ done }: { done: () => void }) {
  const [password, setPassword] = useState("");
  const submit = useMutation({
    mutationFn: () => api<{ csrf: string }>("/auth/login", { password }),
    onSuccess: (data) => {
      setCsrf(data.csrf);
      setPassword("");
      done();
    },
  });
  return (
    <main className="login">
      <div className="login-aside">
        <span className="brand-mark">
          <BookOpen />
        </span>
        <p className="eyebrow">AJIN BLOG / DAILY REPORTS</p>
        <h1>
          每一天的进展，
          <br />
          都有迹可循。
        </h1>
        <p>从素材到发布，查看日报的完整过程。</p>
        <span className="local-label">
          <ShieldCheck size={15} />
          仅本机访问
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <p className="eyebrow">管理后台</p>
        <h2>欢迎回来</h2>
        <p className="muted">登录后查看日报进度与异常。</p>
        <Label htmlFor="password">管理密码</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        {submit.error && <ErrorBox error={submit.error} />}
        <Button className="w-full" disabled={submit.isPending || !password}>
          {submit.isPending ? "登录中" : "登录"}
        </Button>
        <p className="login-help">
          首次密码保存在本机数据目录的 initial-password.txt。
        </p>
      </form>
    </main>
  );
}
function App() {
  const [logged, setLogged] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ csrf: string }>("/auth/session")
      .then((v) => {
        setCsrf(v.csrf);
        setLogged(true);
      })
      .catch(() => setLogged(false));
    const expire = () => {
      client.clear();
      setLogged(false);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  if (logged === null) return <Empty title="正在连接本机后台" />;
  if (!logged) return <Login done={() => setLogged(true)} />;
  return (
    <Shell
      logout={async () => {
        await api("/auth/logout", {});
        client.clear();
        setLogged(false);
      }}
    />
  );
}
function Shell({ logout }: { logout: () => Promise<void> }) {
  const location = useLocation();
  const isIssues = location.pathname === "/issues";
  const [dark, setDark] = useState(
    localStorage.getItem("ajin-admin-theme") === "dark",
  );
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const system = useQuery({
    queryKey: ["system"],
    queryFn: () => api<System>("/system/status"),
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ajin-admin-theme", dark ? "dark" : "light");
  }, [dark]);
  const state = system.data;
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <Link to="/reports" className="brand">
            <span className="brand-mark">
              <BookOpen size={19} />
            </span>
            <span>
              <strong>ajin-blog</strong>
              <small>日报管理</small>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>工作区</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={!isIssues}>
                  <Link to="/reports">
                    <FileText />
                    <span>日报总览</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isIssues}>
                  <Link to="/issues">
                    <TriangleAlert />
                    <span>异常待办</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <div className="sidebar-note">
            <span className="online-dot" />
            <span>
              本机工作台<small>生产流程只读接入</small>
            </span>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
            {dark ? "浅色模式" : "深色模式"}
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => logout().catch(setLogoutError)}
          >
            <LogOut />
            退出登录
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="topbar">
          <SidebarTrigger />
          <span className="crumb">
            工作区 <ChevronRight size={14} />{" "}
            {isIssues ? "异常待办" : "日报总览"}
          </span>
          <div className="topbar-right">
            <span className="updated">更新于 {time(state?.last_success)}</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Activity size={14} />
                  {state?.worker_online ? "采集在线" : "采集离线"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>本机运行状态</DialogTitle>
                  <DialogDescription>数据采集与本地存储</DialogDescription>
                </DialogHeader>
                {system.error ? (
                  <ErrorBox error={system.error} />
                ) : (
                  <dl className="info-list">
                    <dt>采集进程</dt>
                    <dd>{state?.worker_online ? "在线" : "离线"}</dd>
                    <dt>项目目录</dt>
                    <dd>{state?.repo_ready ? "可访问" : "未就绪"}</dd>
                    <dt>最近采集</dt>
                    <dd>{time(state?.last_success)}</dd>
                    <dt>数据备份</dt>
                    <dd>
                      {state?.backup?.status === "ok"
                        ? `已备份 · ${state.backup.date}`
                        : "尚未确认"}
                    </dd>
                    <dt>计划时间</dt>
                    <dd>
                      {state?.schedule?.enabled
                        ? state.schedule.time || "格式待核实"
                        : "未启用或未读取"}
                    </dd>
                  </dl>
                )}
                {state?.errors?.map((e, i) => (
                  <p className="muted text-sm" key={i}>
                    {e}
                  </p>
                ))}
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <main className="workspace">
          {system.error && (
            <ErrorBox error={system.error} retry={() => system.refetch()} />
          )}
          {!!logoutError && <ErrorBox error={logoutError} />}{" "}
          {state &&
            (!state.worker_online ||
              !state.repo_ready ||
              !!state.errors?.length) && (
              <div className="notice">
                <TriangleAlert size={17} />
                <span>
                  {!state.repo_ready
                    ? "项目未就绪，仅显示已保存记录"
                    : !state.worker_online
                      ? "采集已离线，当前数据可能滞后"
                      : "部分证据读取异常，请查看运行状态"}
                </span>
              </div>
            )}
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>ajin-blog · 日报生产记录</span>
          <span>
            Asia/Shanghai <span className="footer-dot">·</span> 本机存储
          </span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
function Reports({ issues = false }: { issues?: boolean }) {
  const storageKey = issues ? "ajin-issues-filters" : "ajin-report-filters";
  const initial = new URLSearchParams(
    window.location.search || sessionStorage.getItem(storageKey) || "",
  );
  const [q, setQ] = useState(initial.get("q") || "");
  const [status, setStatus] = useState(initial.get("status") || "");
  const [start, setStart] = useState(initial.get("start") || "");
  const [end, setEnd] = useState(initial.get("end") || "");
  const [page, setPage] = useState(Number(initial.get("page")) || 1);
  const params = new URLSearchParams({
    q,
    status,
    start,
    end,
    page: String(page),
    size: "15",
    issues: String(issues),
  });
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + "?" + params.toString(),
    );
    sessionStorage.setItem(storageKey, params.toString());
  }, [q, status, start, end, page, issues]);
  const result = useQuery({
    queryKey: ["reports", params.toString()],
    queryFn: () => api<Page>("/reports?" + params.toString()),
  });
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () =>
      api<{ today: Report | null; unfinished: Report[] }>("/overview"),
    enabled: !issues,
  });
  const today = overview.data?.today;
  const update =
    (fn: (s: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      fn(e.target.value);
      setPage(1);
    };
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            {issues ? "ATTENTION REQUIRED" : "DAILY WORKSPACE"}
          </p>
          <h1>{issues ? "异常待办" : "日报总览"}</h1>
          <p>
            {issues
              ? "查看卡点与处理记录。"
              : "每份日报的进度、产物与发布结果。"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            result.refetch();
            overview.refetch();
          }}
          disabled={result.isFetching}
        >
          <RefreshCw size={15} className={result.isFetching ? "spin" : ""} />
          刷新
        </Button>
      </div>
      {!issues && (
        <>
          {overview.error && (
            <ErrorBox error={overview.error} retry={() => overview.refetch()} />
          )}
          {today ? (
            <section className="today">
              <div className="today-main">
                <div className="today-heading">
                  <span className="eyebrow">今日日报</span>
                  <Status value={today.status} />
                </div>
                <h2>
                  {today.date}
                  <span>{today.title || "等待今日内容"}</span>
                </h2>
                <p>{today.reason}</p>
                <Link
                  to="/reports/$date"
                  params={{ date: today.date }}
                  className="today-link"
                >
                  查看详情 <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="today-facts">
                <div>
                  <span>当前阶段</span>
                  <strong>{today.stage}</strong>
                </div>
                <div>
                  <span>计划开始</span>
                  <strong>
                    {today.schedule.enabled
                      ? today.schedule.time || "待核实"
                      : "计划未启用"}
                  </strong>
                </div>
                <div>
                  <span>最近活动</span>
                  <strong>{time(today.last_event)}</strong>
                </div>
              </div>
            </section>
          ) : (
            <Empty
              title={overview.isPending ? "正在读取今日日报" : "尚无今日日报"}
              detail="采集器会独立建立每日预期记录"
            />
          )}
          {!!overview.data?.unfinished.length && (
            <div className="unfinished">
              <TriangleAlert size={16} />
              <span>历史阻塞</span>
              {overview.data.unfinished.map((r) => (
                <Link
                  key={r.date}
                  to="/reports/$date"
                  params={{ date: r.date }}
                >
                  {r.date}
                  <ArrowUpRight size={12} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      <section className="records">
        <div className="section-title">
          <h2>{issues ? "需要关注" : "日报记录"}</h2>
          <span>{result.data?.total ?? "—"} 条</span>
        </div>
        <div className="filters">
          <Input
            aria-label="搜索日报"
            placeholder="搜索标题或日期"
            value={q}
            onChange={update(setQ)}
            className="search"
          />
          <select
            aria-label="筛选状态"
            value={status}
            onChange={update(setStatus)}
          >
            <option value="">全部状态</option>
            {Object.entries(statusNames).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Input
            aria-label="开始日期"
            type="date"
            value={start}
            onChange={update(setStart)}
          />
          <span className="muted">至</span>
          <Input
            aria-label="结束日期"
            type="date"
            value={end}
            onChange={update(setEnd)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setStatus("");
              setStart("");
              setEnd("");
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>
        {result.error ? (
          <ErrorBox error={result.error} retry={() => result.refetch()} />
        ) : result.isPending ? (
          <Empty title="正在读取记录" />
        ) : !result.data?.items.length ? (
          <Empty
            title={issues ? "暂无匹配异常" : "暂无匹配记录"}
            detail="可调整日期或筛选条件"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>业务日期</TableHead>
                <TableHead>{issues ? "问题摘要" : "日报标题"}</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>当前阶段</TableHead>
                <TableHead>最近活动</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="mono">
                    <Link to="/reports/$date" params={{ date: r.date }}>
                      {r.date}
                    </Link>
                  </TableCell>
                  <TableCell className="report-title">
                    <Link to="/reports/$date" params={{ date: r.date }}>
                      {issues ? r.reason : r.title || "尚未生成"}
                      <small>{issues ? r.title : r.reason}</small>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Status value={r.status} />
                  </TableCell>
                  <TableCell>{r.stage}</TableCell>
                  <TableCell className="muted whitespace-nowrap">
                    {time(r.last_event)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/reports/$date" params={{ date: r.date }}>
                        详情
                        <ChevronRight size={14} />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="pagination">
          <span>
            第 {page} 页 / 共{" "}
            {Math.max(1, Math.ceil((result.data?.total || 0) / 15))} 页
          </span>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!result.data || page * 15 >= result.data.total}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
function Timeline({ run }: { run?: Run }) {
  if (!run) return <Empty title="尚无阶段记录" />;
  const keys = [
    "prepare",
    "draft",
    "review-1",
    "revision",
    "review-2",
    "check-pass",
    "publish",
  ];
  return (
    <ol className="timeline">
      {keys.map((key) => {
        const events = run.events.filter((e) => e.stage === key);
        const started = events.find((e) => e.status === "started");
        const complete = events.find((e) => e.status === "completed");
        const failure = run.events.find((e) => e.status === "needs_attention");
        const failed = !!(started && !complete && failure);
        const review = run.events.find(
          (e) =>
            e.stage === "review-result" &&
            e.at >= (started?.at || "") &&
            e.at <=
              (run.events.find((e) => e.stage === "publish")?.at || "z") &&
            e.attempt === (key === "review-2" ? 2 : 1),
        );
        const unused =
          (key === "revision" || key === "review-2") &&
          !started &&
          run.events.some((e) => e.stage === "publish");
        return (
          <li key={key}>
            <span
              className={
                "timeline-icon " +
                (failed ? "failed" : complete ? "complete" : "")
              }
            >
              {failed ? (
                <XCircle size={16} />
              ) : complete ? (
                <CheckCircle2 size={16} />
              ) : (
                <Clock3 size={16} />
              )}
            </span>
            <div>
              <div className="stage-line">
                <strong>{stageNames[key]}</strong>
                <span>
                  {failed
                    ? "调用失败"
                    : complete
                      ? key.startsWith("review-")
                        ? review?.status || "调用已返回"
                        : "调用完成"
                      : started
                        ? "状态待核实"
                        : unused
                          ? "不适用"
                          : "未记录"}
                </span>
              </div>
              <p>
                {started ? time(started.at) : "尚无事件"}
                {complete && ` · ${duration(started?.at, complete.at)}`}
              </p>
              {key === "publish" && started && (
                <p>封面、视觉验收与上线子步骤未独立记录</p>
              )}
              {failed && <p className="danger">{failure?.reason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
function Detail() {
  const { date } = detailRoute.useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState("article");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const result = useQuery({
    queryKey: ["report", date],
    queryFn: () => api<Report>("/reports/" + date),
  });
  const article = useQuery({
    queryKey: ["article", date, result.data?.article?.hash],
    queryFn: () =>
      api<{ body: string; hash: string; title: string }>(
        "/reports/" + date + "/article",
      ),
    enabled: !!result.data?.article,
  });
  const mutation = useMutation({
    mutationFn: () => api("/reports/" + date + "/notes", { body: note }),
    onSuccess: () => {
      setNote("");
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["report", date] });
    },
  });
  useEffect(() => {
    setSelected("");
    setNote("");
    setSaved(false);
    setImageError(false);
  }, [date]);
  if (result.error)
    return <ErrorBox error={result.error} retry={() => result.refetch()} />;
  if (!result.data) return <Empty title="正在读取日报" />;
  const r = result.data;
  const run = r.runs?.find((v) => v.id === selected) || r.runs?.[0];
  return (
    <>
      <Link to="/reports" className="back">
        <ArrowLeft size={15} />
        返回列表
      </Link>
      <div className="page-title detail-title">
        <div>
          <p className="eyebrow">DAILY REPORT / {date}</p>
          <h1>{r.title || date + " 日报"}</h1>
          <div className="detail-meta">
            <Status value={r.status} />
            <span>最近核验 {time(r.observed_at)}</span>
            <span>{r.run_count} 次运行</span>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">恢复说明</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>恢复能力</DialogTitle>
              <DialogDescription>{r.capabilities.reason}</DialogDescription>
            </DialogHeader>
            <p className="muted text-sm">
              已保存的处理意见不会修改生产状态。需完成执行侧恢复接口后，才会开放重试与补跑。
            </p>
          </DialogContent>
        </Dialog>
      </div>
      {r.status !== "published" && (
        <div className="notice">
          <TriangleAlert size={18} />
          <div>
            <strong>{r.reason}</strong>
            <p>保留原始记录，核对证据后再处理。</p>
          </div>
        </div>
      )}
      <div className="detail-grid">
        <section className="panel progress-panel">
          <div className="section-title">
            <h2>生产进度</h2>
            <Badge variant="secondary">阶段记录</Badge>
          </div>
          {!!r.runs?.length && (
            <select
              aria-label="选择运行记录"
              className="run-select"
              value={run?.id || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {r.runs.map((v) => (
                <option value={v.id} key={v.id}>
                  {time(v.last_event)} · {v.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
          <Timeline run={run} />
        </section>
        <section className="panel artifacts-panel">
          <div className="section-title">
            <h2>产物与证据</h2>
            <span>当前文件版本</span>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="article">正文</TabsTrigger>
              <TabsTrigger value="cover">封面</TabsTrigger>
              <TabsTrigger value="review">审稿</TabsTrigger>
              <TabsTrigger value="evidence">证据</TabsTrigger>
            </TabsList>
            <TabsContent value="article">
              {!r.article ? (
                <Empty title="尚未生成正文" />
              ) : article.error ? (
                <ErrorBox
                  error={article.error}
                  retry={() => article.refetch()}
                />
              ) : article.isPending ? (
                <Empty title="正在读取正文" />
              ) : (
                <>
                  <div className="artifact-caption">
                    当前文件只读预览 · 不代表已发布
                  </div>
                  <pre className="article-body">{article.data.body}</pre>
                </>
              )}
            </TabsContent>
            <TabsContent value="cover">
              {!r.article?.cover || imageError ? (
                <Empty title="暂无可读取封面" />
              ) : (
                <>
                  <div className="artifact-caption">
                    当前文章引用 · 未核实与所选运行的绑定
                  </div>
                  <a
                    href={"/api/reports/" + date + "/cover"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="cover-preview"
                      alt="当前日报封面"
                      src={"/api/reports/" + date + "/cover"}
                      onError={() => setImageError(true)}
                    />
                  </a>
                </>
              )}
            </TabsContent>
            <TabsContent value="review">
              {run?.events.some((e) => e.stage === "review-result") ? (
                <div className="review-list">
                  {run.events
                    .filter((e) => e.stage === "review-result")
                    .map((e) => (
                      <article key={e.seq}>
                        <strong>
                          第 {e.attempt} 次审稿 · {e.status}
                        </strong>
                        <p>{time(e.at)}</p>
                        <p>此版本展示已记录的审稿结论，详细意见尚未接入。</p>
                      </article>
                    ))}
                </div>
              ) : (
                <Empty title="尚无审稿结论" />
              )}
            </TabsContent>
            <TabsContent value="evidence">
              <p className="artifact-caption">业务终态与选中运行分别呈现</p>
              <pre className="evidence">
                {JSON.stringify(r.evidence, null, 2)}
              </pre>
              {run && (
                <details>
                  <summary>查看阶段事件 · {run.id.slice(0, 8)}</summary>
                  <pre className="evidence">
                    {JSON.stringify(run.events, null, 2)}
                  </pre>
                </details>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
      <section className="panel history">
        <div className="section-title">
          <h2>运行历史</h2>
          <span>原始失败始终保留</span>
        </div>
        {r.runs?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>运行标识</TableHead>
                <TableHead>最近活动</TableHead>
                <TableHead>事件数</TableHead>
                <TableHead>触发来源</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.runs.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="mono">{v.id.slice(0, 12)}</TableCell>
                  <TableCell>{time(v.last_event)}</TableCell>
                  <TableCell>{v.events.length}</TableCell>
                  <TableCell>{v.source}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(v.id);
                        setTab("evidence");
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                    >
                      查看证据
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty title="尚无运行记录" />
        )}
      </section>
      <section className="panel notes">
        <div>
          <div className="section-title">
            <h2>处理意见</h2>
          </div>
          <p className="muted text-sm">记录处理情况，保留业务原始结果。</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            mutation.mutate();
          }}
        >
          <Label htmlFor="note">新增意见</Label>
          <Textarea
            id="note"
            maxLength={2000}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="记录原因、核查结果或下一步…"
          />
          <div className="note-actions">
            <span role="status">{saved ? "已保存" : ""}</span>
            <Button disabled={!note.trim() || mutation.isPending}>
              {mutation.isPending ? "保存中" : "保存备注"}
            </Button>
          </div>
          {mutation.error && <ErrorBox error={mutation.error} />}
        </form>
        <div className="note-history">
          {r.notes?.map((n) => (
            <article key={n.id}>
              <time>{time(n.created_at)}</time>
              <p>{n.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
const rootRoute = createRootRoute({ component: App });
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: () => <Reports key="reports" />,
});
const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/issues",
  component: () => <Reports key="issues" issues />,
});
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports/$date",
  component: Detail,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Reports />,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    reportsRoute,
    issuesRoute,
    detailRoute,
    indexRoute,
  ]),
  defaultNotFoundComponent: () => <Empty title="页面不存在" />,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
