# Relevance testing

Same twelve queries, run before and after tuning. Raw responses are in `out/baseline/`.

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

Same twelve queries, run against the reshaped records and the index configuration set in the Algolia dashboard (exported to `config/index-settings.json`). Raw responses are in `out/after/`. Every query still returns in about 1 ms.

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
