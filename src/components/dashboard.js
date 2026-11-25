import { formatCurrency, h, option } from './dom.js';
import {
  createReplenishmentRequest,
  getDashboardStats,
  getInventoryCoverage,
  getReplenishmentSuggestions,
  loadDocuments,
  loadEntities,
  searchEntities
} from '../storage.js';
import { MOVEMENT_PERMISSIONS, hasAnyPermission, hasPermission } from '../roles.js';
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
    role = '',
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
  let selectedFrom = '';
  let selectedTo = '';
  let replenishmentNotice = '';
  const canWriteCatalog = hasPermission(role, 'catalog.write');
  const canCreateDocument = hasAnyPermission(role, MOVEMENT_PERMISSIONS);
  const canSearch = hasPermission(role, 'search.read');

  function render() {
    container.replaceChildren();

    const allEntities = loadEntities();
    const allDocuments = loadDocuments();
    const periodFilters = { fromDate: selectedFrom, toDate: selectedTo };
    const stats = getDashboardStats(selectedCategory, periodFilters);
    const suggestions = getReplenishmentSuggestions({
      category: selectedCategory,
      ...periodFilters
    });
    const coverage = getInventoryCoverage({
      category: selectedCategory,
      ...periodFilters
    });
    const filteredEntities = searchEntities('', selectedCategory);
    const filteredEntityIds = new Set(filteredEntities.map((entity) => entity.entity_id));
    const filteredDocuments = (
      selectedCategory
        ? allDocuments.filter((document) => filteredEntityIds.has(document.entity_id))
        : allDocuments
    ).filter((document) => {
      const date = String(document.createdAt ?? '').slice(0, 10);
      if (selectedFrom && date < selectedFrom) return false;
      if (selectedTo && date > selectedTo) return false;
      return true;
    });

    const quickActions = h(
      'section',
      { class: 'quick-actions', 'aria-label': 'Acciones rapidas' },
      canWriteCatalog
        ? quickAction({
            id: 'new-entity',
            label: `${newLabel(labels.entity)} ${labels.entity.singular.toLowerCase()}`,
            iconName: 'plus',
            onClick: () => onQuickAction?.('new-entity')
          })
        : null,
      canCreateDocument
        ? quickAction({
            id: 'new-document',
            label: `${newLabel(labels.document)} ${labels.document.singular.toLowerCase()}`,
            iconName: 'plus',
            onClick: () => onQuickAction?.('new-document')
          })
        : null,
      canWriteCatalog
        ? quickAction({
            id: 'manage-entities',
            label: `Gestionar ${labels.entity.plural.toLowerCase()}`,
            iconName: 'entities',
            onClick: () => onQuickAction?.('manage-entities')
          })
        : null,
      canSearch
        ? quickAction({
            id: 'search',
            label: `Buscar ${labels.entity.plural.toLowerCase()}`,
            iconName: 'search',
            onClick: () => onQuickAction?.('search')
          })
        : null
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
      ),
      h(
        'article',
        { class: 'kpi-card', 'data-testid': 'kpi-coverage' },
        h('p', { class: 'kpi-label' }, 'Cobertura promedio (dias)'),
        h(
          'p',
          { class: 'kpi-value' },
          coverage.averageCoverageDays === null ? '—' : coverage.averageCoverageDays.toFixed(1)
        )
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

    const fromDateInput = h('input', {
      type: 'date',
      id: 'dashboard-from',
      'data-testid': 'dashboard-from',
      value: selectedFrom,
      onchange: (event) => {
        selectedFrom = event.target.value;
        render();
      }
    });
    const toDateInput = h('input', {
      type: 'date',
      id: 'dashboard-to',
      'data-testid': 'dashboard-to',
      value: selectedTo,
      onchange: (event) => {
        selectedTo = event.target.value;
        render();
      }
    });

    const activeFilters = [];
    if (selectedCategory) activeFilters.push(`Categoria: ${selectedCategory}`);
    if (selectedFrom) activeFilters.push(`Desde: ${selectedFrom}`);
    if (selectedTo) activeFilters.push(`Hasta: ${selectedTo}`);

    const filterBar = h(
      'div',
      { class: 'toolbar', 'data-testid': 'dashboard-filters' },
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'dashboard-category' }, 'Categoria'),
        categorySelect
      ),
      h('div', { class: 'field' }, h('label', { for: 'dashboard-from' }, 'Desde'), fromDateInput),
      h('div', { class: 'field' }, h('label', { for: 'dashboard-to' }, 'Hasta'), toDateInput),
      activeFilters.length > 0
        ? h(
            'span',
            { class: 'badge', 'data-testid': 'active-filter' },
            `Filtros: ${activeFilters.join(' · ')}`
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          class: 'button button-ghost',
          'data-testid': 'clear-filters',
          disabled: activeFilters.length === 0,
          onclick: () => {
            selectedCategory = '';
            selectedFrom = '';
            selectedTo = '';
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
            canWriteCatalog
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-primary',
                    onclick: () => onQuickAction?.('new-entity')
                  },
                  `Crear ${labels.entity.singular}`
                )
              : null
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

    const coverageRows = coverage.rows.map((row) =>
      h(
        'tr',
        { 'data-testid': `coverage-row-${row.entity_id}` },
        h('td', {}, row.name || '-'),
        h('td', {}, row.code || '-'),
        h('td', {}, String(row.stockBalance ?? 0)),
        h('td', {}, String(row.totalConsumed ?? 0)),
        h('td', {}, row.averageDailyConsumption.toFixed(2)),
        h(
          'td',
          { 'data-testid': `coverage-days-${row.entity_id}` },
          row.coverageDays === null ? '—' : row.coverageDays.toFixed(1)
        ),
        h('td', {}, row.sufficientHistory ? 'Suficiente' : 'Datos insuficientes')
      )
    );

    const coverageTable =
      coverage.rows.length === 0
        ? h(
            'div',
            { class: 'empty-state', 'data-testid': 'coverage-empty' },
            h('p', {}, 'No hay productos para calcular cobertura.')
          )
        : h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'data-table', 'data-testid': 'coverage-table' },
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  h('th', {}, 'Producto'),
                  h('th', {}, 'Codigo'),
                  h('th', {}, 'Stock'),
                  h('th', {}, 'Consumo periodo'),
                  h('th', {}, 'Promedio diario'),
                  h('th', {}, 'Cobertura (dias)'),
                  h('th', {}, 'Historial')
                )
              ),
              h('tbody', {}, ...coverageRows)
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
      onEdit: canWriteCatalog ? onEditEntity : undefined,
      onDelete: canWriteCatalog ? onDeleteEntity : undefined,
      onCreate: canWriteCatalog ? () => onQuickAction?.('new-entity') : undefined,
      showActions: canWriteCatalog
    });

    const recentMovements = h('div');
    renderDocumentList(recentMovements, {
      config,
      documents: filteredDocuments,
      entities: allEntities,
      showActions: false,
      limit: 5,
      onCreate: canCreateDocument ? () => onQuickAction?.('new-document') : undefined
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
          { class: 'panel', 'data-testid': 'dashboard-coverage' },
          h(
            'div',
            { class: 'panel-header' },
            h('div', {}, h('h3', {}, 'Cobertura de inventario')),
            h(
              'p',
              { class: 'panel-subtitle' },
              'Cobertura = stock / promedio diario de consumo del periodo.'
            )
          ),
          coverageTable
        ),
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
