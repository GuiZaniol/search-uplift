# Relevance testing

Same twelve queries, run three times: before tuning, after tuning, and on the final configuration. Raw responses for the baseline and final runs are in `out/baseline/` and `out/final/`. The after run was kept locally and is not in the repo.

## Baseline: 2026-09-18

Index: the plain join of the two source files. No cleaning, no settings configured. Every attribute searchable by default, no faceting, no custom ranking. All twelve queries returned in 1 ms.

### What already worked with no configuration

| Query | Result |
|---|---|
| "benihanna" (misspelled) | 24 hits, all Benihana locations |
| "meltingpot" (concatenated) | 26 hits, all The Melting Pot |
| "ruths" (partial) | 35 hits, Ruth's Chris at the top |
| "mccormick and schmicks" (punctuation) | 10 hits, matched the ampersand and the apostrophe |
| "ruths chris denver" (chain plus location) | narrowed to exactly 1 |

Typo tolerance, word concatenation, prefix matching and punctuation handling are on by default. Nothing to fix.

### What was broken

**1. Result order inside a chain is meaningless.** "cyclone anayas" returned the five Houston locations in this order: 4.3 (23 reviews), 3.0 (14), 4.0 (22), 4.3 (40), 4.4 (22). The worst location came second and the best came last. All five match the text equally, and nothing breaks the tie.
Diagnosis: no custom ranking configured, and no quality signal exists in the record.
Fix planned: derive a rating signal that blends stars with review count, and set it as custom ranking.

**2. Nothing distinguishes the five locations.** They differ only by a suffix inside the name string, one of which has a double space ("Cyclone Anaya's -  Durham"). There is no separate field to show as a label or to filter on.
Diagnosis: brand and location are concatenated in `name`.
Fix planned: derive `brand` and `location_label` in the preparation script.

**3. Filtering is impossible.** The queries asked for facet counts on food_type, price_range and dining_style. Algolia returned an empty facets object.
Diagnosis: `attributesForFaceting` has never been configured, so no attribute can be refined on.
Fix planned: declare the facets in the settings file.

**4. Cuisine search is incomplete and noisy.** "steakhouse" returned 421 hits led by restaurants with the word in their name ("Steakhouse 85", "Steakhouse at the Spa"), while 123 records tagged "Steak" are a separate value and 7 of the 24 Houston steak places sit under it.
Diagnosis: 114 raw `food_type` values with near duplicates, and cuisine competing with names in an unordered searchable attribute list.
Fix planned: map cuisine to a clean taxonomy, and set an explicit searchable attribute order so a name match outranks a cuisine match.

**5. The empty query is not an experience.** It returned all 5,000 records in what looks like index order: three San Diego restaurants, then Indianapolis, then Forest Hills.
Diagnosis: no custom ranking and no browse design.
Fix planned: custom ranking plus discovery entry points on the empty state.

**6. Zero results is a dead end.** "vegan sushi burrito" returned 0 hits with no recovery path.
Diagnosis: expected for this dataset, but the UI has nothing to offer.
Fix planned: a zero results state that suggests a way back.

### Still to check
* Junk attributes are searchable by default, including phone numbers and reservation URLs. Confirm and exclude.
* Whether "tex-mex" should return the 5 Tex-Mex records only, or also the 90 Mexican and 36 Mexican / Southwestern records.

## After tuning: 2026-09-18

Same twelve queries, run against the reshaped records and the index configuration set in the Algolia dashboard (exported to `config/index-settings.json`). Raw responses were saved locally in `out/after/` (not committed). Every query still returns in about 1 ms.

### Fix 1: ranking inside a chain

Query "cyclone anayas". Before, the five Houston locations came back in an order with no meaning: 4.3, then 3.0, then 4.0, then 4.3, then 4.4. After, they come back best first: Midtown 4.4, CityCentre 4.3, Rice Village 4.3, Durham 4.0, Woodway 3.0.

