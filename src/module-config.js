export const BASE_FIELD_KEYS = new Set([
  'entity_id',
  'name',
  'code',
  'category',
  'description',
  'targetDate',
  'unitOfMeasure',
  'reorderPoint',
  'unitCost',
  'stockBalance',
  'customFields',
  'createdAt',
  'updatedAt',
  'document_id',
  'type',
  'quantity',
  'aisle',
  'shelf',
  'level',
  'notes',
  'status'
]);

const NAMED_COLORS = new Set([
  'black',
  'silver',
  'gray',
  'white',
  'maroon',
  'red',
  'purple',
  'fuchsia',
  'green',
  'lime',
  'olive',
  'yellow',
  'navy',
  'blue',
  'teal',
  'aqua',
  'orange',
  'aliceblue',
  'rebeccapurple',
  'transparent'
]);

export function isValidAccentColor(value) {
  if (typeof value !== 'string') return false;
  const color = value.trim();
  if (!color) return false;
  if (NAMED_COLORS.has(color.toLowerCase())) return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return true;
  if (
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)
  ) {
    return true;
  }
  if (
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)
  ) {
    return true;
  }
  return false;
}

export function createDefaultConfig() {
  return {
    moduleName: 'ERP',
    labels: {
      entity: { singular: 'Entidad', plural: 'Entidades', article: 'la' },
      document: { singular: 'Documento', plural: 'Documentos', article: 'el' },
      dashboard: 'Panel',
      search: 'Buscar',
      manage: 'Gestión'
    },
    customFields: { entity: [], document: [] },
    statusLifecycle: null,
    theme: { accentColor: null },
    customValidators: {}
  };
}

export const defaultConfig = createDefaultConfig();

export const userConfig = {
  moduleName: 'Logística e Inventario',
  labels: {
    entity: { singular: 'Producto', plural: 'Productos', article: 'el' },
    document: { singular: 'Movimiento de Inventario', plural: 'Movimientos', article: 'el' },
    dashboard: 'Panel',
    search: 'Buscar',
    manage: 'Gestión'
  },
  customFields: {
    entity: [
      { key: 'sku', label: 'SKU', type: 'text', required: true },
      { key: 'punto_reorden', label: 'Punto de reorden', type: 'number', required: true, min: 0 },
      {
        key: 'unidad_medida',
        label: 'Unidad de medida',
        type: 'select',
        required: false,
        options: ['Unidades', 'Cajas', 'Kg', 'Litros']
      }
    ],
    document: [
      {
        key: 'tipo_movimiento',
        label: 'Tipo de movimiento',
        type: 'select',
        required: false,
        options: ['Entrada', 'Salida']
      }
    ]
  },
  statusLifecycle: {
    states: ['Borrador', 'Pendiente', 'Completado', 'Cancelado'],
    transitions: {
      Borrador: ['Pendiente', 'Cancelado'],
      Pendiente: ['Completado', 'Cancelado'],
      Completado: [],
      Cancelado: []
    }
  },
  theme: {
    accentColor: '#1f6feb'
  }
};

function readLabel(value, path, fallback, errors) {
  if (value === undefined) return fallback;
  if (typeof value === 'string' && value.trim()) return value.trim();
  errors.push(`La etiqueta "${path}" debe ser un texto no vacío.`);
  return fallback;
}

function readLabelGroup(value, path, fallback, errors) {
  if (value === undefined) return { ...fallback };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`El grupo de etiquetas "${path}" debe ser un objeto.`);
    return { ...fallback };
  }
  return {
    singular: readLabel(value.singular, `${path}.singular`, fallback.singular, errors),
    plural: readLabel(value.plural, `${path}.plural`, fallback.plural, errors),
    article: readLabel(value.article, `${path}.article`, fallback.article, errors)
  };
}

