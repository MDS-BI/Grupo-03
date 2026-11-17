import { formatDateTime, h } from './dom.js';

function locationText(document) {
  if (!document) return '—';
  if (document.type === 'ENTRADA') {
    const parts = [
      document.aisle ? `Pasillo ${document.aisle}` : '',
      document.shelf ? `Estante ${document.shelf}` : '',
      document.level ? `Nivel ${document.level}` : ''
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '—';
  }
  if (document.type === 'TRANSFERENCIA') {
    const from = [document.fromAisle, document.fromShelf, document.fromLevel]
      .filter(Boolean)
      .join('-');
    const to = [
      document.toAisle || document.aisle,
      document.toShelf || document.shelf,
      document.toLevel || document.level
    ]
      .filter(Boolean)
      .join('-');
    if (from || to) return `${from || '—'} → ${to || '—'}`;
  }
  if (document.aisle || document.shelf || document.level) {
    return [document.aisle, document.shelf, document.level].filter(Boolean).join('-');
  }
  return '—';
}

function typeLabel(type) {
  if (type === 'ENTRADA') return 'Entrada';
  if (type === 'SALIDA') return 'Salida';
  if (type === 'TRANSFERENCIA') return 'Transferencia';
  if (type === 'AJUSTE') return 'Ajuste';
  return type || '—';
}

export function renderDocumentList(
  container,
  {
    config,
    documents = [],
    entities = [],
    onEdit,
    onDelete,
    onVoid,
    onCreate,
    showActions = true,
    showSaldo = false,
    limit = null,
    emptyMessage = null
  }
) {
  const labels = config.labels.document;
  const customDefinitions = config.customFields?.document ?? [];
  const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const actionsEnabled =
    showActions &&
    (typeof onEdit === 'function' ||
      typeof onDelete === 'function' ||
      typeof onVoid === 'function');

  const ordered = [...documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
          emptyMessage ||
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
    h('th', { scope: 'col' }, 'Persona local'),
    h('th', { scope: 'col' }, 'Notas')
  ];
  if (showSaldo) headerCells.splice(5, 0, h('th', { scope: 'col' }, 'Saldo'));
  customDefinitions.forEach((definition) => {
    headerCells.push(h('th', { scope: 'col' }, definition.label));
  });
  if (actionsEnabled) headerCells.push(h('th', { scope: 'col' }, 'Acciones'));

  const rows = visible.map((document) => {
    const entity = entityMap.get(document.entity_id);
    const state = document.state || document.status || '—';
    const isImmutable =
      state === 'confirmed' || state === 'voided' || Boolean(document.voidsMovementId);
    const cells = [
      h('td', {}, formatDateTime(document.createdAt)),
      h('td', {}, entity?.name ?? '—'),
      h(
        'td',
        {},
        h(
          'span',
          { class: `badge ${document.type === 'ENTRADA' ? 'badge-entry' : 'badge-exit'}` },
          typeLabel(document.type)
        )
      ),
      h('td', {}, String(document.quantity ?? '—')),
      h('td', {}, locationText(document)),
      h('td', {}, state),
      h('td', {}, document.actorPerson || document.actorLabel || '—'),
      h('td', {}, document.notes || document.reason || '—')
    ];
    if (showSaldo) {
      cells.splice(5, 0, h('td', {}, document.saldo !== undefined ? String(document.saldo) : '—'));
    }

    customDefinitions.forEach((definition) => {
      const value = document.customFields?.[definition.key];
      cells.push(
        h('td', {}, value === undefined || value === null || value === '' ? '—' : String(value))
      );
    });

    if (actionsEnabled) {
      const canVoid =
        isImmutable &&
        state !== 'voided' &&
        !document.voidsMovementId &&
        typeof onVoid === 'function';
      const canEdit = !isImmutable && typeof onEdit === 'function';
      const canDelete = !isImmutable && typeof onDelete === 'function';
      cells.push(
        h(
          'td',
          {},
          h(
            'div',
            { class: 'actions' },
            canEdit
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-small',
                    'data-testid': `document-edit-${document.document_id}`,
                    onclick: () => onEdit(document)
                  },
                  'Editar'
                )
              : null,
            canVoid
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-small button-warning',
                    'data-testid': `document-void-${document.document_id}`,
                    onclick: () => onVoid(document)
                  },
                  'Anular'
                )
              : null,
            canDelete
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'button button-small button-danger',
                    'data-testid': `document-delete-row-${document.document_id}`,
                    onclick: () => onDelete(document)
                  },
                  'Eliminar'
                )
              : null,
            isImmutable && !canVoid
              ? h(
                  'span',
                  { class: 'muted', 'data-testid': `document-immutable-${document.document_id}` },
                  'Inmutable'
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