What changed: a `quality_score` derived in the preparation script (a Bayesian average that pulls a rating toward the dataset mean of 4.29 until a restaurant has enough reviews), plus `customRanking: ["desc(quality_score)", "desc(reviews_count)"]`. Scores are rounded to two decimals so later criteria still matter.

Same effect on "ruths" (Baton Rouge 4.8 now leads) and on the empty query, which went from three arbitrary San Diego restaurants to Russell's Steaks at 4.9 from 2,512 reviews.

### Fix 2: telling locations apart, and a usable cuisine filter

Before, the five Cyclone Anaya's differed only by a suffix inside the name, one of which had a double space, and no attribute was facetable at all: asking for facet counts returned an empty object.

After, each result shows a brand and a separate location label, and `attributesForFaceting` declares cuisines (searchable), price, dining style, city and neighborhood. Cuisine grouping also made the filter behave: Mexican went from 90 to 138 records because Tex-Mex now carries the Mexican group, and "steakhouse" went from 421 to 507 hits because Steak and Brazilian Steakhouse join Steakhouse.

Honest note: splitting compound values moved the distinct cuisine count from 114 to 115, so the count did not go down. What improved is usability: the top 20 values now cover 85 percent of records, and the UI shows the top values with a search box rather than all of them.

### Fix 3: a break I caused, and how it was found

Query "mccormick and schmicks". Before: 10 hits. After the first settings change: **0 hits**.

Cause: in the baseline every attribute was searchable, including `price_range`, whose values read "$30 and under". The word "and" in the query had been matching the price text. Naming the searchable attributes removed that accidental match, and since all query words must match, the result set collapsed.

First attempt: `optionalWords: ["and", "the", "of"]`. Confirmed live on the index by reading the settings back, and it did not fix the query. Two control queries isolated the cause: "mccormick schmicks" returned 13 hits and "schmicks" returned 13, so the apostrophe and ampersand were never the problem, only the word "and".

Second attempt: `removeWordsIfNoResults: "allOptional"`, which relaxes matching only when a query would otherwise return nothing. Result: 13 hits, led by Las Vegas 4.4 from 1,481 reviews. The `optionalWords` setting was removed rather than left in the file doing nothing.

### Unchanged on purpose

Typo tolerance, word concatenation and prefix matching were already right by default and were not touched: "benihanna" still returns 24 Benihana locations, "meltingpot" still returns 26 Melting Pots, "ruths chris denver" still narrows to exactly 1.

"texas" narrowed from 23 hits to 18 because addresses and phone numbers are no longer searchable. Fewer hits, all of them restaurants rather than street names.

"vegan sushi burrito" still returns nothing, which is honest for this dataset. The UI now answers with a recovery message instead of a blank screen.

## Final configuration: 2026-09-19

Same twelve queries, run against the configuration as I adjusted it in the Algolia dashboard on September 19: a new searchable attribute order, English stop word removal, optional words (and, the, of, in, at) and a brazil/brasil synonym. Export in `config/index-settings.json`, raw responses in `out/final/`.

### What stayed the same

The ten queries that returned results in the after run are unchanged: same hit counts, same top five, same order. That covers "cyclone anayas", "benihanna", "meltingpot", "ruths", "ruths chris", "ruths chris denver", "tex-mex", "steakhouse", "texas" and the empty query.

### What differs from out/after

* **"mccormick and schmicks": 13 hits, led by Las Vegas.** The after run was captured before Fix 3, so `out/after/` still shows 0 hits. The final run matches the Fix 3 result. Two settings could drop "and" from this query: `removeWordsIfNoResults` from Fix 3, and English stop word removal. Query 25 later showed it is stop word removal (see the McCormick example below).
* **"vegan sushi burrito": 194 hits, every one matching only "sushi".** This comes from `removeWordsIfNoResults: "allOptional"` (Fix 3), which makes every word optional when the full query finds nothing. Neither "vegan" nor "burrito" is a stop word or an optional word.

Fix 3 removed `optionalWords` because it did not fix "mccormick and schmicks". It is back on the index as part of the September 19 changes.

### Correction to the after section

