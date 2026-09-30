# Third-party source

Frontend components and theme adapted from https://github.com/satnaing/shadcn-admin at commit `e16c87f213a5ba5e45964e9b67c792105ec74d26`, retrieved 2026-09-30. MIT copyright retained in LICENSE.shadcn-admin.

Imported source: src/components/ui/{button,badge,input,table,tabs,dialog,sidebar,sheet,separator,skeleton,tooltip,textarea,label}.tsx, src/hooks/use-mobile.tsx, src/styles/{index,theme}.css. Local changes: system fonts, Chinese business layout, independent API and runtime. No Clerk, demo data, chat, sales, external analytics or remote fonts. Dependencies are pinned in frontend/package-lock.json.

The existing read-only publication verifier is copied into backend/publication_status.py to preserve its ledger/receipt validation semantics; source: /Users/chenjin/.openclaw/workspace/scripts/blog_publish_status.py. Its digest is recorded below. No production executor is copied or invoked.

Verifier SHA256: `addcd36c56f33f9d939ea1426782cde85b5f5269fe6931cb154fc981050bdcdb`
