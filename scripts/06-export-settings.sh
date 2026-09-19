#!/usr/bin/env bash
# Exports the index settings exactly as they are on Algolia into config/index-settings.json.
# The configuration itself is done by hand in the Algolia dashboard. This script only reads it
# back so the settings are versioned in the repo and reviewable in a diff.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
mkdir -p config
curl -sS "https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/settings" \
  -H "X-Algolia-API-Key: ${ALGOLIA_ADMIN_KEY}" \
  -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
  | python3 -m json.tool > config/index-settings.json
echo "Saved config/index-settings.json"