"Unchanged on purpose" says "vegan sushi burrito" still returns nothing and the UI answers with a recovery message. That matches `out/after/`, which was captured before Fix 3. With Fix 3 in place the query returns 194 sushi restaurants, and the recovery message only appears when no word in the query matches anything.

### What this run does not show

None of the twelve queries was written for the September 19 changes: the synonym, stop words other than "and", or the new searchable attribute order. The run shows those changes left all twelve results as they were; it does not show what the changes do.

## Tests for the September 19 changes

Queries 13 to 24 in `scripts/04-baseline.sh`, written for the three changes above and run on September 19 after the reindex that dropped `state` and `payment_options` (decision 22). Responses in `out/final/`.

### Synonym: brazil = brasil (decision 19)

* **"brasil": 43 hits.** The top five are Texas de Brazil locations and Berimbau Do Brasil is sixth. 38 records have a Brazil or Brasil word in a searchable field; the other hits are most likely typo matches, such as the three records containing "Basil", one letter away.
* **"braz": 90 hits,** led by Texas de Brazil and Fogo de Chao Brazilian Steakhouse. As the last word, "braz" is matched as the start of a longer word, with one typo allowed, which likely brings in words such as "Brasserie" (16 records).
* **"braz", filtered to Berimbau Do Brasil (query 15): 1 hit.** The record is found through its cuisine, "Brazilian". The highlight marks the cuisine only, not "Brasil" in the name. This matches what decision 19 noticed: "braz" does not reach the word "brasil".

### Stop words (decision 20)

Stop words are very common words ("the", "in", "of") that appear in many records and say little about what the diner wants. Removing them from the query means a diner who types a natural phrase is not held to every small word in it.

* **"steakhouse in denver": 46 hits,** exactly the number of records that have a Steakhouse word and a Denver word (city or area). "in" is not required. The top four are steakhouses in Denver; Twin Owls Steakhouse in Estes Park (area "Denver / Colorado") is fifth.

### Searchable attribute order (decision 21)

Facts only; the reasoning for the order is decision 21.

* **"houston": 232 hits.** All top ten have Houston in the name and are in the city of Houston. For scale: 175 records have the city Houston and 231 have the area Houston.
* **"steak denver": 14 hits,** led by Ruth's Chris Steak House, Denver. Pepper Tree Restaurant (Colorado Springs) is sixth: it matches through `food_type_raw` "Steak" and its area "Denver / Colorado". Its card highlights nothing, because neither field is highlighted.
* **"fine dining denver": 46 hits.** The top four are fine dining restaurants in Denver. Carlos' Bistro (Colorado Springs) is fifth, matched on dining style and area.
* **"steakhouse tx": 508 hits,** almost all steakhouses from anywhere. "tx" matches no state, since `state` is no longer on the record; the only word starting with "tx" in the data is the restaurant Txikito. With the no-results fallback switched off (query 28) it returns 0, so the 508 hits come from `removeWordsIfNoResults: "allOptional"`: the full query finds nothing, so every word becomes optional.

### How "and" is handled: the McCormick example

The query "mccormick and schmicks" has been in the test set from the start. The restaurants are named "McCormick & Schmick's", with an ampersand, so the word "and" appears in none of their searchable fields.

**How it got here**

1. Baseline, no configuration: 10 hits, but only because "and" matched the price text "$30 and under", which was searchable.
2. After naming the searchable attributes: 0 hits. Every query word had to match, and "and" matched nothing.
3. Fix 3: optional words (and, the, of) did not bring the results back at the time. The no-results fallback did: 13 hits.
4. September 19 (decision 20): English stop word removal on, and optional words back on the index.

