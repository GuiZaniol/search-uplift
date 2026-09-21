#!/usr/bin/env bash
# Tests location-aware ranking with the same parameters the site sends:
# aroundRadius "all" (distance reorders, never hides) and aroundPrecision 1000 (1 km bands).
# 29 and 30: empty query in a dense area (Times Square) and a sparse one (Weston, FL).
# 31: the same Times Square browse with the default 10 m precision, to show what the bands change.
# 32: a chain from Times Square: which Texas de Brazil comes first.
# 33: the fallback when the diner does not share a location: Algolia locates the IP of
#     the request (this Terminal, the same as a browser on this connection).
# getRankingInfo adds each hit's distance from the center (geoDistance, in meters).
# Nothing here changes the index configuration.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
OUTDIR="${1:-geo}"
mkdir -p "out/${OUTDIR}"

TIMES_SQUARE="40.7580,-73.9855"
WESTON="26.1003,-80.3998"
BANDS='"aroundRadius":"all","aroundPrecision":1000,"getRankingInfo":true'

run () {
  local label="$1" query="$2" extra="$3"
  curl -sS -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query" \
    -H "X-Algolia-API-Key: ${ALGOLIA_SEARCH_KEY}" \
    -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\",\"hitsPerPage\":10,${extra}}" \
    > "out/${OUTDIR}/${label}.json"
  printf "%-26s saved\n" "$label"
}

run 29-browse-times-square ""                "\"aroundLatLng\":\"${TIMES_SQUARE}\",${BANDS}"
run 30-browse-weston       ""                "\"aroundLatLng\":\"${WESTON}\",${BANDS}"
run 31-times-square-10m    ""                "\"aroundLatLng\":\"${TIMES_SQUARE}\",\"aroundRadius\":\"all\",\"getRankingInfo\":true"
run 32-chain-times-square  "texas de brazil" "\"aroundLatLng\":\"${TIMES_SQUARE}\",${BANDS}"
run 33-via-ip              ""                "\"aroundLatLngViaIP\":true,${BANDS}"
echo "Done. 5 responses in out/${OUTDIR}/"
