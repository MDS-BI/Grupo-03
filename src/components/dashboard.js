import { formatCurrency, h, option } from './dom.js';
import {
  createReplenishmentRequest,
  getDashboardStats,
  getReplenishmentSuggestions,
  loadDocuments,
  loadEntities,
  searchEntities
} from '../storage.js';
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
  {
    config,
    initialCategory = '',
    onQuickAction,
    onEditEntity,
    onDeleteEntity,
    onCategoryChange,
    actorPerson = 'local'
  }
) {
  const labels = config.labels;
  let selectedCategory = initialCategory;
  let replenishmentNotice = '';

  function render() {
    container.replaceChildren();

    const allEntities = loadEntities();
    const allDocuments = loadDocuments();
    const stats = getDashboardStats(selectedCategory);
    const suggestions = getReplenishmentSuggestions({ category: selectedCategory });
    const filteredEntities = searchEntities('', selectedCategory);
    const filteredEntityIds = new Set(filteredEntities.map((entity) => entity.entity_id));
    const filteredDocuments = selectedCategory
      ? allDocuments.filter((document) => filteredEntityIds.has(document.entity_id))
      : allDocuments;

    const quickActions = h(
      'section',
      { class: 'quick-actions', 'aria-label': 'Acciones rapidas' },
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
        h('p', { class: 'kpi-label' }, 'Valoracion del stock'),
        h('p', { class: 'kpi-value' }, formatCurrency(stats.valuation))
      ),
      h(
        'article',
        {
          class: `kpi-card ${stats.critical > 0 ? 'is-critical' : ''}`,
          'data-testid': 'kpi-critical'
        },
        h('p', { class: 'kpi-label' }, 'Nivel critico'),
        h('p', { class: 'kpi-value' }, String(stats.critical))
      ),
      h(
        'article',
        { class: 'kpi-card', 'data-testid': 'kpi-no-movement' },
        h('p', { class: 'kpi-label' }, 'Sin movimiento (90 dias)'),
        h('p', { class: 'kpi-value' }, String(stats.noMovement90Days ?? 0))
      )
    );

    const categorySelect = h(
      'select',
      {
        name: 'category',
        id: 'dashboard-category',
        'data-testid': 'dashboard-category',
        'aria-label': 'Filtrar por categoria',
        onchange: (event) => {
          selectedCategory = event.target.value;
          onCategoryChange?.(selectedCategory);
          render();
        }
      },
      option('', 'Todas las categorias', !selectedCategory),
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
        h('label', { for: 'dashboard-category' }, 'Categoria'),
        categorySelect
      ),
      selectedCategory
        ? h(
            'span',
            { class: 'badge', 'data-testid': 'active-filter' },
            `Filtro: ${selectedCategory}`
          )
        : null,
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
            `Hay ${stats.critical} ${labels.entity.plural.toLowerCase()} en nivel critico de stock.`
          )
        : null;

    const emptyState =
      allEntities.length === 0 && allDocuments.length === 0
        ? h(
            'div',
            { class: 'empty-state', 'data-testid': 'dashboard-empty' },
            h('h3', {}, 'Aun no hay datos en el panel'),
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

    const replenishmentRows = suggestions.map((item) => {
      const checkbox = h('input', {
        type: 'checkbox',
        'data-testid': `replenish-select-${item.entity_id}`
      });
      checkbox.checked = true;
      const qtyInput = h('input', {
        type: 'number',
        min: '0',
        step: '1',
        value: String(item.suggestedQty ?? 0),
        'data-testid': `replenish-qty-${item.entity_id}`,
        class: 'input-compact'
      });
      const levelLabel = item.alertLevel === 'red' ? 'Rojo (sin stock)' : 'Amarillo (bajo punto)';
      return {
        item,
        row: h(
          'tr',
          { 'data-testid': `replenish-row-${item.entity_id}` },
          h('td', {}, checkbox),
          h('td', {}, item.name || '-'),
          h('td', {}, item.code || '-'),
          h('td', {}, item.provider || 'Sin proveedor'),
          h('td', {}, String(item.stockBalance ?? 0)),
          h('td', {}, String(item.reorderPoint ?? 0)),
          h('td', {}, qtyInput),
          h('td', {}, levelLabel),
          h(
            'td',
            { 'data-testid': `replenish-rotation-${item.entity_id}` },
            item.rotationLabel || '-'
          )
        ),
        getSelected: () => checkbox.checked,
        getQty: () => qtyInput.value
      };
    });

    const replenishmentTable =
      suggestions.length === 0
        ? h(
            'div',
            { class: 'empty-state', 'data-testid': 'replenishment-empty' },
            h('p', {}, 'No hay productos en alerta de reposicion.')
          )
        : h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'data-table', 'data-testid': 'replenishment-table' },
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  h('th', {}, 'Sel.'),
                  h('th', {}, 'Producto'),
                  h('th', {}, 'Codigo'),
                  h('th', {}, 'Proveedor'),
                  h('th', {}, 'Stock'),
                  h('th', {}, 'Punto reorden'),
                  h('th', {}, 'Cantidad sugerida'),
                  h('th', {}, 'Alerta'),
                  h('th', {}, 'Rotacion')
                )
              ),
              h('tbody', {}, ...replenishmentRows.map((r) => r.row))
            )
          );

    const generateBtn = h(
      'button',
      {
        type: 'button',
        class: 'button button-primary',
        'data-testid': 'generate-replenishment',
        disabled: suggestions.length === 0,
        onclick: () => {
          try {
            const lines = replenishmentRows
              .filter((r) => r.getSelected())
              .map((r) => ({
                entity_id: r.item.entity_id,
                provider: r.item.provider,
                suggestedQty: r.getQty()
              }));
            const request = createReplenishmentRequest({ lines, actorPerson });
            const groups = Object.keys(request.groupedByProvider || {}).length;
            replenishmentNotice = `Solicitud ${request.request_id} generada (${lines.length} lineas, ${groups} proveedor(es)).`;
            render();
          } catch (error) {
            replenishmentNotice = error?.message || 'No se pudo generar la solicitud.';
            render();
          }
        }
      },
      'Generar solicitud'
    );

    const alertsPanel = h(
      'section',
      { class: 'panel', 'data-testid': 'dashboard-alerts' },
      h('div', { class: 'panel-header' }, h('div', {}, h('h3', {}, 'Alertas de reposicion'))),
      replenishmentNotice
        ? h(
            'p',
            { class: 'alert alert-info', 'data-testid': 'replenishment-notice', role: 'status' },
            replenishmentNotice
          )
        : null,
      replenishmentTable,
      h('div', { class: 'actions' }, generateBtn)
    );

    const productTable = h('div');
    renderEntityList(productTable, {
      config,
      entities: filteredEntities,
      onEdit: onEditEntity,
      onDelete: onDeleteEntity,
      onCreate: () => onQuickAction?.('new-entity'),
      showActions: true
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
              'Resumen operativo del inventario y accesos rapidos.'
            )
          )
        ),
        quickActions,
        emptyState,
        filterBar,
        kpiCards,
        criticalAlert,
        alertsPanel,
        h(
          'section',
          { class: 'panel', 'data-testid': 'dashboard-products' },
          h(
            'div',
            { class: 'panel-header' },
            h('div', {}, h('h3', {}, `Catalogo de ${labels.entity.plural.toLowerCase()}`)),
            h(
              'p',
              { class: 'panel-subtitle' },
              'La valoracion se muestra solo en el catalogo y el panel.'
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
