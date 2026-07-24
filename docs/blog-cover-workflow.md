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
coverPromptVersion: "steam-industrial-v1"
coverReferenceSet: "homepage-entry-cards-v1"
```

Do not add `coverSourceUrl`, `coverLicense`, or `coverAttribution` to Image 2 covers.

## Generate

Write the article title, excerpt, and target `coverImage` first, then run:

```bash
npm run cover:image2:generate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx
```

The command:

1. verifies all four reference hashes;
2. starts a bounded `codex exec` task with all four references and uses Codex's built-in `image_gen` tool;
3. removes `OPENAI_API_KEY` from the child environment and uses the Codex login state only;
4. saves a local PNG under `public/covers/`;
5. optimizes it and updates the optimization manifest.

If Codex Image 2, the four references, or the output step fails, stop publishing. Do not switch source or model, and do not use an API key fallback.

## Validate

Validate one target post regardless of its date:

```bash
npm run cover:image2:validate -- \
  --post content/progress/YYYY-MM-DD-progress.mdx
```

`npm run posts:validate` enforces the same contract repository-wide for posts dated `2026-07-24` or later. It verifies provenance fields, local PNG existence, 16:9 geometry, minimum resolution, and reference integrity.

Before commit/push, visually check that the result belongs beside the four homepage standards. Prompt provenance is a gate, not a substitute for visual QA.

## Historical Covers

Historical files are not silently rewritten by the new-post gate. Backfill them in explicit batches, review the generated images, update frontmatter provenance, run validation, then commit each bounded batch.
