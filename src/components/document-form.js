import { applyErrors, clearErrors, formField, h, option } from './dom.js';
import {
  computeAvailableStock,
  createProductRequest,
  getFifoLocationSuggestion
} from '../storage.js';
import { MOVEMENT_TYPE_PERMISSIONS, hasPermission } from '../roles.js';

const MOVEMENT_TYPES = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SALIDA', label: 'Salida' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' }
];

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
  {
    config,
    entities = [],
    providers = [],
    document = null,
    actorPerson = 'local',
    role = '',
    onSubmit,
    onCancel,
    onDelete
  }
) {
  const labels = config.labels.document;
  const entityLabels = config.labels.entity;
  const lifecycle = config.statusLifecycle;
  const isEditing = Boolean(document);
  const canUseType = (type) => hasPermission(role, MOVEMENT_TYPE_PERMISSIONS[type]);
  const canRequestProduct = hasPermission(role, 'product.request');
  let dirty = false;
  let fifoLocation = null;

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

  const currentType = document?.type ?? 'ENTRADA';
  const allowedTypes = MOVEMENT_TYPES.filter(({ value }) => canUseType(value));
  const currentTypeAllowed = !document || allowedTypes.some(({ value }) => value === currentType);
  const typeOptions = [
    ...(currentTypeAllowed
      ? []
      : [
          h(
            'option',
            { value: currentType, selected: true, disabled: true },
            MOVEMENT_TYPES.find(({ value }) => value === currentType)?.label ?? currentType
          )
        ]),
    ...allowedTypes.map(({ value, label }) => option(value, label, currentType === value))
  ];
  const typeSelect = h('select', { name: 'type', 'data-testid': 'document-type' }, ...typeOptions);

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

  const fromAisleInput = h('input', {
    type: 'text',
    name: 'fromAisle',
    value: document?.fromAisle ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-from-aisle'
  });
  const fromShelfInput = h('input', {
    type: 'text',
    name: 'fromShelf',
    value: document?.fromShelf ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-from-shelf'
  });
  const fromLevelInput = h('input', {
    type: 'text',
    name: 'fromLevel',
    value: document?.fromLevel ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-from-level'
  });
  const toAisleInput = h('input', {
    type: 'text',
    name: 'toAisle',
    value: document?.toAisle ?? document?.aisle ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-to-aisle'
  });
  const toShelfInput = h('input', {
    type: 'text',
    name: 'toShelf',
    value: document?.toShelf ?? document?.shelf ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-to-shelf'
  });
  const toLevelInput = h('input', {
    type: 'text',
    name: 'toLevel',
    value: document?.toLevel ?? document?.level ?? '',
    disabled: true,
    autocomplete: 'off',
    'data-testid': 'transfer-to-level'
  });

  const reasonSelect = h(
    'select',
    { name: 'reason', 'data-testid': 'document-reason' },
    option('', 'Sin motivo', !document?.reason),
    option('Venta', 'Venta', document?.reason === 'Venta'),
    option('Consumo interno', 'Consumo interno', document?.reason === 'Consumo interno'),
    option('Merma', 'Merma', document?.reason === 'Merma'),
    option('Devolución', 'Devolución', document?.reason === 'Devolución')
  );

  const docRespaldoInput = h('input', {
    type: 'text',
    name: 'doc_respaldo',
    value: document?.doc_respaldo ?? '',
    autocomplete: 'off',
    placeholder: 'Ej. Guía de despacho N° 4521',
    'data-testid': 'document-doc-respaldo'
  });

  const providerSelect = h(
    'select',
    { name: 'providerId', 'data-testid': 'document-provider' },
    option('', 'Sin proveedor', !document?.providerId),
    ...providers.map((provider) =>
      option(
        provider.provider_id,
        `${provider.razon_social} (${provider.rut})`,
        provider.provider_id === document?.providerId
      )
    )
  );

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
  const fifoInfo = h('p', {
    class: 'hint',
    'data-testid': 'fifo-suggestion',
    role: 'status',
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

  const transferSection = h(
    'section',
    { class: 'panel', 'data-testid': 'transfer-section', hidden: true },
    h('div', { class: 'panel-header' }, h('h3', {}, 'Transferencia entre ubicaciones')),
    h(
      'div',
      { class: 'form-grid' },
      formField({
        label: 'Pasillo origen',
        name: 'fromAisle',
        control: fromAisleInput,
        required: true
      }),
      formField({
        label: 'Estante origen',
        name: 'fromShelf',
        control: fromShelfInput,
        required: true
      }),
      formField({
        label: 'Nivel origen',
        name: 'fromLevel',
        control: fromLevelInput,
        required: true
      }),
      formField({
        label: 'Pasillo destino',
        name: 'toAisle',
        control: toAisleInput,
        required: true
      }),
      formField({
        label: 'Estante destino',
        name: 'toShelf',
        control: toShelfInput,
        required: true
      }),
      formField({ label: 'Nivel destino', name: 'toLevel', control: toLevelInput, required: true })
    )
  );

  const requestNameInput = h('input', {
    type: 'text',
    name: 'requestName',
    autocomplete: 'off',
    placeholder: 'Nombre del producto faltante',
    'data-testid': 'product-request-name'
  });
  const requestCodeInput = h('input', {
    type: 'text',
    name: 'requestCode',
    autocomplete: 'off',
    placeholder: 'Código/SKU tentativo',
    'data-testid': 'product-request-code'
  });
  const requestCategoryInput = h('input', {
    type: 'text',
    name: 'requestCategory',
    autocomplete: 'off',
    placeholder: 'Categoría',
    'data-testid': 'product-request-category'
  });
  const requestNotice = h('p', {
    class: 'hint',
    'data-testid': 'product-request-notice',
    role: 'status',
    'aria-live': 'polite'
  });

  const productRequestSection = h(
    'section',
    { class: 'panel', 'data-testid': 'product-request-section' },
    h(
      'div',
      { class: 'panel-header' },
      h('h3', {}, '¿Producto no existe?'),
      h(
        'p',
        { class: 'panel-subtitle' },
        'Envíe una solicitud de alta al administrador. El operador no crea el producto directamente.'
      )
    ),
    h(
      'div',
      { class: 'form-grid' },
      formField({
        label: 'Nombre',
        name: 'requestName',
        control: requestNameInput,
        required: true
      }),
      formField({ label: 'Código/SKU', name: 'requestCode', control: requestCodeInput }),
      formField({ label: 'Categoría', name: 'requestCategory', control: requestCategoryInput })
    ),
    h(
      'div',
      { class: 'actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'button',
          'data-testid': 'product-request-submit',
          onclick: () => {
            try {
              const request = createProductRequest({
                name: requestNameInput.value,
                code: requestCodeInput.value,
                category: requestCategoryInput.value,
                actorPerson
              });
              requestNotice.textContent = `Solicitud enviada: ${request.request_id}`;
              requestNameInput.value = '';
              requestCodeInput.value = '';
              requestCategoryInput.value = '';
            } catch (error) {
              requestNotice.textContent =
                error?.errors?.name ?? error?.message ?? 'No se pudo enviar la solicitud.';
            }
          }
        },
        'Enviar solicitud de alta'
      )
    ),
    requestNotice
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

  const deleteButton =
    isEditing && canUseType(document.type)
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
        const isTransfer = typeSelect.value === 'TRANSFERENCIA';
        const values = {
          entity_id: entitySelect.value,
          type: typeSelect.value,
          quantity: quantityInput.value,
          reason: reasonSelect.value,
          status: statusControl.value,
          notes: notesInput.value,
          doc_respaldo: docRespaldoInput.value,
          providerId: providerSelect.value,
          fifoAisle: fifoLocation?.aisle ?? '',
          fifoShelf: fifoLocation?.shelf ?? '',
          fifoLevel: fifoLocation?.level ?? '',
          aisle: isTransfer ? toAisleInput.value : aisleInput.value,
          shelf: isTransfer ? toShelfInput.value : shelfInput.value,
          level: isTransfer ? toLevelInput.value : levelInput.value,
          fromAisle: fromAisleInput.value,
          fromShelf: fromShelfInput.value,
          fromLevel: fromLevelInput.value,
          toAisle: toAisleInput.value,
          toShelf: toShelfInput.value,
          toLevel: toLevelInput.value,
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
      formField({
        label: 'Motivo (salida)',
        name: 'reason',
        control: reasonSelect,
        hint: 'Requerido como observación obligatoria cuando el motivo es Merma.'
      }),
      formField({
        label: 'Documento de respaldo',
        name: 'doc_respaldo',
        control: docRespaldoInput,
        hint: 'Obligatorio para entradas (guía, factura o documento equivalente).'
      }),
      formField({
        label: 'Proveedor',
        name: 'providerId',
        control: providerSelect,
        hint: 'Proveedor asociado a la entrada, si aplica.'
      }),
      ...customFields
    ),
    stockInfo,
    fifoInfo,
    locationSection,
    transferSection,
    formField({ label: 'Notas', name: 'notes', control: notesInput }),
    canRequestProduct ? productRequestSection : null,
    h('div', { class: 'form-actions' }, saveButton, cancelButton, deleteButton)
  );

  function sync() {
    const entity = entities.find((item) => item.entity_id === entitySelect.value);
    const type = typeSelect.value;
    const isEntry = type === 'ENTRADA';
    const isTransfer = type === 'TRANSFERENCIA';
    const isOutbound = type === 'SALIDA' || isTransfer;
    const quantity = Number(quantityInput.value);
    const validQuantity = Number.isInteger(quantity) && quantity > 0;

    locationSection.hidden = !isEntry;
    transferSection.hidden = !isTransfer;

    const enableEntryLocation = isEntry && Boolean(entitySelect.value) && validQuantity;
    [aisleInput, shelfInput, levelInput].forEach((input) => {
      input.disabled = !enableEntryLocation;
    });
    if (!isEntry) {
      aisleInput.value = '';
      shelfInput.value = '';
      levelInput.value = '';
    }

    const enableTransferLocation = isTransfer && Boolean(entitySelect.value) && validQuantity;
    [
      fromAisleInput,
      fromShelfInput,
      fromLevelInput,
      toAisleInput,
      toShelfInput,
      toLevelInput
    ].forEach((input) => {
      input.disabled = !enableTransferLocation;
    });
    if (!isTransfer) {
      fromAisleInput.value = '';
      fromShelfInput.value = '';
      fromLevelInput.value = '';
      toAisleInput.value = '';
      toShelfInput.value = '';
      toLevelInput.value = '';
    }

    if (!entity) {
      stockInfo.textContent = 'Seleccione una entidad para ver el stock disponible.';
    } else {
      const available = computeAvailableStock(entity, document);
      stockInfo.textContent = `Stock disponible: ${available}`;
    }

    if (type === 'SALIDA' && entity) {
      fifoLocation = getFifoLocationSuggestion(entity.entity_id);
      if (fifoLocation) {
        const location = [fifoLocation.aisle, fifoLocation.shelf, fifoLocation.level]
          .filter(Boolean)
          .join('-');
        fifoInfo.textContent = `Sugerencia FIFO (entrada más antigua): ${location}`;
        fifoInfo.hidden = false;
      } else {
        fifoInfo.textContent = '';
        fifoInfo.hidden = true;
      }
    } else {
      fifoLocation = null;
      fifoInfo.textContent = '';
      fifoInfo.hidden = true;
    }

    const available = entity ? computeAvailableStock(entity, document) : 0;
    const insufficient = isOutbound && Boolean(entity) && validQuantity && quantity > available;
    if (insufficient) {
      stockError.textContent = `Stock insuficiente: disponible ${available}, solicitado ${quantity}.`;
      stockError.hidden = false;
    } else {
      stockError.textContent = '';
      stockError.hidden = true;
    }
    saveButton.disabled = insufficient || !canUseType(typeSelect.value);
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