function normalizeCustomFields(defs, kind, errors) {
  if (defs === undefined) return [];
  if (!Array.isArray(defs)) {
    errors.push(`customFields.${kind} debe ser un arreglo de definiciones.`);
    return [];
  }

  const seen = new Set();
  const valid = [];

  defs.forEach((def, index) => {
    const path = `customFields.${kind}[${index}]`;
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      errors.push(`La definición ${path} debe ser un objeto.`);
      return;
    }

    const key = typeof def.key === 'string' ? def.key.trim() : '';
    if (!key) {
      errors.push(`La definición ${path} requiere una clave no vacía.`);
      return;
    }
    if (BASE_FIELD_KEYS.has(key)) {
      errors.push(`La clave de campo personalizado "${key}" choca con un campo base y se ignoró.`);
      return;
    }
    if (seen.has(key)) {
      errors.push(`La clave de campo personalizado "${key}" está duplicada y se ignoró.`);
      return;
    }
    seen.add(key);

    const label = typeof def.label === 'string' && def.label.trim() ? def.label.trim() : '';
    if (!label) {
      errors.push(`El campo personalizado "${key}" requiere una etiqueta no vacía.`);
      return;
    }

    if (!['text', 'number', 'date', 'select'].includes(def.type)) {
      errors.push(`El campo personalizado "${key}" usa un tipo desconocido: "${def.type}".`);
      return;
    }

    const field = { key, label, type: def.type, required: def.required === true };

    if (def.type === 'number') {
      if (def.min !== undefined) {
        if (typeof def.min === 'number' && Number.isFinite(def.min)) field.min = def.min;
        else errors.push(`El campo personalizado "${key}" tiene un "min" inválido.`);
      }
      if (def.max !== undefined) {
        if (typeof def.max === 'number' && Number.isFinite(def.max)) field.max = def.max;
        else errors.push(`El campo personalizado "${key}" tiene un "max" inválido.`);
      }
    }

    if (def.type === 'select') {
      if (
        !Array.isArray(def.options) ||
        def.options.length === 0 ||
        def.options.some((option) => typeof option !== 'string' || !option.trim())
      ) {
        errors.push(`El campo personalizado "${key}" requiere opciones no vacías.`);
        return;
      }
      field.options = def.options.map((option) => option.trim());
    }

    valid.push(field);
  });

  return valid;
}

function normalizeStatusLifecycle(lifecycle, errors) {
  if (lifecycle === null) return null;
  if (!lifecycle || typeof lifecycle !== 'object' || Array.isArray(lifecycle)) {
    errors.push('statusLifecycle debe ser un objeto o null.');
    return null;
  }
  if (!Array.isArray(lifecycle.states) || lifecycle.states.length === 0) {
    errors.push('statusLifecycle.states debe ser un arreglo no vacío.');
    return null;
  }

  const states = [];
  const seen = new Set();
  for (const state of lifecycle.states) {
    if (typeof state !== 'string' || !state.trim()) {
      errors.push('Cada estado del ciclo de vida debe ser un texto no vacío.');
      return null;
    }
    const value = state.trim();
    if (seen.has(value)) {
      errors.push(`El estado "${value}" está duplicado en el ciclo de vida.`);
      return null;
    }
    seen.add(value);
    states.push(value);
  }

  const transitions = {};
  states.forEach((state) => {
    transitions[state] = [];
  });

  if (lifecycle.transitions !== undefined) {
    if (
      !lifecycle.transitions ||
      typeof lifecycle.transitions !== 'object' ||
      Array.isArray(lifecycle.transitions)
    ) {
      errors.push('statusLifecycle.transitions debe ser un objeto.');
      return null;
    }
    for (const [from, targets] of Object.entries(lifecycle.transitions)) {
      if (!seen.has(from)) {
        errors.push(`La transición parte de un estado no declarado: "${from}".`);
        return null;
      }
      if (!Array.isArray(targets)) {
        errors.push(`Las transiciones del estado "${from}" deben ser un arreglo.`);
        return null;
      }
      const next = [];
      for (const target of targets) {
        if (typeof target !== 'string' || !seen.has(target.trim())) {
          errors.push(`La transición "${from}" apunta a un estado no declarado: "${target}".`);
          return null;
        }
        next.push(target.trim());
      }
      transitions[from] = Array.from(new Set(next));
    }
  }

  return { states, transitions };
}

