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

search.addWidgets([
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
                ${hit.cuisines.slice(0, 3).join(', ')} · ${hit.neighborhood}, ${hit.city} · ${hit.price_label}
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
// Custom ranking puts the best rated restaurants first when there is no query.
const heading = document.querySelector('#heading');
search.on('render', () => {
  const query = search.helper.state.query;
  heading.textContent = query ? `Results for "${query}"` : 'Top rated right now';
});

// On a phone the filters live behind a button instead of a sidebar.
document.querySelector('#filter-toggle').addEventListener('click', () => {
  document.querySelector('#filters').classList.toggle('open');
});
