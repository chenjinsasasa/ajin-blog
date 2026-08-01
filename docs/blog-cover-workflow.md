# Blog Cover Workflow — Image 2 Only

From `2026-07-24` onward, every newly created blog post must use a Codex Image 2 cover generated through this repository's locked workflow. Public-domain downloads, reused local covers, screenshots, other image models, and silent fallbacks are not allowed.

## Visual Standard

The single visual world is **蒸汽工业时代**:

- late-nineteenth-century Industrial Revolution workshop, archive, printing house, or inventor laboratory
- dense black-ink copperplate engraving / etched editorial plate
- warm ivory paper, intricate cross-hatching, high tonal density
- cast-iron machinery, gears, belts, pipes, drafting tools, ledgers, workshop lamps
- serious, restrained, documentary, idea-led mood
- cinematic horizontal 16:9 composition with one clear focal scene

Avoid modern computers and phones, glossy SaaS illustration, colorful 3D, neon gradients, stock photography, flat vectors, anime, cyberpunk, fantasy steampunk costumes, typography, logos, and watermarks.

## Locked References

All generations use the same four homepage entry-card images as visual references:

- `public/entry-cards/blog-archive.jpg`
- `public/entry-cards/private-diary.jpg`
- `public/entry-cards/ai-team.jpg`
- `public/entry-cards/chenjin-official.jpg`

Their SHA-256 hashes, generator identity, target size, mother prompt, and negative prompt are locked in `config/blog-cover-image2.json`. Generation and validation fail if a reference drifts.

## Required Frontmatter

```yaml
coverImage: "/covers/YYYY-MM-DD-post-slug.png"
coverSourceType: "generated"
coverProvider: "codex"
coverModel: "image-2"
coverExecutionMode: "builtin-imagegen"
coverStyle: "steam-industrial-engraving"
coverPromptVersion: "steam-industrial-v2"
coverBriefVersion: "full-article-v2"
coverBriefPath: "content/cover-briefs/YYYY-MM-DD-progress.json"
coverReferenceSet: "homepage-entry-cards-v1"
```

Do not add `coverSourceUrl`, `coverLicense`, or `coverAttribution` to Image 2 covers.

## Generate

Finish the complete article body and all cover frontmatter first. In a Codex task, read the full article yourself, save the raw schema-compatible visual brief object under `.local/blog-automation/`, and let the repository attach current hashes:

```bash
npm run cover:image2:brief -- \
  --post content/progress/YYYY-MM-DD-progress.mdx \
  --visual-brief-json .local/blog-automation/YYYY-MM-DD-visual-brief-input.json
```

The preserved non-Codex/OpenClaw fallback may omit `--visual-brief-json`; that legacy mode starts an ephemeral Codex analysis process.

The brief stage reads the complete article, not only `title` and `excerpt`. Codex must select one main line and persist these auditable fields under `content/cover-briefs/`:

- core event
- primary subject
- key action
- result
- tension / unresolved problem
- industrial-age metaphor
- exactly 3 supporting symbols: subject, stable result, unresolved obstruction
- one coherent scene description
- an English content-only image prompt

The artifact records hashes for both the complete post and body. Any later article edit invalidates the brief and forces regeneration.

After the brief exists, prepare the exact prompt without starting another Codex process:

```bash
npm run cover:image2:generate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx \
  --prepare-built-in \
  --attempt 1
```

Pass only the returned `imagePrompt` value to the current task's built-in `image_gen`. Inspect the result, then adopt the generated file:

```bash
npm run cover:image2:generate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx \
  --built-in-source "$CODEX_HOME/generated_images/<run>/<image>.png"
```

If the built-in call returns an explicit network error, quarantine the `route.current` or `route.to` value returned by preparation and prepare once more before one final built-in retry:

```bash
npm run cover:image2:generate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx \
  --prepare-built-in \
  --attempt 2 \
  --failed-route "<failed route>"
```

`--attempt` accepts only `1` or `2`; attempt 2 requires the failed route from attempt 1. Do not retry non-network failures, repeat an attempt number, or make more than two built-in image calls.

The direct Codex workflow:

1. validates a fresh full-article brief and all four reference hashes;
2. exposes the brief-derived three-focus prompt without generating an image or starting nested Codex; route preflight may access `chatgpt.com` and switch the local Clash route;
3. calls the current Codex task's built-in `image_gen` exactly once without input images;
4. accepts sources only from `$CODEX_HOME/generated_images/`;
5. saves a normalized local PNG under `public/covers/`;
6. optimizes it and updates the optimization manifest.

The default command without `--prepare-built-in` or `--built-in-source` is retained only for the preserved non-Codex/OpenClaw fallback. It uses the bounded route guard and nested `codex exec` behavior described below.

### Route stability

The route guard is configured in `config/blog-cover-image2.json` and is part of the only supported generation path:

- An HTTP response such as `403` proves transport reachability; only DNS, connection, TLS, timeout, or reset failures fail the probe.
- If the active Clash route fails the preflight, the guard checks ChatGPT-dedicated candidates through the local Mihomo Unix socket, selects the lowest-latency healthy candidate, clears stale connections, and requires the route probe to pass again.
- If the long built-in image request later fails with `network error`, `error sending request`, `i/o timeout`, `context deadline exceeded`, connection reset/close, or timeout, the guard performs one forced route recovery and retries generation once after a short backoff.
- Non-network failures are never retried. If recovery or the second attempt fails, publishing remains fail-closed and the first raw generation error is retained.

If Codex Image 2, the four references, or the output step fails, stop publishing. Do not switch source or model, and do not use an API key fallback.

## Validate

Validate one target post regardless of its date:

```bash
npm run cover:image2:validate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx
```

`npm run posts:validate` enforces the same contract repository-wide for posts dated `2026-07-24` or later. It verifies provenance fields, fresh post/body hashes in the visual brief, required abstraction fields, local PNG existence, 16:9 geometry, minimum resolution, and reference integrity.

Before commit/push, visually check that the result belongs beside the four homepage standards. Prompt provenance is a gate, not a substitute for visual QA.

## Historical Covers

Historical files are not silently rewritten by the new-post gate. Backfill them in explicit batches, review the generated images, update frontmatter provenance, run validation, then commit each bounded batch.

Before generating or applying a historical batch, validate the complete queue:

```bash
npm run cover:image2:backfill:validate
```

This gate verifies all manifest entries, fresh post/body hashes, the v2 brief and prompt versions, exactly three focal elements, the 700-character Image 2 prompt limit, unique project-local PNG targets, and all four locked reference hashes.

Apply remains all-or-nothing. The apply command preflights every candidate before writing, writes the post, brief, and manifest as one recoverable transaction, validates every changed post, and requires the rebuilt manifest to report the whole scope as `applied`. Any failure restores every file in the batch to its pre-apply contents. Previous cover assets are retained for deployment rollback.
