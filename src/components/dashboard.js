import { formatCurrency, h, option } from './dom.js';
import { getDashboardStats, loadDocuments, loadEntities, searchEntities } from '../storage.js';
import { renderEntityList } from './entity-list.js';
import { renderDocumentList } from './document-list.js';
import { icon } from './shell.js';

function newLabel(labels) {
  return labels.article === 'la' ? 'Nueva' : 'Nuevo';
}

function quickAction({ id, label, iconName, onClick }) {
  return h(
    'button',
    {
      type: 'button',
      class: 'quick-action',
      'data-testid': `quick-${id}`,
      onclick: onClick
    },
    icon(iconName),
    h('span', {}, label)
  );
}

export function renderDashboard(
  container,
  { config, initialCategory = '', onQuickAction, onEditEntity, onDeleteEntity, onCategoryChange }
) {
  const labels = config.labels;
  let selectedCategory = initialCategory;

  function render() {
    container.replaceChildren();

    const allEntities = loadEntities();
    const allDocuments = loadDocuments();
    const stats = getDashboardStats(selectedCategory);
    const filteredEntities = searchEntities('', selectedCategory);
    const filteredEntityIds = new Set(filteredEntities.map((entity) => entity.entity_id));
    const filteredDocuments = selectedCategory
      ? allDocuments.filter((document) => filteredEntityIds.has(document.entity_id))
      : allDocuments;

    const quickActions = h(
      'section',
      { class: 'quick-actions', 'aria-label': 'Acciones rápidas' },
      quickAction({
        id: 'new-entity',
        label: `${newLabel(labels.entity)} ${labels.entity.singular.toLowerCase()}`,
        iconName: 'plus',
        onClick: () => onQuickAction?.('new-entity')
      }),
      quickAction({
        id: 'new-document',
        label: `${newLabel(labels.document)} ${labels.document.singular.toLowerCase()}`,
        iconName: 'plus',
        onClick: () => onQuickAction?.('new-document')
      }),
      quickAction({
        id: 'manage-entities',
        label: `Gestionar ${labels.entity.plural.toLowerCase()}`,
        iconName: 'entities',
        onClick: () => onQuickAction?.('manage-entities')
      }),
      quickAction({
        id: 'search',
        label: `Buscar ${labels.entity.plural.toLowerCase()}`,
        iconName: 'search',
        onClick: () => onQuickAction?.('search')
      })
    );

    const kpiCards = h(
      'section',
      { class: 'kpi-grid', 'aria-label': 'Indicadores del inventario' },
      h(
        'article',
        { class: 'kpi-card', 'data-testid': 'kpi-entities' },
        h('p', { class: 'kpi-label' }, `Total de ${labels.entity.plural.toLowerCase()}`),
        h('p', { class: 'kpi-value' }, String(stats.totalEntities))
      ),
      h(
        'article',
        { class: 'kpi-card', 'data-testid': 'kpi-documents' },
        h('p', { class: 'kpi-label' }, `Total de ${labels.document.plural.toLowerCase()}`),
        h('p', { class: 'kpi-value' }, String(stats.totalDocuments))
      ),
      h(
        'article',
        { class: 'kpi-card', 'data-testid': 'kpi-valuation' },
        h('p', { class: 'kpi-label' }, 'Valoración del stock'),
        h('p', { class: 'kpi-value' }, formatCurrency(stats.valuation))
      ),
      h(
        'article',
        {
          class: `kpi-card ${stats.critical > 0 ? 'is-critical' : ''}`,
          'data-testid': 'kpi-critical'
        },
        h('p', { class: 'kpi-label' }, 'Nivel crítico'),
        h('p', { class: 'kpi-value' }, String(stats.critical))
      )
    );

    const categorySelect = h(
      'select',
      {
        name: 'category',
        id: 'dashboard-category',
        'data-testid': 'dashboard-category',
        'aria-label': 'Filtrar por categoría',
        onchange: (event) => {
          selectedCategory = event.target.value;
          onCategoryChange?.(selectedCategory);
          render();
        }
      },
      option('', 'Todas las categorías', !selectedCategory),
      ...stats.categories.map((category) =>
        option(category, category, category === selectedCategory)
      )
    );

    const filterBar = h(
      'div',
      { class: 'toolbar', 'data-testid': 'dashboard-filters' },
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'dashboard-category' }, 'Categoría'),
        categorySelect
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'button button-ghost',
          'data-testid': 'clear-filters',
          disabled: !selectedCategory,
          onclick: () => {
            selectedCategory = '';
            onCategoryChange?.('');
            render();
          }
        },
        'Limpiar filtros'
      )
    );

    const criticalAlert =
      stats.critical > 0
        ? h(
            'div',
            { class: 'alert alert-warning', 'data-testid': 'critical-alert', role: 'alert' },
            `Hay ${stats.critical} ${labels.entity.plural.toLowerCase()} en nivel crítico de stock.`
          )
        : null;

    const emptyState =
      allEntities.length === 0 && allDocuments.length === 0
        ? h(
            'div',
            { class: 'empty-state', 'data-testid': 'dashboard-empty' },
            h('h3', {}, 'Aún no hay datos en el panel'),
            h(
              'p',
              {},
              `Cree ${labels.article} ${labels.entity.singular.toLowerCase()} o registre un ${labels.document.singular.toLowerCase()} para comenzar.`
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'button button-primary',
                onclick: () => onQuickAction?.('new-entity')
              },
              `Crear ${labels.entity.singular}`
            )
          )
        : null;

    const productTable = h('div');
    renderEntityList(productTable, {
      config,
      entities: filteredEntities,
      onEdit: onEditEntity,
      onDelete: onDeleteEntity,
      onCreate: () => onQuickAction?.('new-entity'),
      showActions: true,
      showValuation: true
    });

    const recentMovements = h('div');
    renderDocumentList(recentMovements, {
      config,
      documents: filteredDocuments,
      entities: allEntities,
      showActions: false,
      limit: 5,
      onCreate: () => onQuickAction?.('new-document')
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
            h('h2', {}, labels.dashboard),
            h(
              'p',
              { class: 'page-subtitle' },
              'Resumen operativo del inventario y accesos rápidos.'
            )
          )
        ),
        quickActions,
        emptyState,
        filterBar,
        kpiCards,
        criticalAlert,
        h(
          'section',
          { class: 'panel', 'data-testid': 'dashboard-products' },
          h(
            'div',
            { class: 'panel-header' },
            h('div', {}, h('h3', {}, `Catálogo de ${labels.entity.plural.toLowerCase()}`)),
            h(
              'p',
              { class: 'panel-subtitle' },
              'La valoración se muestra solo en el catálogo y el panel.'
            )
          ),
          productTable
        ),
        h(
          'section',
          { class: 'panel', 'data-testid': 'dashboard-movements' },
          h(
            'div',
            { class: 'panel-header' },
            h('div', {}, h('h3', {}, `${labels.document.plural} recientes`))
          ),
          recentMovements
        )
      )
    );
  }

  render();
  return { refresh: render };
}