export function loadModuleConfig(rawConfig) {
  const errors = [];
  const config = createDefaultConfig();

  if (rawConfig === undefined || rawConfig === null) {
    return { config, errors };
  }
  if (typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    errors.push('La configuración del módulo debe ser un objeto.');
    return { config, errors };
  }

  if (rawConfig.moduleName !== undefined) {
    if (typeof rawConfig.moduleName === 'string' && rawConfig.moduleName.trim()) {
      config.moduleName = rawConfig.moduleName.trim();
    } else {
      errors.push('moduleName debe ser un texto no vacío.');
    }
  }

  if (rawConfig.labels !== undefined) {
    if (
      !rawConfig.labels ||
      typeof rawConfig.labels !== 'object' ||
      Array.isArray(rawConfig.labels)
    ) {
      errors.push('labels debe ser un objeto.');
    } else {
      const labels = rawConfig.labels;
      config.labels.entity = readLabelGroup(
        labels.entity,
        'labels.entity',
        config.labels.entity,
        errors
      );
      config.labels.document = readLabelGroup(
        labels.document,
        'labels.document',
        config.labels.document,
        errors
      );
      config.labels.dashboard = readLabel(
        labels.dashboard,
        'labels.dashboard',
        config.labels.dashboard,
        errors
      );
      config.labels.search = readLabel(
        labels.search,
        'labels.search',
        config.labels.search,
        errors
      );
      config.labels.manage = readLabel(
        labels.manage,
        'labels.manage',
        config.labels.manage,
        errors
      );
    }
  }

  if (rawConfig.customFields !== undefined) {
    if (
      !rawConfig.customFields ||
      typeof rawConfig.customFields !== 'object' ||
      Array.isArray(rawConfig.customFields)
    ) {
      errors.push('customFields debe ser un objeto con arreglos entity y document.');
    } else {
      config.customFields.entity = normalizeCustomFields(
        rawConfig.customFields.entity,
        'entity',
        errors
      );
      config.customFields.document = normalizeCustomFields(
        rawConfig.customFields.document,
        'document',
        errors
      );
    }
  }

  if (rawConfig.statusLifecycle !== undefined) {
    config.statusLifecycle = normalizeStatusLifecycle(rawConfig.statusLifecycle, errors);
  }

  if (rawConfig.theme !== undefined) {
    if (!rawConfig.theme || typeof rawConfig.theme !== 'object' || Array.isArray(rawConfig.theme)) {
      errors.push('theme debe ser un objeto.');
    } else if (rawConfig.theme.accentColor !== undefined) {
      const accent = rawConfig.theme.accentColor;
      if (accent === null || accent === '') {
        config.theme.accentColor = null;
      } else if (isValidAccentColor(accent)) {
        config.theme.accentColor = accent.trim();
      } else {
        errors.push('El color de acento configurado no es válido; se usará el color base.');
        config.theme.accentColor = null;
      }
    }
  }

  if (rawConfig.customValidators !== undefined) {
    if (
      !rawConfig.customValidators ||
      typeof rawConfig.customValidators !== 'object' ||
      Array.isArray(rawConfig.customValidators)
    ) {
      errors.push('customValidators debe ser un objeto con funciones entity/document.');
    } else {
      for (const kind of ['entity', 'document']) {
        const validator = rawConfig.customValidators[kind];
        if (validator === undefined) continue;
        if (typeof validator === 'function') {
          config.customValidators[kind] = validator;
        } else {
          errors.push(`customValidators.${kind} debe ser una función.`);
        }
      }
    }
  }

  return { config, errors };
}
