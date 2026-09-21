// Block 2: turn the raw join into records shaped around what a diner does.
// Every derived field exists because a baseline query was bad without it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const raw = JSON.parse(readFileSync('data/records.json', 'utf8'));

// 1. Brand and location. 1,086 names carry a location after a spaced dash.
//    Assumption: the text after the first spaced dash is a location.
//    Known exception: "Star of Honolulu - Five Star" is a concept, not a place.
const SEPARATOR = /\s+[-\u2013]\s+/; // a hyphen, or the longer dash character (U+2013) some names use
function splitName(name) {
  const clean = name.replace(/\s+/g, ' ').trim();
  const match = clean.split(SEPARATOR);
  if (match.length < 2) return { brand: clean, location_label: '' };
  const brand = match[0].trim();
  const location_label = match.slice(1).join(' ').trim();
  return { brand, location_label };
}

// 2. Cuisine. 114 raw values, some compound, some near duplicates.
//    Compounds are split, then a broader group is added so "Mexican" also
//    finds Tex-Mex, and "Japanese" also finds Sushi.
const RENAME = { 'Steak': 'Steakhouse', 'Steak House': 'Steakhouse' };
const GROUPS = {
  'Tex-Mex': 'Mexican',
  'Contemporary Mexican': 'Mexican',
  'Traditional Mexican': 'Mexican',
  'Regional Mexican': 'Mexican',
  'Sushi': 'Japanese',
  'Contemporary American': 'American',
  'Californian': 'American',
  'Brazilian Steakhouse': 'Steakhouse',
  'Contemporary French': 'French',
  'Contemporary Italian': 'Italian',
  'Southern': 'American',
};
function cuisines(foodType) {
  const parts = foodType.split(/[/,]/).map((s) => s.trim()).filter(Boolean);
  const out = new Set();
  for (const part of parts) {
    const value = RENAME[part] || part;
    out.add(value);
    if (GROUPS[value]) out.add(GROUPS[value]);
  }
  return [...out];
}

// 3. Price. The integer and the text field disagree on 220 records.
//    The text field is what the diner sees, so it wins. The band is for sorting.
const BANDS = { '$30 and under': 1, '$31 to $50': 2, '$50 and over': 3 };

// 4. Quality. Stars alone put a 5.0 from two reviews above a landmark.
//    Bayesian average: pull each rating towards the global mean until a
//    restaurant has enough reviews to speak for itself.
const MIN_REVIEWS = 50;
const globalMean = raw.reduce((sum, r) => sum + r.stars_count, 0) / raw.length;
function qualityScore(stars, reviews) {
  const score =
    (reviews / (reviews + MIN_REVIEWS)) * stars +
    (MIN_REVIEWS / (reviews + MIN_REVIEWS)) * globalMean;
  return Math.round(score * 100) / 100; // rounded so later criteria still matter
}

// 5. Fields left out. postal_code and the integer price are not carried over.
//    state and payment_options were dropped on Sept 19 (decision 22): once state
//    stopped being searchable, neither was searched, filtered, ranked, returned or shown.
const records = raw.map((r) => {
  const { brand, location_label } = splitName(r.name);
  return {
    objectID: r.objectID,
    name: r.name.replace(/\s+/g, ' ').trim(),
    brand,
    location_label,
    cuisines: cuisines(r.food_type),
    food_type_raw: r.food_type,
    city: r.city,
    neighborhood: r.neighborhood,
    area: r.area,
    address: r.address,
    _geoloc: r._geoloc,
    dining_style: r.dining_style,
    price_label: r.price_range,
    price_band: BANDS[r.price_range] ?? null,
    rating: r.stars_count,
    reviews_count: r.reviews_count,
    quality_score: qualityScore(r.stars_count, r.reviews_count),
    image_url: r.image_url,
    reserve_url: r.reserve_url,
  };
});

writeFileSync('data/records.v2.json', JSON.stringify(records, null, 2));

mkdirSync('data/batches', { recursive: true });
const SIZE = 1000;
let n = 0;
for (let i = 0; i < records.length; i += SIZE) {
  n += 1;
  const body = { requests: records.slice(i, i + SIZE).map((body) => ({ action: 'updateObject', body })) };
  writeFileSync(`data/batches/batch-${String(n).padStart(2, '0')}.json`, JSON.stringify(body));
}
console.log(`global mean rating ${globalMean.toFixed(2)}`);
console.log(`Wrote ${records.length} records and ${n} batch files`);
