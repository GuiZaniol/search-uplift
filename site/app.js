// Search UI for the OpenTable prototype.
// The key below is the search-only key. It can run queries and nothing else,
// which is why it is safe in a public page. The admin key never leaves the .env file.
const APP_ID = 'VCHGBR7IR9';
const SEARCH_KEY = 'a31329b111934df9cc97fc41a085db58';
const INDEX = 'restaurants';

// The CDN build of the lite client registers itself under this global name,
// and exposes liteClient rather than a default function.
const { liteClient } = window['algoliasearch/lite'];

const search = instantsearch({
  indexName: INDEX,
  searchClient: liteClient(APP_ID, SEARCH_KEY),
  routing: true, // keeps the query and filters in the URL so a search can be shared
});

// A grey placeholder, used when the 2015 image URLs do not resolve.
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
      '<rect width="120" height="120" fill="#e8e8e8"/>' +
      '<text x="60" y="64" font-family="sans-serif" font-size="11" fill="#999" text-anchor="middle">no photo</text>' +
    '</svg>'
  );

const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

// Location. Every search starts from the diner's approximate location, which Algolia
// works out from the IP address of the request: no permission prompt, city level accuracy.
// "Use my exact location" swaps in the browser's position once the diner allows it.
// aroundRadius 'all': distance reorders results and never hides them.
// aroundPrecision 1000: restaurants in the same 1 km band count as equally close,
// so the ranking criteria after geo, then quality score, decide the order inside a band.
const GEO = { aroundRadius: 'all', aroundPrecision: 1000 };
let exactPosition = null; // "lat,lng" from the browser, once shared

// configure is an invisible widget: it adds fixed parameters to every search.
let geoWidget = instantsearch.widgets.configure({ ...GEO, aroundLatLngViaIP: true });

function useExactPosition(lat, lng) {
  exactPosition = `${lat},${lng}`;
  search.removeWidgets([geoWidget]);
  geoWidget = instantsearch.widgets.configure({ ...GEO, aroundLatLng: exactPosition });
  search.addWidgets([geoWidget]);
}

// Straight line distance in miles between two points (haversine formula).
function milesBetween(lat1, lng1, lat2, lng2) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 3959 * 2 * Math.asin(Math.sqrt(a)); // 3959 miles: the Earth's radius
}
const formatMiles = (miles) => (miles < 10 ? miles.toFixed(1) : Math.round(miles)) + ' mi';

search.addWidgets([
  geoWidget,

  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Search restaurants, cuisines, neighborhoods',
    showSubmit: false,
    autofocus: false,
  }),

  instantsearch.widgets.stats({
    container: '#stats',
    templates: {
      text(data, { html }) {
        return html`<span>${data.nbHits.toLocaleString()} restaurants, ${data.processingTimeMS} ms</span>`;
      },
    },
  }),

  instantsearch.widgets.clearRefinements({
    container: '#clear-refinements',
    templates: { resetLabel: 'Clear all' },
  }),

  instantsearch.widgets.currentRefinements({ container: '#current-refinements' }),

  // Cuisine has 115 values after cleanup, so the list is searchable and capped.
  instantsearch.widgets.refinementList({
    container: '#cuisines',
    attribute: 'cuisines',
    searchable: true,
    searchablePlaceholder: 'Find a cuisine',
    limit: 8,
    showMore: true,
    showMoreLimit: 20,
  }),

  instantsearch.widgets.refinementList({ container: '#price', attribute: 'price_label' }),
  instantsearch.widgets.refinementList({ container: '#dining-style', attribute: 'dining_style' }),
  instantsearch.widgets.refinementList({
    container: '#city',
    attribute: 'city',
    searchable: true,
    searchablePlaceholder: 'Find a city',
    limit: 6,
    showMore: true,
  }),

  instantsearch.widgets.hits({
    container: '#hits',
    // Distance for each card, measured from the exact position if the diner shared it,
    // otherwise from the approximate location Algolia returns with the results.
    transformItems(items, { results }) {
      const center = exactPosition || results.aroundLatLng;
      if (!center) return items;
      const [lat, lng] = center.split(',').map(Number);
      return items.map((item) => ({
        ...item,
        miles: item._geoloc ? milesBetween(lat, lng, item._geoloc.lat, item._geoloc.lng) : null,
      }));
    },
    templates: {
      item(hit, { html, components }) {
        return html`
          <article class="card">
            <img class="card-img" src="${hit.image_url}" alt=""
                 onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
            <div class="card-body">
              <h3 class="card-title">
                ${components.Highlight({ hit, attribute: 'brand' })}
                ${hit.location_label ? html`<span class="loc">${hit.location_label}</span>` : ''}
              </h3>
              <p class="card-meta">
                ${hit.cuisines.slice(0, 3).join(', ')} · ${hit.neighborhood && hit.neighborhood !== hit.city ? `${hit.neighborhood}, ` : ''}${hit.city} · ${hit.price_label}${hit.miles != null ? html` · ${formatMiles(hit.miles)}` : ''}
              </p>
              <p class="card-rating">
                <span class="stars">${stars(hit.rating)}</span>
                ${hit.rating} (${hit.reviews_count.toLocaleString()} reviews)
              </p>
              <a class="card-link" href="${hit.reserve_url}" target="_blank" rel="noopener">Reserve</a>
            </div>
          </article>`;
      },
      empty(results, { html }) {
        return html`
          <div class="empty">
            <p>Nothing matches <strong>${results.query}</strong>.</p>
            <p>Try fewer words, or clear the filters.</p>
          </div>`;
      },
    },
  }),

  instantsearch.widgets.pagination({ container: '#pagination', padding: 2 }),
]);

search.start();

// The empty query is a browse screen, so the heading says what it is showing.
// With no query, the nearest 1 km band comes first and custom ranking orders each band.
const heading = document.querySelector('#heading');
search.on('render', () => {
  const query = search.helper.state.query;
  heading.textContent = query ? `Results for "${query}"` : 'Top rated near you';
});

// On a phone the filters live behind a button instead of a sidebar.
document.querySelector('#filter-toggle').addEventListener('click', () => {
  document.querySelector('#filters').classList.toggle('open');
});

// "Use my exact location": asks the browser. If the diner says no, or the browser
// cannot tell, the approximate location stays in place and the line says so.
const geoStatus = document.querySelector('#geo-status');
const geoButton = document.querySelector('#geo-button');
geoButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    geoStatus.textContent = 'This browser cannot share a location. Showing places near your approximate location first.';
    return;
  }
  geoStatus.textContent = 'Asking for your location...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      useExactPosition(position.coords.latitude, position.coords.longitude);
      geoStatus.textContent = 'Showing places near you first.';
      geoButton.hidden = true;
    },
    () => {
      geoStatus.textContent = 'Location not shared. Showing places near your approximate location first.';
    },
    { timeout: 10000, maximumAge: 600000 }
  );
});
