import { formatDateTime, h, option } from './dom.js';
import { getAuditTrail, getPersons, loadEntities } from '../storage.js';

function detailText(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function renderAuditLog(container, { config, initialFilters = {} } = {}) {
  let filters = {
    action: '',
    person: '',
    entityId: '',
    fromDate: '',
    toDate: '',
    ...initialFilters
  };

  function render() {
    container.replaceChildren();

    const entities = loadEntities();
    const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity]));
    const allEntries = getAuditTrail({});
    const actions = Array.from(
      new Set(allEntries.map((entry) => entry.action).filter(Boolean))
    ).sort();
    const persons = Array.from(
      new Set([...getPersons(), ...allEntries.map((entry) => entry.person).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b, 'es'));
    const rows = getAuditTrail(filters);

    const actionSelect = h(
      'select',
      { id: 'audit-action', 'data-testid': 'audit-action' },
      option('', 'Todas las acciones', !filters.action),
      ...actions.map((action) => option(action, action, action === filters.action))
    );
    const personSelect = h(
      'select',
      { id: 'audit-person', 'data-testid': 'audit-person' },
      option('', 'Todas las personas', !filters.person),
      ...persons.map((person) => option(person, person, person === filters.person))
    );
    const entitySelect = h(
      'select',
      { id: 'audit-entity', 'data-testid': 'audit-entity' },
      option('', 'Todas las entidades', !filters.entityId),
      ...entities.map((entity) =>
        option(
          entity.entity_id,
          `${entity.name} (${entity.code})`,
          entity.entity_id === filters.entityId
        )
      )
    );
    const fromInput = h('input', {
      type: 'date',
      id: 'audit-from',
      'data-testid': 'audit-from',
      value: filters.fromDate
    });
    const toInput = h('input', {
      type: 'date',
      id: 'audit-to',
      'data-testid': 'audit-to',
      value: filters.toDate
    });

    const applyFilters = () => {
      filters = {
        action: actionSelect.value,
        person: personSelect.value,
        entityId: entitySelect.value,
        fromDate: fromInput.value,
        toDate: toInput.value
      };
      render();
    };
    [actionSelect, personSelect, entitySelect, fromInput, toInput].forEach((control) =>
      control.addEventListener('change', applyFilters)
    );

    const tableRows = rows.map((entry) => {
      const entity = entry.entityId ? entityMap.get(entry.entityId) : null;
      return h(
        'tr',
        { 'data-testid': `audit-row-${entry.audit_id}` },
        h('td', {}, formatDateTime(entry.timestamp)),
        h('td', {}, entry.person || '—'),
        h('td', {}, entry.action || '—'),
        h('td', {}, entity ? `${entity.name} (${entity.code})` : entry.entityId || '—'),
        h('td', {}, entry.details || '—'),
        h('td', {}, detailText(entry.before)),
        h('td', {}, detailText(entry.after))
      );
    });

    const table =
      rows.length === 0
        ? h(
            'div',
            { class: 'empty-state', 'data-testid': 'audit-empty' },
            h('p', {}, 'No hay registros de auditoría para los filtros seleccionados.')
          )
        : h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'data-table', 'data-testid': 'audit-table' },
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  h('th', {}, 'Fecha'),
                  h('th', {}, 'Persona'),
                  h('th', {}, 'Acción'),
                  h('th', {}, 'Entidad'),
                  h('th', {}, 'Detalle'),
                  h('th', {}, 'Antes'),
                  h('th', {}, 'Después')
                )
              ),
              h('tbody', {}, ...tableRows)
            )
          );

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
            h('h2', {}, config.labels.audit ?? 'Auditoría'),
            h(
              'p',
              { class: 'page-subtitle' },
              'Registro de acciones con persona local, fecha y valores anterior/nuevo.'
            )
          )
        ),
        h(
          'section',
          { class: 'panel', 'data-testid': 'audit-filters' },
          h(
            'div',
            { class: 'form-grid' },
            h(
              'div',
              { class: 'field' },
              h('label', { for: 'audit-action' }, 'Acción'),
              actionSelect
            ),
            h(
              'div',
              { class: 'field' },
              h('label', { for: 'audit-person' }, 'Persona'),
              personSelect
            ),
            h(
              'div',
              { class: 'field' },
              h('label', { for: 'audit-entity' }, 'Entidad'),
              entitySelect
            ),
            h('div', { class: 'field' }, h('label', { for: 'audit-from' }, 'Desde'), fromInput),
            h('div', { class: 'field' }, h('label', { for: 'audit-to' }, 'Hasta'), toInput)
          )
        ),
        table
      )
    );
  }

  render();
  return { refresh: render };
}
