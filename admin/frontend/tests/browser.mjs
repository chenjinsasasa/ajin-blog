import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(
  root,
  "test-results",
  process.env.AJIN_ADMIN_FIXTURE === "1" ? "fixture" : "live",
);
await mkdir(out, { recursive: true });
const base = process.env.AJIN_ADMIN_URL || "http://127.0.0.1:4318";
const password = (
  await readFile(
    process.env.AJIN_ADMIN_PASSWORD_FILE ||
      path.join(
        os.homedir(),
        "Library/Application Support/ajin-blog-admin/initial-password.txt",
      ),
    "utf8",
  )
).trim();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/reports");
await page.getByLabel("管理密码").fill(password);
await page.getByRole("button", { name: "登录", exact: true }).click();
await page.getByRole("heading", { name: "日报总览", exact: true }).waitFor();
await page.getByRole("table").waitFor();
await page.screenshot({
  path: path.join(out, "overview-1440.png"),
  fullPage: true,
});
await page.getByLabel("搜索日报").fill("2026-09-20");
await page.waitForFunction(
  () => document.querySelectorAll("tbody tr").length === 1,
);
await page.getByRole("link", { name: "详情", exact: true }).click();
await page.getByRole("heading", { name: "生产进度", exact: true }).waitFor();
if (process.env.AJIN_ADMIN_FIXTURE === "1") {
  if (base !== "http://127.0.0.1:4320")
    throw new Error("Fixture writes only allowed on isolated port 4320");
  await page.getByLabel("新增意见").fill("浏览器隔离测试：已核查，等待修复。");
  await page.getByRole("button", { name: "保存备注", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "已保存" }).waitFor();
  await page.reload();
  await page
    .getByText("浏览器隔离测试：已核查，等待修复。", { exact: true })
    .waitFor();
}

await page.getByRole("tab", { name: "证据", exact: true }).click();
await page.getByRole("tab", { name: "正文", exact: true }).click();
await page.screenshot({
  path: path.join(out, "detail-1440.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "恢复说明", exact: true }).click();
await page.getByRole("heading", { name: "恢复能力", exact: true }).waitFor();
await page.keyboard.press("Escape");
await page.getByRole("link", { name: "异常待办", exact: true }).click();
await page.getByRole("heading", { name: "异常待办", exact: true }).waitFor();
await page.getByRole("table").waitFor();
await page.screenshot({
  path: path.join(out, "issues-1440.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "深色模式", exact: true }).click();
if (!(await page.locator("html").evaluate((e) => e.classList.contains("dark"))))
  throw new Error("theme did not change");
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({
  path: path.join(out, "issues-dark-1280.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "浅色模式", exact: true }).click();
for (const width of [1280, 800, 390]) {
  await page.setViewportSize({ width, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw new Error(`page overflow at ${width}`);
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.getByRole("button", { name: "退出登录", exact: true }).click();
await page.getByLabel("管理密码").waitFor();
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  "PASS: login, real report list, search, detail, tabs, recovery dialog, issues, themes, 3 widths, logout; no browser errors",
);
await browser.close();
