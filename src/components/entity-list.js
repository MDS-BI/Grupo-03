import { formatCurrency, h } from './dom.js';
import { getLatestLocation } from '../storage.js';

function locationText(location) {
  if (!location) return '—';
  const parts = [
    location.aisle ? `Pasillo ${location.aisle}` : '',
    location.shelf ? `Estante ${location.shelf}` : '',
    location.level ? `Nivel ${location.level}` : ''
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function renderEntityList(
  container,
  { config, entities = [], onEdit, onDelete, onCreate, showActions = true, showValuation = true }
) {
  const labels = config.labels.entity;
  const customDefinitions = config.customFields?.entity ?? [];
  const actionsEnabled =
    showActions && (typeof onEdit === 'function' || typeof onDelete === 'function');

  if (entities.length === 0) {
    container.append(
      h(
        'div',
        { class: 'empty-state', 'data-testid': 'entity-empty' },
        h('h3', {}, `No hay ${labels.plural.toLowerCase()} registrados`),
        h(
          'p',
          {},
          `Cree ${labels.article} ${labels.singular.toLowerCase()} para comenzar a operar el módulo.`
        ),
        onCreate
          ? h(
              'button',
              { type: 'button', class: 'button button-primary', onclick: () => onCreate() },
              `Crear ${labels.singular}`
            )
          : null
      )
    );
    return;
  }

  const headerCells = [
    h('th', { scope: 'col' }, 'Nombre'),
    h('th', { scope: 'col' }, 'Código'),
    h('th', { scope: 'col' }, 'Categoría'),
    h('th', { scope: 'col' }, 'Stock'),
    h('th', { scope: 'col' }, 'Ubicación reciente')
  ];

  customDefinitions.forEach((definition) => {
    headerCells.push(h('th', { scope: 'col' }, definition.label));
  });

  if (showValuation) {
    headerCells.push(h('th', { scope: 'col' }, 'Valoración'));
  }
  if (actionsEnabled) {
    headerCells.push(h('th', { scope: 'col' }, 'Acciones'));
  }

  const rows = entities.map((entity) => {
    const cells = [
      h('td', {}, h('strong', {}, entity.name || '—')),
      h('td', {}, entity.code || '—'),
      h('td', {}, entity.category || '—'),
      h('td', {}, String(entity.stockBalance ?? 0)),
      h('td', {}, locationText(getLatestLocation(entity.entity_id)))
    ];

    customDefinitions.forEach((definition) => {
      const value = entity.customFields?.[definition.key];
      cells.push(
        h('td', {}, value === undefined || value === null || value === '' ? '—' : String(value))
      );
    });

    if (showValuation) {
      const hasCost =
        entity.unitCost !== undefined && entity.unitCost !== null && entity.unitCost !== '';
      const valuation = (Number(entity.stockBalance) || 0) * (Number(entity.unitCost) || 0);
      cells.push(h('td', {}, hasCost ? formatCurrency(valuation) : '—'));
    }

    if (actionsEnabled) {
      cells.push(
        h(
          'td',
          {},
          h(
            'div',
            { class: 'actions' },
            onEdit
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-small',
                    'data-testid': `entity-edit-${entity.entity_id}`,
                    'aria-label': `Editar ${entity.name}`,
                    onclick: () => onEdit(entity)
                  },
                  'Editar'
                )
              : null,
            onDelete
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-small button-danger',
                    'data-testid': `entity-delete-row-${entity.entity_id}`,
                    'aria-label': `Eliminar ${entity.name}`,
                    onclick: () => onDelete(entity)
                  },
                  'Eliminar'
                )
              : null
          )
        )
      );
    }

    return h('tr', { 'data-testid': `entity-row-${entity.entity_id}` }, ...cells);
  });

  container.append(
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'data-table', 'data-testid': 'entity-table' },
        h('thead', {}, h('tr', {}, ...headerCells)),
        h('tbody', {}, ...rows)
      )
    )
  );
}
