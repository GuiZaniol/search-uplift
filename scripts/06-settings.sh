#!/usr/bin/env bash
# Applies config/settings.json to the index. Settings live in the repo, not in the dashboard.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

curl -sS -X PUT "https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/settings" \
  -H "X-Algolia-API-Key: ${ALGOLIA_ADMIN_KEY}" \
  -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
  -H "Content-Type: application/json" \
  --data-binary @config/settings.json
printf "\nSettings applied. Wait a few seconds, then re-run the query set.\n"
