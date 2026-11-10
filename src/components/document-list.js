import { formatDateTime, h } from './dom.js';

function locationText(document) {
  if (!document || document.type !== 'ENTRADA') return '—';
  const parts = [
    document.aisle ? `Pasillo ${document.aisle}` : '',
    document.shelf ? `Estante ${document.shelf}` : '',
    document.level ? `Nivel ${document.level}` : ''
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function renderDocumentList(
  container,
  {
    config,
    documents = [],
    entities = [],
    onEdit,
    onDelete,
    onCreate,
    showActions = true,
    limit = null
  }
) {
  const labels = config.labels.document;
  const customDefinitions = config.customFields?.document ?? [];
  const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const actionsEnabled =
    showActions && (typeof onEdit === 'function' || typeof onDelete === 'function');

  const ordered = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const visible = typeof limit === 'number' ? ordered.slice(0, limit) : ordered;

  if (visible.length === 0) {
    container.append(
      h(
        'div',
        { class: 'empty-state', 'data-testid': 'document-empty' },
        h('h3', {}, `No hay ${labels.plural.toLowerCase()} registrados`),
        h(
          'p',
          {},
          `Registre ${labels.article} ${labels.singular.toLowerCase()} para actualizar el stock.`
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
    h('th', { scope: 'col' }, 'Fecha'),
    h('th', { scope: 'col' }, config.labels.entity.singular),
    h('th', { scope: 'col' }, 'Tipo'),
    h('th', { scope: 'col' }, 'Cantidad'),
    h('th', { scope: 'col' }, 'Ubicación'),
    h('th', { scope: 'col' }, 'Estado'),
    h('th', { scope: 'col' }, 'Notas')
  ];

  customDefinitions.forEach((definition) => {
    headerCells.push(h('th', { scope: 'col' }, definition.label));
  });

  if (actionsEnabled) {
    headerCells.push(h('th', { scope: 'col' }, 'Acciones'));
  }

  const rows = visible.map((document) => {
    const entity = entityMap.get(document.entity_id);
    const typeLabel = document.type === 'ENTRADA' ? 'Entrada' : 'Salida';
    const cells = [
      h('td', {}, formatDateTime(document.createdAt)),
      h('td', {}, entity?.name ?? '—'),
      h(
        'td',
        {},
        h(
          'span',
          { class: `badge ${document.type === 'ENTRADA' ? 'badge-entry' : 'badge-exit'}` },
          typeLabel
        )
      ),
      h('td', {}, String(document.quantity ?? '—')),
      h('td', {}, locationText(document)),
      h('td', {}, document.status || '—'),
      h('td', {}, document.notes || '—')
    ];

    customDefinitions.forEach((definition) => {
      const value = document.customFields?.[definition.key];
      cells.push(
        h('td', {}, value === undefined || value === null || value === '' ? '—' : String(value))
      );
    });

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
                    'data-testid': `document-edit-${document.document_id}`,
                    'aria-label': `Editar ${labels.singular}`,
                    onclick: () => onEdit(document)
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
                    'data-testid': `document-delete-row-${document.document_id}`,
                    'aria-label': `Eliminar ${labels.singular}`,
                    onclick: () => onDelete(document)
                  },
                  'Eliminar'
                )
              : null
          )
        )
      );
    }

    return h('tr', { 'data-testid': `document-row-${document.document_id}` }, ...cells);
  });

  container.append(
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'data-table', 'data-testid': 'document-table' },
        h('thead', {}, h('tr', {}, ...headerCells)),
        h('tbody', {}, ...rows)
      )
    )
  );
}
