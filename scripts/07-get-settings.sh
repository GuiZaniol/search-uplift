#!/usr/bin/env bash
# Saves the index settings as they currently are on Algolia, so we can compare with config/settings.json
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
mkdir -p out
curl -sS "https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/settings" \
  -H "X-Algolia-API-Key: ${ALGOLIA_ADMIN_KEY}" \
  -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" > out/settings-live.json
echo "Saved out/settings-live.json"
