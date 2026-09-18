#!/usr/bin/env bash
# Runs the test query set against the current index and saves every response.
# This captures the "before" for the relevance testing note.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
OUTDIR="${1:-baseline}"
mkdir -p "out/${OUTDIR}"

run () {
  local label="$1" query="$2"
  curl -sS -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query" \
    -H "X-Algolia-API-Key: ${ALGOLIA_SEARCH_KEY}" \
    -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\",\"hitsPerPage\":10,\"facets\":[\"food_type\",\"price_range\",\"dining_style\"]}" \
    > "out/${OUTDIR}/${label}.json"
  printf "%-22s saved\n" "$label"
}

run 01-known-item        "cyclone anayas"
run 02-misspelled        "benihanna"
run 03-concatenated      "meltingpot"
run 04-partial           "ruths"
run 05-chain-no-location "ruths chris"
run 06-chain-location    "ruths chris denver"
run 07-punctuation       "mccormick and schmicks"
run 08-cuisine           "tex-mex"
run 09-cuisine-broad     "steakhouse"
run 10-ambiguous         "texas"
run 11-empty             ""
run 12-zero-results      "vegan sushi burrito"
echo "Done. 12 responses in out/${OUTDIR}/"
