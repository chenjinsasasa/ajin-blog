#!/bin/sh
set -eu
ADMIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ADMIN_DIR"
.venv/bin/ruff check backend scripts/adminctl.py tests --exclude publication_status.py --select F,I
.venv/bin/python -m pytest tests -q
TMP_CONTRACT=$(mktemp)
trap 'rm -f "$TMP_CONTRACT"' EXIT
./adminctl openapi --file "$TMP_CONTRACT"
.venv/bin/python scripts/validate_api_docs.py "$TMP_CONTRACT" --strict
cmp docs/api/openapi.json "$TMP_CONTRACT"
npm --prefix frontend run build
