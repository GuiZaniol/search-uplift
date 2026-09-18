#!/usr/bin/env bash
# Runs one search and saves the full response to out/. Usage: scripts/03-search.sh "cyclone anayas"
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

QUERY="${1:-}"
SAFE=$(echo "${QUERY:-empty}" | tr ' /' '__')
curl -sS -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query" \
  -H "X-Algolia-API-Key: ${ALGOLIA_SEARCH_KEY}" \
  -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"${QUERY}\",\"hitsPerPage\":10}" > "out/search-${SAFE}.json"
echo "Saved out/search-${SAFE}.json"