**What it does today** (queries 25 to 28, with Algolia's ranking info turned on)

* **As configured, stop word removal handles it.** Algolia reports the parsed query as "mccormick schmicks": "and" is taken out before matching, so it is on Algolia's English stop word list. The two remaining words match side by side in the name, and all 13 locations come back. The fallback is not involved.
* **A word that is not a stop word still blocks.** "mccormick qwxz schmicks" with the fallback off returns 0 (query 27).
* **The fallback is what rescues "steakhouse tx"** (query 28, above), not this query.

**Settled: September 21**

Queries 18, 19 and 26 tried to switch optional words off for one request by sending a placeholder list. That assumption was wrong. Optional words sent with a request are added to the index's own list (and, the, of, in, at), not used in its place. So "and" stayed optional from the index list, which is why it did not block.

The test: queries 34 to 46 in `scripts/08-optional-words.sh`, responses in `out/optional-words/`. Same query, a different middle word each time, with stop word removal, the no-results fallback and the request's optional words all switched off.

* **and, of, at, in** (on the index list): 13 hits each, 2 of 3 words matched.
* **for, with, on, by** (English stop words, not on the list): 0 hits each.
* **steak** (a word found in other records): 0 hits. Made optional by the request: 13.
* **for, made optional by the request:** 13 hits. In that same request, "and" is still optional: 13. Both lists apply.
* **the:** 13 hits, all 3 words matched on the first result, the Roseville location "The Fountains". An optional word still counts toward ranking when it does match.

Every optional word that did not match shows the same ranking info: 2 words matched, proximity 9.

What it means: an optional word set on the index cannot be switched off from a single request; only the index list can. I did not find this stated in Algolia's documentation and would confirm it with the Algolia team.

## Location: 2026-09-21

Five queries in `scripts/07-geo.sh`, sent with the same location parameters as the site: `aroundRadius: "all"` and `aroundPrecision: 1000`. Responses in `out/geo/`. Algolia's ranking info reports each hit's distance in units of the precision, so with 1,000 it reads in kilometers. Why these settings: the Location section of the README.

### Dense area: Times Square, empty query (query 29)

All 5,000 restaurants come back, nearest band first. The whole first page sits in the first band (within 1 km) and is ordered by quality score: Pazza Notte 4.83, Le Bernardin 4.7 from 4,232 reviews, PizzArte, Restaurant Soba Nippon, Trattoria Dell'Arte.

### What the 1 km bands change (query 31)

The same query without `aroundPrecision`. Distance alone decides the order: Bond 45 at 25 m, Crossroads American Kitchen at 45 m, O'Lunney's Times Square Pub at 110 m. O'Brien's Irish Pub (3.5 stars from 61 reviews) is fifth. Le Bernardin is not on the first page. The response reports a precision of 1 when the parameter is not sent; Algolia's documentation lists 10 m as the default. At these distances the order is the same either way.

### Sparse area: Weston, Florida, empty query (query 30)

All 5,000 come back. Four restaurants are within 25 km: Ceviche Arigato (2 km), Brazaviva Churrascaria in Sunrise (8 km), The Melting Pot in Cooper City (10 km) and Mazza Mediterranean Cuisine in Pembroke Pines (11 km). The page continues with Fort Lauderdale and Hollywood at 25 to 27 km. With a 25 km radius, this diner would see four results.

### A chain from Times Square: "texas de brazil" (query 32)

10 hits, one per location, nearest first: Yonkers (24 km), Syracuse (314 km), Pittsburgh, Columbus, Memphis, then Addison, Dallas, Houston, San Antonio and Denver. There is no Texas de Brazil in New York City in this dataset. Distance outranks quality here: Addison, the best rated location (4.7), is sixth.

### No shared location: the IP fallback (query 33)

`aroundLatLngViaIP: true`, sent from my Terminal on the same connection as my browser. Algolia placed the request at 26.1101,-80.4244, about 3 km from the Weston point in query 30, and returns that location in the response (`aroundLatLng`). The site uses it to show miles on each card. The first page matches query 30 apart from small shifts from the different center: NYY Steak in Coconut Creek appears at 29 km and Fascino's drops off.

### What this shows, and a trade-off

Geo ranks before custom ranking. That is what the diner at Times Square wants, and it also means a chain searched from far away is listed nearest first rather than best first: from Florida, "cyclone anayas" lists the Houston locations by distance, not in the quality order shown in Fix 1. `aroundPrecision` also accepts a list of ranges, so precision can widen with distance (next steps in the README).

