#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PATCH_PATH_PREFIXES = [
  "*** Add File:",
  "*** Update File:",
  "*** Delete File:",
  "*** Move to:",
];

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(input.trim() ? JSON.parse(input) : {});
      } catch (error) {
        reject(new Error(`Hook stdin 不是有效 JSON: ${error.message}`));
      }
    });
    process.stdin.on("error", reject);
  });
}

function normalizeRepoPath(value) {
  const unquoted = value.trim().replace(/^(["'])(.*)\1$/, "$2");
  const normalized = path.posix.normalize(unquoted.replaceAll("\\", "/"));
  if (
    !normalized ||
    normalized === "." ||
    path.posix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    return null;
  }
  return normalized;
}

export function parsePatchPaths(command) {
  if (typeof command !== "string") {
    return [];
  }

  const files = new Set();
  for (const line of command.split(/\r?\n/)) {
    for (const prefix of PATCH_PATH_PREFIXES) {
      if (!line.startsWith(prefix)) {
        continue;
      }
      const file = normalizeRepoPath(line.slice(prefix.length));
      if (file) {
        files.add(file);
      }
    }
  }
  return [...files].sort();
}

export function globToRegExp(glob) {
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        index += 1;
        if (glob[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}

function matchesPattern(file, pattern) {
  return globToRegExp(pattern).test(file);
}

export function selectRules(files, config) {
  const matched = (config.rules ?? [])
    .filter((rule) =>
      (rule.patterns ?? []).some((pattern) =>
        files.some((file) => matchesPattern(file, pattern)),
      ),
    )
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));

  const exclusive = matched.find((rule) => rule.exclusive);
  return exclusive ? [exclusive] : matched;
}

function sanitizeId(value, fallback) {
  const sanitized = String(value ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
  return sanitized || fallback;
}

function repoRoot(cwd) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

function statePath(root, input) {
  const gitDirValue = execFileSync("git", ["rev-parse", "--git-dir"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const gitDir = path.resolve(root, gitDirValue);
  const session = sanitizeId(input.session_id, "unknown-session");
  const turn = sanitizeId(input.turn_id, "unknown-turn");
  return path.join(gitDir, "codex-hook-state", `${session}-${turn}.json`);
}

function readState(file) {
  if (!fs.existsSync(file)) {
    return { files: [], attempts: 0 };
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function removeState(file) {
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // 状态清理失败不应覆盖验证结果。
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function tailOutput(result) {
  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();
  return output.length > 5000 ? output.slice(-5000) : output;
}

async function record() {
  const input = await readStdin();
  if (input.tool_name !== "apply_patch") {
    return;
  }

  const root = repoRoot(input.cwd || process.cwd());
  const file = statePath(root, input);
  const state = readState(file);
  const patchFiles = parsePatchPaths(input.tool_input?.command);
  state.files = [...new Set([...(state.files ?? []), ...patchFiles])].sort();
  writeState(file, state);
}

function explain(files) {
  const root = repoRoot(process.cwd());
  const config = JSON.parse(
    fs.readFileSync(path.join(root, ".codex/hooks/rules.json"), "utf8"),
  );
  const rules = selectRules(files, config);
  printJson({
    project: config.project,
    files,
    rules: rules.map((rule) => rule.name),
    commands: rules.flatMap((rule) => rule.commands ?? []),
  });
}

async function validate() {
  const input = await readStdin();
  const root = repoRoot(input.cwd || process.cwd());
  const file = statePath(root, input);
  const state = readState(file);

  if (!state.files?.length) {
    removeState(file);
    printJson({ continue: true });
    return;
  }

  const config = JSON.parse(
    fs.readFileSync(path.join(root, ".codex/hooks/rules.json"), "utf8"),
  );
  const rules = selectRules(state.files, config);
  if (!rules.length) {
    removeState(file);
    printJson({ continue: true });
    return;
  }

  for (const rule of rules) {
    for (const command of rule.commands ?? []) {
      const result = spawnSync(command, {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, CODEX_HOOK: "1" },
        shell: true,
      });
      if (result.status === 0) {
        continue;
      }

      state.attempts = (state.attempts ?? 0) + 1;
      const details = tailOutput(result);
      const reason = [
        `${config.project} 的「${rule.name}」失败：${command}`,
        details || `命令退出状态：${result.status ?? "unknown"}`,
        "请修复后重新完成本轮任务。",
      ].join("\n\n");

      if (state.attempts >= (config.maxAttempts ?? 2)) {
        removeState(file);
        printJson({
          continue: false,
          stopReason: "Hook 验证连续失败，已停止自动续跑。",
          systemMessage: reason,
        });
        return;
      }

      writeState(file, state);
      printJson({ decision: "block", reason });
      return;
    }
  }

  removeState(file);
  printJson({ continue: true });
}

async function main() {
  const mode = process.argv[2];
  if (mode === "record") {
    await record();
    return;
  }
  if (mode === "validate") {
    await validate();
    return;
  }
  if (mode === "explain") {
    explain(process.argv.slice(3));
    return;
  }
  throw new Error("用法: project-hook.mjs <record|validate|explain> [files...]");
}

const isMain =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (process.argv[2] === "record") {
      printJson({ systemMessage: `Hook 记录改动失败：${message}` });
      return;
    }
    printJson({
      continue: false,
      stopReason: "Hook 执行失败。",
      systemMessage: message,
    });
  });
}
