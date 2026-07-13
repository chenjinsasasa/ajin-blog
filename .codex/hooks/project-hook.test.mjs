import assert from "node:assert/strict";
import test from "node:test";

import {
  globToRegExp,
  parsePatchPaths,
  selectRules,
} from "./project-hook.mjs";

test("parsePatchPaths extracts and normalizes apply_patch paths", () => {
  assert.deepEqual(
    parsePatchPaths(`*** Begin Patch
*** Update File: app/page.tsx
*** Add File: content/progress/new-post.md
*** Move to: components/new-card.tsx
*** End Patch`),
    ["app/page.tsx", "components/new-card.tsx", "content/progress/new-post.md"],
  );
});

test("parsePatchPaths rejects paths outside the repository", () => {
  assert.deepEqual(parsePatchPaths("*** Update File: ../outside.txt"), []);
});

test("globToRegExp supports double-star and filename wildcards", () => {
  assert.equal(globToRegExp("app/**").test("app/page.tsx"), true);
  assert.equal(globToRegExp("app/**").test("lib/page.tsx"), false);
  assert.equal(globToRegExp("next.config.*").test("next.config.mjs"), true);
});

test("selectRules prefers the highest-priority exclusive rule", () => {
  const config = {
    rules: [
      {
        name: "full",
        priority: 100,
        exclusive: true,
        patterns: ["app/**"],
      },
      { name: "content", priority: 50, patterns: ["content/**"] },
    ],
  };
  assert.deepEqual(
    selectRules(["app/page.tsx", "content/post.md"], config).map(
      (rule) => rule.name,
    ),
    ["full"],
  );
});
