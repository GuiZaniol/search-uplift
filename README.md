# OpenTable restaurant search prototype

A search and discovery prototype for OpenTable, built on Algolia with the 5,000 restaurants from the assignment.

- **Live demo:** https://guizaniol.github.io/search-uplift/site/
- **Code:** https://github.com/GuiZaniol/search-uplift

## Summary

OpenTable wants more search and browsing sessions to end in a booking. Its discovery notes describe two diners: one who knows the restaurant and one who is exploring. This prototype shows what changes for each of them, on OpenTable's own restaurant data.

**Diners who know the restaurant find it on the first try.** Misspelled, run-together and partial names return the right restaurant ("benihanna", "meltingpot", "ruths"). A chain's locations appear as separate results, each labeled with its location, so the diner can tell them apart. When location does not separate them, the best rated comes first.

**Diners who are exploring can browse before they type.** The page opens on the top rated restaurants near them. Filters for cuisine, price, dining style and city narrow the list, and cuisines are grouped, so choosing Mexican also brings in Tex-Mex. On a phone, the filters sit behind one button.

**Results start local.** Every search is ranked by distance from the diner's approximate location, with no permission prompt. One tap switches to their exact position. Distance changes the order but never hides a result, so a search for a restaurant in another city still finds it.

**Most of the improvement came from reshaping the data.** Algolia handled typos and partial names with its defaults. What held search back was the data itself: chain and location in one name, 114 inconsistent cuisine labels, and two price fields that disagree on 220 restaurants. A repeatable preparation script fixes this before indexing, and it is what makes the ranking and filters work.

