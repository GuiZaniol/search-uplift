#!/usr/bin/env bash
# Uploads data/batches/*.json to the Algolia index. Run this from Terminal on your Mac.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

if [ -z "${ALGOLIA_ADMIN_KEY:-}" ]; then
  echo "ALGOLIA_ADMIN_KEY is empty in .env. Paste your Admin API key there first."
  exit 1
fi

for f in data/batches/batch-*.json; do
  printf "Uploading %s ... " "$f"
  curl -sS -X POST "https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch" \
    -H "X-Algolia-API-Key: ${ALGOLIA_ADMIN_KEY}" \
    -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
    -H "Content-Type: application/json" \
    --data-binary "@${f}"
  printf "\n"
done
echo "Done. Check the index in the Algolia dashboard."
