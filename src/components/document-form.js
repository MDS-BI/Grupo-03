import { applyErrors, clearErrors, formField, h, option } from './dom.js';
import { computeAvailableStock } from '../storage.js';

function customControl(definition, value) {
  const name = `custom_${definition.key}`;
  const common = {
    name,
    'data-testid': `custom-${definition.key}`
  };

  if (definition.type === 'select') {
    return h(
      'select',
      common,
      option('', 'Seleccione…', !value),
      ...(definition.options ?? []).map((item) => option(item, item, item === value))
    );
  }

  if (definition.type === 'number') {
    return h('input', {
      ...common,
      type: 'number',
      value: value ?? '',
      min: definition.min,
      max: definition.max,
      step: 'any'
    });
  }

  if (definition.type === 'date') {
    return h('input', { ...common, type: 'date', value: value ?? '' });
  }

  return h('input', { ...common, type: 'text', value: value ?? '', autocomplete: 'off' });
}

export function renderDocumentForm(
  container,
  { config, entities = [], document = null, onSubmit, onCancel, onDelete }
) {
  const labels = config.labels.document;
  const entityLabels = config.labels.entity;
  const lifecycle = config.statusLifecycle;
  const isEditing = Boolean(document);
  let dirty = false;

  const entitySelect = h(
    'select',
    { name: 'entity_id', 'data-autofocus': 'true', 'data-testid': 'document-entity' },
    option('', 'Seleccione…', !document?.entity_id),
    ...entities.map((entity) =>
      option(
        entity.entity_id,
        `${entity.name || entity.code || entity.entity_id}${entity.code ? ` — ${entity.code}` : ''}`,
        entity.entity_id === document?.entity_id
      )
    )
  );

  const typeSelect = h(
    'select',
    { name: 'type', 'data-testid': 'document-type' },
    option('ENTRADA', 'Entrada', (document?.type ?? 'ENTRADA') === 'ENTRADA'),
    option('SALIDA', 'Salida', document?.type === 'SALIDA')
  );

  const quantityInput = h('input', {
    type: 'number',
    name: 'quantity',
    value: document?.quantity ?? '',
    min: '1',
    step: '1',
    'data-testid': 'document-quantity'
  });

  let statusControl;
  if (lifecycle) {
    let allowed = lifecycle.states;
    if (document) {
      if (lifecycle.states.includes(document.status)) {
        allowed = Array.from(
          new Set([document.status, ...(lifecycle.transitions[document.status] ?? [])])
        );
      } else {
        allowed = lifecycle.states;
      }
    }
    const currentStatus = document?.status ?? allowed[0] ?? '';
    statusControl = h(
      'select',
      { name: 'status', 'data-testid': 'document-status' },
      ...allowed.map((state) => option(state, state, state === currentStatus))
    );
  } else {
    statusControl = h('input', {
      type: 'text',
      name: 'status',
      value: document?.status ?? '',
      autocomplete: 'off',
      'data-testid': 'document-status'
    });
  }

  const aisleInput = h('input', {
    type: 'text',
    name: 'aisle',
    value: document?.aisle ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'document-aisle'
  });
  const shelfInput = h('input', {
    type: 'text',
    name: 'shelf',
    value: document?.shelf ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'document-shelf'
  });
  const levelInput = h('input', {
    type: 'text',
    name: 'level',
    value: document?.level ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'document-level'
  });

  const notesInput = h('textarea', { name: 'notes', 'data-testid': 'document-notes' });
  notesInput.value = document?.notes ?? '';

  const stockInfo = h('p', {
    class: 'hint',
    'data-testid': 'stock-info',
    role: 'status',
    'aria-live': 'polite'
  });
  const stockError = h('p', {
    class: 'alert alert-danger',
    'data-testid': 'stock-error',
    role: 'alert',
    hidden: true
  });

  const locationSection = h(
    'section',
    { class: 'panel', 'data-testid': 'location-section' },
    h(
      'div',
      { class: 'panel-header' },
      h('h3', {}, 'Ubicación física'),
      h('p', { class: 'panel-subtitle' }, 'Obligatoria para cada entrada de inventario.')
    ),
    h(
      'div',
      { class: 'form-grid' },
      formField({ label: 'Pasillo', name: 'aisle', control: aisleInput, required: true }),
      formField({ label: 'Estante', name: 'shelf', control: shelfInput, required: true }),
      formField({ label: 'Nivel', name: 'level', control: levelInput, required: true })
    )
  );

  const customFields = (config.customFields?.document ?? []).map((definition) => {
    const value = document?.customFields?.[definition.key] ?? '';
    return formField({
      label: definition.label,
      name: `customFields.${definition.key}`,
      control: customControl(definition, value),
      required: definition.required
    });
  });

  const formError = h('p', {
    class: 'alert alert-danger',
    'data-form-error': 'true',
    role: 'alert'
  });

  const saveButton = h(
    'button',
    { type: 'submit', class: 'button button-primary', 'data-testid': 'document-save' },
    isEditing ? `Guardar ${labels.singular}` : `Crear ${labels.singular}`
  );

  const cancelButton = h(
    'button',
    {
      type: 'button',
      class: 'button button-ghost',
      'data-testid': 'document-cancel',
      onclick: () => onCancel?.({ dirty })
    },
    'Cancelar'
  );

  const deleteButton = isEditing
    ? h(
        'button',
        {
          type: 'button',
          class: 'button button-danger',
          'data-testid': 'document-delete',
          onclick: () => onDelete?.(document)
        },
        `Eliminar ${labels.singular}`
      )
    : null;

  const form = h(
    'form',
    {
      class: 'stack',
      'data-testid': 'document-form',
      novalidate: true,
      oninput: () => {
        dirty = true;
        sync();
      },
      onchange: () => {
        dirty = true;
        sync();
      },
      onsubmit: (event) => {
        event.preventDefault();
        clearErrors(form);
        const values = {
          entity_id: entitySelect.value,
          type: typeSelect.value,
          quantity: quantityInput.value,
          status: statusControl.value,
          notes: notesInput.value,
          aisle: aisleInput.value,
          shelf: shelfInput.value,
          level: levelInput.value,
          customFields: {}
        };
        (config.customFields?.document ?? []).forEach((definition) => {
          const control = form.elements.namedItem(`custom_${definition.key}`);
          values.customFields[definition.key] = control?.value ?? '';
        });
        onSubmit?.(values);
      }
    },
    formError,
    stockError,
    h(
      'div',
      { class: 'form-grid' },
      formField({
        label: entityLabels.singular,
        name: 'entity_id',
        control: entitySelect,
        required: true,
        hint: 'Seleccione el registro al que pertenece el movimiento.'
      }),
      formField({
        label: 'Tipo',
        name: 'type',
        control: typeSelect,
        required: true,
        hint: 'Entrada incrementa el stock; salida lo descuenta.'
      }),
      formField({
        label: 'Cantidad',
        name: 'quantity',
        control: quantityInput,
        required: true,
        hint: 'Entero mayor que 0.'
      }),
      formField({
        label: 'Estado',
        name: 'status',
        control: statusControl,
        required: Boolean(lifecycle),
        hint: lifecycle ? 'Estados permitidos por el ciclo configurado.' : 'Texto libre.'
      }),
      ...customFields
    ),
    stockInfo,
    locationSection,
    formField({ label: 'Notas', name: 'notes', control: notesInput }),
    h('div', { class: 'form-actions' }, saveButton, cancelButton, deleteButton)
  );

  function sync() {
    const entity = entities.find((item) => item.entity_id === entitySelect.value);
    const isEntry = typeSelect.value === 'ENTRADA';
    const quantity = Number(quantityInput.value);
    const validQuantity = Number.isInteger(quantity) && quantity > 0;

    locationSection.hidden = !isEntry;
    const enableLocation = isEntry && Boolean(entitySelect.value) && validQuantity;
    [aisleInput, shelfInput, levelInput].forEach((input) => {
      input.disabled = !enableLocation;
    });
    if (!isEntry) {
      aisleInput.value = '';
      shelfInput.value = '';
      levelInput.value = '';
    }

    if (!entity) {
      stockInfo.textContent = 'Seleccione una entidad para ver el stock disponible.';
    } else {
      const available = computeAvailableStock(entity, document);
      stockInfo.textContent = `Stock disponible: ${available}`;
    }

    const available = entity ? computeAvailableStock(entity, document) : 0;
    const insufficient = !isEntry && Boolean(entity) && validQuantity && quantity > available;
    if (insufficient) {
      stockError.textContent = `Stock insuficiente: disponible ${available}, solicitado ${quantity}.`;
      stockError.hidden = false;
    } else {
      stockError.textContent = '';
      stockError.hidden = true;
    }
    saveButton.disabled = insufficient;
  }

  container.append(form);
  sync();

  return {
    form,
    isDirty: () => dirty,
    markClean: () => {
      dirty = false;
    },
    setErrors: (errors) => {
      applyErrors(form, errors);
      sync();
    },
    focusFirst: () => {
      const target =
        form.querySelector('[data-autofocus]') ?? form.querySelector('input, select, textarea');
      target?.focus();
    },
    sync,
    reset: () => {
      form.reset();
      dirty = false;
      clearErrors(form);
      sync();
    }
  };
}
