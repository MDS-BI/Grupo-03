import { debounce, formatDate, h, option } from './dom.js';
import { getCategories, getLatestLocation, loadEntities, searchEntities } from '../storage.js';

function locationText(location) {
  if (!location) return '—';
  const parts = [
    location.aisle ? `Pasillo ${location.aisle}` : '',
    location.shelf ? `Estante ${location.shelf}` : '',
    location.level ? `Nivel ${location.level}` : ''
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function renderSearch(
  container,
  { config, initialCategory = '', focus = false, onCategoryChange }
) {
  const labels = config.labels;
  const customDefinitions = config.customFields?.entity ?? [];
  const allEntities = loadEntities();

  const input = h('input', {
    type: 'search',
    name: 'term',
    placeholder: `Buscar ${labels.entity.plural.toLowerCase()} por nombre, código, categoría, descripción o fecha objetivo…`,
    autocomplete: 'off',
    'data-testid': 'search-input',
    'aria-label': `Buscar ${labels.entity.plural.toLowerCase()}`
  });

  const categorySelect = h(
    'select',
    {
      name: 'category',
      id: 'search-category',
      'data-testid': 'search-category',
      'aria-label': 'Filtrar por categoría'
    },
    option('', 'Todas las categorías', !initialCategory),
    ...getCategories(allEntities).map((category) =>
      option(category, category, category === initialCategory)
    )
  );
  categorySelect.value = initialCategory;

  const results = h('div', { 'data-testid': 'search-results', 'aria-live': 'polite' });

  function renderResults() {
    const term = input.value;
    const category = categorySelect.value;
    const matches = searchEntities(term, category);
    results.replaceChildren();

    if (matches.length === 0) {
      const hasEntities = allEntities.length > 0;
      results.append(
        h(
          'div',
          { class: 'empty-state', 'data-testid': 'search-empty' },
          h(
            'h3',
            {},
            hasEntities
              ? `No se encontraron ${labels.entity.plural.toLowerCase()}`
              : `No hay ${labels.entity.plural.toLowerCase()} registrados`
          ),
          h(
            'p',
            {},
            hasEntities
              ? 'Pruebe con otro término o limpie el filtro de categoría.'
              : `Cree ${labels.article} ${labels.entity.singular.toLowerCase()} en la pantalla de ${labels.manage.toLowerCase()}.`
          )
        )
      );
      return;
    }

    const list = h('ul', { class: 'result-list' });
    matches.forEach((entity) => {
      const details = h(
        'dl',
        { class: 'detail-list' },
        h('div', {}, h('dt', {}, 'Código'), h('dd', {}, entity.code || '—')),
        h('div', {}, h('dt', {}, 'Categoría'), h('dd', {}, entity.category || '—')),
        h('div', {}, h('dt', {}, 'Stock'), h('dd', {}, String(entity.stockBalance ?? 0))),
        h(
          'div',
          {},
          h('dt', {}, 'Ubicación reciente'),
          h('dd', {}, locationText(getLatestLocation(entity.entity_id)))
        ),
        h('div', {}, h('dt', {}, 'Fecha objetivo'), h('dd', {}, formatDate(entity.targetDate)))
      );

      customDefinitions.forEach((definition) => {
        const value = entity.customFields?.[definition.key];
        details.append(
          h(
            'div',
            {},
            h('dt', {}, definition.label),
            h('dd', {}, value === undefined || value === null || value === '' ? '—' : String(value))
          )
        );
      });

      list.append(
        h(
          'li',
          { class: 'result-card', 'data-testid': `search-result-${entity.entity_id}` },
          h('h3', {}, entity.name || '—'),
          entity.description ? h('p', { class: 'result-meta' }, entity.description) : null,
          details
        )
      );
    });
    results.append(list);
  }

  const debouncedSearch = debounce(renderResults, 150);
  input.addEventListener('input', debouncedSearch);
  categorySelect.addEventListener('change', () => {
    onCategoryChange?.(categorySelect.value);
    renderResults();
  });

  container.append(
    h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'page-header' },
        h(
          'div',
          {},
          h('h2', {}, labels.search),
          h(
            'p',
            { class: 'page-subtitle' },
            `Encuentre ${labels.entity.plural.toLowerCase()} sin salir del módulo. La edición permanece en ${labels.manage.toLowerCase()}.`
          )
        )
      ),
      h(
        'section',
        { class: 'panel' },
        h(
          'div',
          { class: 'form-grid' },
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'search-term' }, 'Término de búsqueda'),
            input
          ),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'search-category' }, 'Categoría'),
            categorySelect
          )
        ),
        h('div', { style: 'height: 16px' }),
        results
      )
    )
  );

  input.id = 'search-term';
  renderResults();
  if (focus) input.focus();

  return {
    focus: () => input.focus(),
    runSearch: renderResults,
    input,
    categorySelect
  };
}
