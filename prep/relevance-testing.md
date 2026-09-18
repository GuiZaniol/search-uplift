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

## After tuning

To be filled in Block 2 and Block 3, same queries, same format.
