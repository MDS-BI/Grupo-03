import { applyErrors, clearErrors, formField, h, option } from './dom.js';

const UNIT_OPTIONS = ['Unidades', 'Cajas', 'Kg', 'Litros'];

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

export function renderEntityForm(
  container,
  { config, entity = null, categories = [], onSubmit, onCancel, onDelete }
) {
  const labels = config.labels.entity;
  const isEditing = Boolean(entity);
  let dirty = false;

  const nameInput = h('input', {
    type: 'text',
    name: 'name',
    value: entity?.name ?? '',
    autocomplete: 'off',
    'data-autofocus': 'true',
    'data-testid': 'entity-name'
  });
  const codeInput = h('input', {
    type: 'text',
    name: 'code',
    value: entity?.code ?? '',
    autocomplete: 'off',
    'data-testid': 'entity-code'
  });
  const categoryInput = h('input', {
    type: 'text',
    name: 'category',
    value: entity?.category ?? '',
    list: 'entity-categories',
    autocomplete: 'off',
    'data-testid': 'entity-category'
  });
  const descriptionInput = h('textarea', {
    name: 'description',
    'data-testid': 'entity-description'
  });
  descriptionInput.value = entity?.description ?? '';
  const targetDateInput = h('input', {
    type: 'date',
    name: 'targetDate',
    value: entity?.targetDate ?? '',
    'data-testid': 'entity-target-date'
  });
  const unitOfMeasureInput = h(
    'select',
    { name: 'unitOfMeasure', 'data-testid': 'entity-unit' },
    option('', 'Sin especificar', !entity?.unitOfMeasure),
    ...UNIT_OPTIONS.map((unit) => option(unit, unit, unit === entity?.unitOfMeasure))
  );
  const reorderPointInput = h('input', {
    type: 'number',
    name: 'reorderPoint',
    value: entity?.reorderPoint ?? '',
    min: '0',
    step: 'any',
    'data-testid': 'entity-reorder-point'
  });
  const unitCostInput = h('input', {
    type: 'number',
    name: 'unitCost',
    value: entity?.unitCost ?? '',
    min: '0',
    step: '0.01',
    'data-testid': 'entity-unit-cost'
  });

  const customFields = (config.customFields?.entity ?? []).map((definition) => {
    const value = entity?.customFields?.[definition.key] ?? '';
    return formField({
      label: definition.label,
      name: `customFields.${definition.key}`,
      control: customControl(definition, value),
      required: definition.required,
      hint:
        definition.type === 'select'
          ? 'Seleccione una opción.'
          : definition.type === 'number'
            ? 'Valor numérico.'
            : undefined
    });
  });

  const datalist = h(
    'datalist',
    { id: 'entity-categories' },
    ...categories.map((category) => h('option', { value: category }))
  );

  const formError = h('p', {
    class: 'alert alert-danger',
    'data-form-error': 'true',
    role: 'alert'
  });

  const submitButton = h(
    'button',
    { type: 'submit', class: 'button button-primary', 'data-testid': 'entity-save' },
    isEditing ? `Guardar ${labels.singular}` : `Crear ${labels.singular}`
  );

  const cancelButton = h(
    'button',
    {
      type: 'button',
      class: 'button button-ghost',
      'data-testid': 'entity-cancel',
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
          'data-testid': 'entity-delete',
          onclick: () => onDelete?.(entity)
        },
        `Eliminar ${labels.singular}`
      )
    : null;

  const form = h(
    'form',
    {
      class: 'stack',
      'data-testid': 'entity-form',
      novalidate: true,
      oninput: () => {
        dirty = true;
      },
      onchange: () => {
        dirty = true;
      },
      onsubmit: (event) => {
        event.preventDefault();
        clearErrors(form);
        const values = {
          name: nameInput.value,
          code: codeInput.value,
          category: categoryInput.value,
          description: descriptionInput.value,
          targetDate: targetDateInput.value,
          unitOfMeasure: unitOfMeasureInput.value,
          reorderPoint: reorderPointInput.value,
          unitCost: unitCostInput.value,
          customFields: {}
        };
        (config.customFields?.entity ?? []).forEach((definition) => {
          const control = form.elements.namedItem(`custom_${definition.key}`);
          values.customFields[definition.key] = control?.value ?? '';
        });
        onSubmit?.(values);
      }
    },
    formError,
    h(
      'div',
      { class: 'form-grid' },
      formField({
        label: 'Nombre',
        name: 'name',
        control: nameInput,
        required: true,
        hint: `Nombre visible de ${labels.article} ${labels.singular.toLowerCase()}.`
      }),
      formField({
        label: 'Código',
        name: 'code',
        control: codeInput,
        required: true,
        hint: 'Identificador de negocio (por ejemplo, SKU).'
      }),
      formField({
        label: 'Categoría',
        name: 'category',
        control: categoryInput,
        required: true,
        hint: 'Seleccione una categoría existente o escriba una nueva.'
      }),
      formField({
        label: 'Fecha objetivo',
        name: 'targetDate',
        control: targetDateInput,
        hint: 'Fecha de calendario opcional.'
      }),
      formField({
        label: 'Unidad de medida',
        name: 'unitOfMeasure',
        control: unitOfMeasureInput
      }),
      formField({
        label: 'Punto de reorden',
        name: 'reorderPoint',
        control: reorderPointInput,
        hint: 'Umbral para marcar stock crítico.'
      }),
      formField({
        label: 'Costo unitario',
        name: 'unitCost',
        control: unitCostInput,
        hint: 'Solo se usa para la valoración del catálogo y del panel.'
      }),
      ...customFields
    ),
    datalist,
    h('div', { class: 'form-actions' }, submitButton, cancelButton, deleteButton)
  );

  container.append(form);

  return {
    form,
    isDirty: () => dirty,
    markClean: () => {
      dirty = false;
    },
    setErrors: (errors) => applyErrors(form, errors),
    focusFirst: () => {
      const target =
        form.querySelector('[data-autofocus]') ?? form.querySelector('input, select, textarea');
      target?.focus();
    },
    reset: () => {
      form.reset();
      dirty = false;
      clearErrors(form);
    }
  };
}
