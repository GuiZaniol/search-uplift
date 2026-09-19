#!/usr/bin/env bash
# Runs the test query set against the current index and saves every response.
# Queries 1 to 12 are the original set (baseline, after, final).
# Queries 13 to 28 were added on Sept 19 to test the dashboard changes:
# the brazil/brasil synonym, stop and optional words, and the searchable attribute order.
# 15 filters to a single record. 16 to 19 override settings for that one request
# only, to isolate which setting handles "and". They use a placeholder optional word
# ("zzzz") instead of an empty list: in a first attempt, the empty list and the
# control both returned 13 hits, so it could not tell the settings apart.
# 19 is a second control that swaps English stop words for French ones.
# 16 to 19 all returned 13 hits, so 25 to 27 ask Algolia for its ranking info
# (getRankingInfo), which reports the parsed query and how many words matched,
# 27 checks that a made-up word does block results with the fallback off, and
# 28 checks whether the no-results fallback is what returns 508 hits for "steakhouse tx".
# Nothing here changes the index configuration.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
OUTDIR="${1:-baseline}"
mkdir -p "out/${OUTDIR}"

run () {
  local label="$1" query="$2" extra="${3:-}"
  curl -sS -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query" \
    -H "X-Algolia-API-Key: ${ALGOLIA_SEARCH_KEY}" \
    -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\",\"hitsPerPage\":10,\"facets\":[\"food_type\",\"price_range\",\"dining_style\"]${extra:+,$extra}}" \
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

# Synonym brazil = brasil
run 13-synonym           "brasil"
run 14-synonym-prefix    "braz"
run 15-prefix-berimbau   "braz" '"filters":"objectID:35521"'
# Stop words, optional words and "and": each run turns off the no-results fallback
run 16-and-stopwords     "mccormick and schmicks" '"removeWordsIfNoResults":"none","optionalWords":["zzzz"]'
run 17-and-optional      "mccormick and schmicks" '"removeWordsIfNoResults":"none","removeStopWords":false'
run 18-and-neither       "mccormick and schmicks" '"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["zzzz"]'
run 19-and-neither-fr    "mccormick and schmicks" '"removeWordsIfNoResults":"none","removeStopWords":["fr"],"optionalWords":["zzzz"]'
run 20-natural-phrase    "steakhouse in denver"
# Searchable attribute order
run 21-name-vs-city      "houston"
run 22-raw-cuisine       "steak denver"
run 23-state             "steakhouse tx"
run 24-dining-style      "fine dining denver"
# Diagnostics for "and"
run 25-and-rankinginfo   "mccormick and schmicks" '"getRankingInfo":true'
run 26-and-all-off-info  "mccormick and schmicks" '"getRankingInfo":true,"removeWordsIfNoResults":"none","removeStopWords":false,"optionalWords":["zzzz"]'
run 27-control-madeup    "mccormick qwxz schmicks" '"getRankingInfo":true,"removeWordsIfNoResults":"none"'
run 28-tx-fallback-off   "steakhouse tx" '"getRankingInfo":true,"removeWordsIfNoResults":"none"'
echo "Done. 28 responses in out/${OUTDIR}/"
