// Block 1: join the two source files into one list of records.
// Deliberately no cleaning yet. This is the "before" version.
import { readFileSync, writeFileSync } from 'node:fs';

const list = JSON.parse(readFileSync('data/raw/restaurants_list.json', 'utf8'));

// The CSV is semicolon delimited and has no quoted fields, so a plain split works.
const lines = readFileSync('data/raw/restaurants_info.csv', 'utf8').trim().split('\n');
const headers = lines[0].split(';');

// objectID is a number in the JSON and text in the CSV, so we key everything as text.
const info = new Map();
for (const line of lines.slice(1)) {
  const values = line.split(';');
  const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  info.set(row.objectID, row);
}

const records = list.map((r) => {
  const extra = info.get(String(r.objectID));
  if (!extra) throw new Error(`No CSV row for objectID ${r.objectID}`);
  return {
    objectID: String(r.objectID),
    name: r.name,
    address: r.address,
    city: r.city,
    state: r.state,
    postal_code: r.postal_code,
    area: r.area,
    neighborhood: extra.neighborhood,
    _geoloc: r._geoloc,
    food_type: extra.food_type,
    dining_style: extra.dining_style,
    price: r.price,
    price_range: extra.price_range,
    stars_count: Number(extra.stars_count),
    reviews_count: Number(extra.reviews_count),
    payment_options: r.payment_options,
    image_url: r.image_url,
    reserve_url: r.reserve_url,
  };
});

writeFileSync('data/records.json', JSON.stringify(records, null, 2));
console.log(`Wrote ${records.length} records to data/records.json`);
