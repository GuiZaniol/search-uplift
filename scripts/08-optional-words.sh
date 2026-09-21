#!/usr/bin/env bash
# Settles why "and" was not required in queries 18, 19 and 26, where stop word removal,
# the no-results fallback and the optional words were all switched off for the request.
# Hypothesis: optional words sent with a request are added to the index's own list
# (and, the, of, in, at) instead of replacing it, so "and" stayed optional.
# Test: the same query with different middle words, everything switched off for the request.
#   34 to 37: words on the index list (and, of, at, in). Expect 13 hits, 2 of 3 words matched.
#   38 to 41: English stop words not on the list (for, with, on, by). Expect 0.
#   42, 43: a real word from other records (steak), then the same word made optional by the request.
#   44, 45: the request makes "for" optional; "and" should still be optional in that same request.
#   46: "the", which also matches "The Fountains" in one location name.
# Nothing here changes the index configuration.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
OUTDIR="${1:-optional-words}"
mkdir -p "out/${OUTDIR}"

run () {
  local label="$1" query="$2" extra="$3"
  curl -sS -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query" \
    -H "X-Algolia-API-Key: ${ALGOLIA_SEARCH_KEY}" \
    -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\",\"hitsPerPage\":10,\"getRankingInfo\":true,${extra}}" \
    > "out/${OUTDIR}/${label}.json"
  printf "%-24s saved\n" "$label"
}

# Everything off for the request: no fallback, no stop word removal, a placeholder optional word.
OFF='"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["zzzz"]'

run 34-and-all-off    "mccormick and schmicks"   "$OFF"
run 35-of-all-off     "mccormick of schmicks"    "$OFF"
run 36-at-all-off     "mccormick at schmicks"    "$OFF"
run 37-in-all-off     "mccormick in schmicks"    "$OFF"
run 38-for-all-off    "mccormick for schmicks"   "$OFF"
run 39-with-all-off   "mccormick with schmicks"  "$OFF"
run 40-on-all-off     "mccormick on schmicks"    "$OFF"
run 41-by-all-off     "mccormick by schmicks"    "$OFF"
run 42-steak-all-off  "mccormick steak schmicks" "$OFF"
run 43-steak-optional "mccormick steak schmicks" '"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["steak"]'
run 44-for-optional   "mccormick for schmicks"   '"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["for"]'
run 45-and-with-for   "mccormick and schmicks"   '"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["for"]'
run 46-the-all-off    "mccormick the schmicks"   "$OFF"
echo "Done. 13 responses in out/${OUTDIR}/"