**Next: connect search to bookings.** The prototype shows better results. It does not yet show more bookings. The next phase adds click and conversion tracking, then tests each change against the current experience. The full list is under [Next steps](#next-steps), grouped into data transformation, index fine tuning and experimentation.

## How I built it

I built around the two diners in the discovery notes.

**The diner who knows the restaurant.** Names are hard to spell, and chains have several locations in one city. Algolia's defaults already handled the spelling: "benihanna", "meltingpot" and "ruths" all worked on the first run. What was missing was in the data. Brand and location were stuck together in one name string, and nothing ranked one location of a chain above another. I split the name into brand and location, added a quality score and used it as custom ranking. In testing, "cyclone anayas" went from five Houston locations in an order with no meaning to best rated first, each with its own label.

**The diner who is exploring.** Cuisine came as one text field with 114 values, some compound ("Mexican / Southwestern"), some duplicates ("Steak", "Steak House"). I rebuilt it as a list with parent groups, so Tex-Mex also counts as Mexican. Cuisine, price, dining style and city are filters. With no query, the page opens on the top rated restaurants near you, so it works as a browse screen before anyone types.

**Location** supports both diners. Details in [Location](#location).

**Scope.** I kept the build to what I can explain line by line. The front end is InstantSearch.js loaded from a CDN: three files, no build step, hosted on GitHub Pages. On a phone it switches to one column with the filters behind a button. I did not build on the provided starter files, which use Parcel 1 and Node 9 and an `index.js` that only imports the client and the helper; a plain page with nothing to compile was less to break on deploy day. Sorting, natural language search and click analytics are on the [next steps](#next-steps) list rather than half built.

## A note on the Algolia configuration

Before your September 18 email, I worked through the relevance decisions (searchable attributes, facets, custom ranking, no-results behavior) in discussion with Claude and applied them through the API with a script. After your note I removed that script. I did not re-enter those settings from scratch; I reviewed each one in the dashboard, I stand behind them, and I made my own changes there: reordered the searchable attributes, turned on English stop word removal, added optional words and a brazil/brasil synonym. The repo keeps a read-only export of the final settings in `config/index-settings.json`. My focus throughout was being able to explain why each setting is there and what it changed, which `prep/relevance-testing.md` documents with before and after results.

## Index configuration

Set by hand in the Algolia dashboard. Export in `config/index-settings.json`. Anything not listed here is Algolia's default.

- **Searchable attributes, in order:** `name, brand` / `cuisines, food_type_raw` / `city, neighborhood, area` / `dining_style` / `unordered(name)` / `unordered(cuisines)` / `unordered(city)`. A name match ranks above a cuisine match, and a cuisine match above a place. I set the order from using the live OpenTable site to reach specific restaurants and chain locations, such as Texas de Brazil (10 locations here). Search data would support a better informed order (next steps).
- **Facets:** `cuisines` and `city` (both searchable, since they have too many values for a plain list), `price_label`, `dining_style`, `neighborhood`. The page shows the first four as filters; `neighborhood` is declared but not shown yet.
- **Custom ranking:** `desc(quality_score)`, then `desc(reviews_count)`. Among equally relevant results, the better rated and better proven restaurant comes first. The ranking criteria order is Algolia's default: typo, geo, words, filters, proximity, attribute, exact, custom.
- **Typo tolerance:** default, one typo from 4 characters and two from 8. Typos are allowed on every searchable attribute, because no code-like field (zip code, phone) is on the index.
- **Stop words and optional words:** English stop words are removed from the query, and "and", "the", "of", "in", "at" are optional. A diner typing "steakhouse in denver" is not held to "in".
- **Synonym:** brazil = brasil. One record spells it Brasil (Berimbau Do Brasil) and 38 say Brazil.
- **No results:** `removeWordsIfNoResults: allOptional`. When the full query finds nothing, every word becomes optional: "vegan sushi burrito" returns sushi restaurants instead of an empty page. The same setting makes "steakhouse tx" return steakhouses from anywhere; details in the relevance note.
- **Highlighting and retrieval:** name, brand, location label and cuisines are highlighted. Only the fields the result card and the tests use are returned.
- **Location** is not an index setting. The page sends it with each query (next section).

## Location

Results are ranked by distance, and distance never hides a result.

- The page starts from your approximate location, which Algolia works out from the IP address of the request (`aroundLatLngViaIP`). No permission prompt before the first results.
- "Use my exact location" asks the browser. If you allow it, searches use your coordinates (`aroundLatLng`). If you say no, or the browser cannot tell, the approximate location stays and the page says so.
- Nothing after IP. Outside the US, you see the nearest US restaurants first.
- `aroundRadius: "all"`: distance reorders, it does not filter. Weston, Florida has 4 restaurants within 25 km. A radius would leave places like that nearly empty, and a search for a restaurant in another city would miss it.
- `aroundPrecision: 1000`: restaurants in the same 1 km band count as equally close, so the quality score still decides the order inside each band. Near Times Square, the first page then leads with Pazza Notte and Le Bernardin (4.7 stars from 4,232 reviews) instead of Bond 45, 25 m away. Without it, distance decides almost every order. The right band is likely different in Manhattan and in a suburb (next steps).
- Each card shows miles away, measured in the browser from your exact position, or from the approximate location Algolia returns with the results.
- Trade-off: geo ranks before custom ranking. Search for a chain from far away and the nearest location comes first, not the best rated. From Florida, "cyclone anayas" lists the Houston locations by distance.

Tests: `scripts/07-geo.sh`, responses in `out/geo/`, write-up in `prep/relevance-testing.md`.

## How I tested relevance

`prep/relevance-testing.md` has the full record: twelve queries run on the untuned index, after tuning and on the final configuration, then sixteen more for the September 19 dashboard changes, five for location, and thirteen that settled how optional words combine. Three examples:

- **"cyclone anayas"**: five locations in an order with no meaning (4.3, 3.0, 4.0, 4.3, 4.4 stars). Best first after the quality score.
- **"mccormick and schmicks"**: a break I caused. Naming the searchable attributes took away the only thing "and" had been matching (the price text "$30 and under"), and results dropped from 10 to 0. The note shows how it was found, how it was fixed, and a follow-up test that settled why "and" is not required: optional words sent with a request add to the index list rather than replace it.
- **"steakhouse"**: 421 hits led by names containing the word, while 123 records tagged "Steak" sat under a separate value. 507 after the cuisine rebuild.

## Assumptions about the data

- `objectID` is the same restaurant in both files. Every ID appears in both, and the merge script stops if one does not.
- A spaced dash in a name separates brand and location ("Cyclone Anaya's - Midtown"). True for 1,086 names. One known exception is left in place: "Star of Honolulu - Five Star".
- Where the price number and the price text disagree (220 records), the text is right, because it is what the diner sees.
- A rating from a few reviews says less than one from thousands. The quality score pulls each rating toward the dataset average (4.29) until the restaurant has enough reviews to speak for itself.
- Neighborhood equals city in 2,491 records. Left as delivered rather than guessed; the card shows the city once.
- Image and reservation links were not tested. Cards fall back to a grey placeholder when an image does not load.

## Run it yourself

Needs Node, curl and python3, plus an Algolia app.

```
cp .env.example .env              # add your app ID, search key and admin key
node scripts/01-merge.mjs         # data/records.json
node scripts/05-transform.mjs     # data/records.v2.json and data/batches/
./scripts/02-index.sh             # uploads the batches
```

The index configuration lives in the Algolia dashboard; `config/index-settings.json` has the values. For the site, put your app ID and search-only key in `site/app.js`, then run `cd site && python3 -m http.server 8000` and open http://localhost:8000. Browser location needs https or localhost.

## What each file does

Run order: `01` → `05` → `02`. `06` after each dashboard change. `03`, `04`, `07`, `08` for testing.

### Data

- **`data/raw/`**: the two source files, untouched.
- **`data/records.json`**: plain join. 5,000 records, 18 fields. Baseline shape.
- **`data/records.v2.json`**: reshaped records, 19 fields. What's on the index.
- **`data/batches/`**: upload payloads, 5 × 1,000 records.

### Scripts

- **`scripts/01-merge.mjs`**
  - Joins JSON, CSV on `objectID`.
  - `objectID` as text; stars, reviews as numbers.
  - Drops country, both phone fields, mobile reserve link.
  - Nothing else touched.
- **`scripts/05-transform.mjs`**
  - Name split: brand, location label.
  - Cuisines: compounds split, duplicates merged, parent added (Tex-Mex → Mexican).
  - One price: text wins; band 1 to 3 for sorting.
  - Quality score: rating weighted by review count.
  - Drops postal code, numeric price, state, payment options.
  - Writes `records.v2.json`, upload batches.
- **`scripts/02-index.sh`**
  - Uploads batches to Algolia.
  - `updateObject`: whole record replaced; reruns safe.
  - Admin key, `.env` only.
- **`scripts/06-export-settings.sh`**
  - Reads live dashboard settings.
  - Writes `config/index-settings.json`.
  - Read only; never writes to the index.
- **`scripts/03-search.sh`**
  - One query, full response saved to `out/`.
  - Search-only key: same view as the site.
  - Shows why a result matched.
- **`scripts/04-baseline.sh`**
  - Fixed test set, 28 queries.
  - 1 to 12: original failure modes. 13 to 24: Sept 19 dashboard changes. 25 to 28: diagnostics.
  - One output folder per run: `baseline`, `after`, `final`.
- **`scripts/07-geo.sh`**
  - Location tests, same parameters as the site.
  - Times Square, Weston; 1 km bands vs default 10 m; chain from Times Square; IP fallback.
  - Distance per hit from Algolia's ranking info.
- **`scripts/08-optional-words.sh`**
  - Settles why "and" was not required with everything off.
  - Same query, 13 middle words; everything off per request.
  - Result: request optional words add to the index list, not replace it.

### Configuration

- **`config/index-settings.json`**: export of the dashboard settings. Read only.
- **`config/README.md`**: says so.

### Site

- **`index.html`** (repo root), **`.nojekyll`**: GitHub Pages serves the repo root; this page forwards to `site/`.
- **`site/index.html`**: page shell. Loads InstantSearch, Algolia lite client from CDN.
- **`site/app.js`**
  - Search-only key: safe in public.
  - Search box, result count, filters (cuisine, price, dining style, city), active filters, clear, results, pagination.
  - Cuisine, city lists: capped, searchable.
  - Query, filters in the URL: shareable searches.
  - Empty query: "Top rated near you": nearest band first, custom ranking inside it.
  - No results: message, way back.
  - Dead 2015 image links: grey placeholder.
  - Phone: filters behind a button.
  - Location: IP first, no prompt. Button for exact position; refusal keeps IP.
  - Radius all: distance reorders, never hides. 1 km bands: rating decides inside a band.
  - Miles on each card.
  - Neighborhood hidden when it repeats the city.
- **`site/style.css`**: two columns; one column under 760px.

### Testing

- **`prep/relevance-testing.md`**: baseline, after, final runs. Fixes, failed experiment, corrections.
- **`out/baseline/`**: 12 responses, untuned index.
- **`out/final/`**: 28 responses, final configuration.
- **`out/geo/`**: 5 responses, location tests.
- **`out/optional-words/`**: 13 responses, how optional words combine.

## The data

### What came in

Two files describing the same 5,000 restaurants, joined on `objectID` (every ID is in both files). 22 distinct fields in total.

**`restaurants_list.json`**, 15 fields: the listing.
`objectID`, `name`, `address`, `city`, `state`, `postal_code`, `country`, `area`, `_geoloc`, `phone`, `price`, `payment_options`, `image_url`, `reserve_url`, `mobile_reserve_url`.
Example: "Town", 348 Main Street, Carbondale, CO 81623, area "Denver / Colorado", price 2, with coordinates.

**`restaurants_info.csv`**, 8 fields, semicolon separated: the profile.
`objectID`, `food_type`, `stars_count`, `reviews_count`, `neighborhood`, `phone_number`, `price_range`, `dining_style`.
Example: Steak, 4.2 stars from 204 reviews, Pepper Pike, "$31 to $50", Fine Dining.

### What goes on the index

19 fields per record. `scripts/01-merge.mjs` joins the two files, `scripts/05-transform.mjs` reshapes the result.

| Field | From | Used for |
|---|---|---|
| `name` | list | search (the card shows `brand` and `location_label` instead) |
| `brand` | split from `name` | search, card title, groups a chain's locations ("Cyclone Anaya's") |
| `location_label` | split from `name` | result card ("Midtown") |
| `cuisines` | `food_type`, split and grouped | search, filter, result card |
| `food_type_raw` | `food_type`, renamed | search (the original value, kept next to the cleaned one) |
| `city`, `neighborhood`, `area` | list, info, list | search; city and neighborhood are also filters and appear on the card |
| `dining_style` | info | search, filter |
| `price_label` | `price_range`, renamed | filter, result card |
| `price_band` | derived from `price_label` (1 to 3) | sorting, on the next-steps list |
| `rating` | `stars_count`, renamed | result card |
| `reviews_count` | info | ranking tie breaker, result card |
| `quality_score` | `rating` blended with `reviews_count` | ranking |
| `_geoloc` | list | distance |
| `image_url`, `reserve_url` | list | result card |
| `address` | list | returned with each hit |

### What was left out, and why

Eight source fields are not on the index. Records carry what search, filters, ranking or the result card use.

| Field | Why it was left out |
|---|---|
| `country` | All 5,000 records say "US". One value carries no information. |
| `phone`, `phone_number` | The two files disagree on 160 records, and the result card shows no phone. |
| `mobile_reserve_url` | Points to the same restaurant ID as `reserve_url`, which the card's Reserve link uses. Both come from a 2015 scrape and are untested. |
| `price` | The integer disagrees with `price_range` on 220 records. The text is what the diner sees, so it wins; `price_band` is derived from it. |
| `postal_code` | 1,614 distinct values, not searched, filtered or shown. Location works from coordinates plus city, neighborhood and area. |
| `state` | Not searched, filtered or shown. City, neighborhood, area and coordinates carry location. |
| `payment_options` | Not searched, filtered or shown. |

**On zip codes.** Adding `postal_code` back is one line in the transform and a reindex. Searching it well is the harder part. Default typo tolerance treats a zip code like a word, and a typo in the first digits points to a different part of the country. A typo in the last two or three digits usually still lands nearby, so allowing typos only there would make sense. That sounded complicated for this prototype, though not impossible.

## Next steps

Grouped by where the work sits. Each item says what it would change for OpenTable.

### Data transformation

- **Chain and location as source fields.** The prototype splits them out of the restaurant name, which works for 1,086 names with one known exception. A structured field from OpenTable's own systems removes the guesswork.
- **Richer discovery attributes.** Occasion, atmosphere, features such as outdoor seating or private dining, opening hours and table availability. This dataset has none of them, and they are what exploring diners would filter and browse by.
- **Fresh images and reservation links.** The ones here come from a 2015 scrape and were not tested. Cards fall back to a placeholder today.
- **Better neighborhood data.** In 2,491 records the neighborhood just repeats the city, which limits browsing by area.
- **Zip code and phone search.** Both were left out. Adding them back needs typo tolerance limited on those fields, since a wrong digit points to a different area.
- **A pipeline instead of a one-off script.** Run the preparation on a schedule and send only what changed (partial updates), so new restaurants, closures and rating changes reach search quickly.

### Index fine tuning

- **Searchable attribute order from real search data.** I set the order by judgment, from using the live OpenTable site. Query and click data would show which fields diners actually match on.
- **Language and spelling variants at scale.** brazil = brasil is one synonym. Cuisines and restaurant names come from many languages, so this needs a maintained synonym list.
- **A maintained stop word and optional word list,** much larger than the five words I added, reviewed as new queries come in.
- **State search.** "steakhouse tx" currently returns steakhouses from anywhere, because state is not on the record. Bringing state back as a filter, with abbreviations as synonyms (tx = texas), would fix it. It needs testing, since "texas" also appears in names such as Texas de Brazil.
- **Location precision that changes with distance.** 1 km bands close by and a wide band far away, so a chain searched from another state is ordered by rating again instead of distance.
- **Sorting by price and rating,** named in the discovery notes. Replica indices would support it; `price_band` is already on every record.
- **Neighborhood as a filter.** It is already set up for filtering in the index; the page does not show it yet.

### Experimentation

- **Measure search to booking first.** Send click and conversion events from day one, and set a baseline before changing anything. This is the metric OpenTable named.
- **A/B test the relevance changes** against the current experience, one at a time: the quality score, location precision, the no-results fallback.
- **Tune the quality score against bookings.** Today a restaurant's own rating carries half the weight at 50 reviews, and more as reviews grow. Booking data would show the right balance.
- **Review failing searches every week.** Searches with no results or no clicks feed the synonym and stop word lists above.
- **Help exploring diners start.** Popular searches and query suggestions on the empty page, tested against the current browse screen.
- **Natural language search** ("cheap sushi near me tonight"), tested on a slice of traffic before a wider rollout.
- **Personalization,** once there is enough click and booking history to learn each diner's cuisine and price preferences.
