export const STORAGE_KEYS = {
  entities: 'erp.entities',
  documents: 'erp.documents'
};

export class ValidationError extends Error {
  constructor(errors, message = 'Datos inválidos.') {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'El registro ya no existe.') {
    super(message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
  }
}

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readCollection(key) {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollection(key, value) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function generateId(prefix) {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return `${prefix}_${cryptoObject.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function isBlank(value) {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

function trimString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseOptionalNumber(value) {
  if (isBlank(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function parseQuantity(value) {
  if (isBlank(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function mergeErrors(target, extra) {
  if (!extra) return;
  if (typeof extra === 'string') {
    target._form = extra;
    return;
  }
  if (typeof extra === 'object') {
    Object.assign(target, extra);
  }
}

function validateOptionalNumber(value, field, label, errors) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors[field] = `${label} debe ser un número válido.`;
    return;
  }
  if (value < 0) {
    errors[field] = `${label} debe ser mayor o igual a 0.`;
  }
}

function validateCustomFields(values, definitions, prefix, errors) {
  definitions.forEach((definition) => {
    const path = `${prefix}.${definition.key}`;
    const raw = values[definition.key];
    if (isBlank(raw)) {
      if (definition.required) {
        errors[path] = `El campo "${definition.label}" es obligatorio.`;
      }
      return;
    }
    if (definition.type === 'number') {
      const number = Number(raw);
      if (!Number.isFinite(number)) {
        errors[path] = `El campo "${definition.label}" debe ser numérico.`;
        return;
      }
      if (definition.min !== undefined && number < definition.min) {
        errors[path] = `El campo "${definition.label}" debe ser mayor o igual a ${definition.min}.`;
        return;
      }
      if (definition.max !== undefined && number > definition.max) {
        errors[path] = `El campo "${definition.label}" debe ser menor o igual a ${definition.max}.`;
      }
    } else if (definition.type === 'date') {
      if (!isValidDate(String(raw))) {
        errors[path] = `El campo "${definition.label}" debe ser una fecha válida.`;
      }
    } else if (definition.type === 'select') {
      if (!definition.options.includes(String(raw))) {
        errors[path] = `El campo "${definition.label}" debe ser una opción válida.`;
      }
    }
  });
}

function coerceCustomFieldValue(definition, raw) {
  if (isBlank(raw)) return '';
  if (definition.type === 'number') {
    const number = Number(raw);
    return Number.isFinite(number) ? number : raw;
  }
  return typeof raw === 'string' ? raw.trim() : raw;
}

function normalizeCustomValues(values, definitions) {
  const source = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  const result = { ...source };
  definitions.forEach((definition) => {
    if (Object.prototype.hasOwnProperty.call(source, definition.key)) {
      result[definition.key] = coerceCustomFieldValue(definition, source[definition.key]);
    }
  });
  return result;
}

export function normalizeEntityInput(input = {}, config = {}) {
  const definitions = config?.customFields?.entity ?? [];
  const normalized = {
    name: trimString(input.name),
    code: trimString(input.code),
    category: trimString(input.category),
    description: trimString(input.description),
    targetDate: trimString(input.targetDate),
    unitOfMeasure: trimString(input.unitOfMeasure),
    customFields: normalizeCustomValues(input.customFields, definitions)
  };

  const reorderPoint = parseOptionalNumber(input.reorderPoint);
  if (reorderPoint !== undefined) normalized.reorderPoint = reorderPoint;

  const unitCost = parseOptionalNumber(input.unitCost);
  if (unitCost !== undefined) normalized.unitCost = unitCost;

  return normalized;
}

export function validateEntity(input, config = {}) {
  const errors = {};
  if (isBlank(input.name)) errors.name = 'El nombre es obligatorio.';
  if (isBlank(input.code)) errors.code = 'El código es obligatorio.';
  if (isBlank(input.category)) errors.category = 'La categoría es obligatoria.';
  if (!isBlank(input.targetDate) && !isValidDate(input.targetDate)) {
    errors.targetDate = 'La fecha objetivo no es una fecha de calendario válida.';
  }

  validateOptionalNumber(input.reorderPoint, 'reorderPoint', 'El punto de reorden', errors);
  validateOptionalNumber(input.unitCost, 'unitCost', 'El costo unitario', errors);

  const customValues =
    input.customFields && typeof input.customFields === 'object' ? input.customFields : {};
  validateCustomFields(customValues, config?.customFields?.entity ?? [], 'customFields', errors);

  if (typeof config?.customValidators?.entity === 'function') {
    mergeErrors(errors, config.customValidators.entity({ ...input, customFields: customValues }));
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function loadEntities() {
  return readCollection(STORAGE_KEYS.entities);
}

export function saveEntities(entities) {
  writeCollection(STORAGE_KEYS.entities, Array.isArray(entities) ? entities : []);
}

export function getEntity(entityId) {
  return loadEntities().find((entity) => entity.entity_id === entityId) ?? null;
}

export function addEntity(input, config = {}) {
  const normalized = normalizeEntityInput(input, config);
  const { valid, errors } = validateEntity(normalized, config);
  if (!valid) throw new ValidationError(errors);

  const entities = loadEntities();
  const timestamp = nowIso();
  const entity = {
    entity_id: generateId('ent'),
    ...normalized,
    stockBalance: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  entities.push(entity);
  saveEntities(entities);
  return clone(entity);
}

export function updateEntity(entityId, updates = {}, config = {}) {
  const entities = loadEntities();
  const index = entities.findIndex((entity) => entity.entity_id === entityId);
  if (index === -1) throw new NotFoundError('La entidad ya no existe.');

  const existing = entities[index];
  const merged = {
    ...existing,
    ...updates,
    customFields: {
      ...(existing.customFields ?? {}),
      ...(updates.customFields ?? {})
    }
  };
  const normalized = normalizeEntityInput(merged, config);
  normalized.stockBalance = existing.stockBalance;

  const { valid, errors } = validateEntity(normalized, config);
  if (!valid) throw new ValidationError(errors);

  const updated = {
    ...existing,
    ...normalized,
    entity_id: existing.entity_id,
    stockBalance: existing.stockBalance,
    createdAt: existing.createdAt,
    updatedAt: nowIso()
  };
  entities[index] = updated;
  saveEntities(entities);
  return clone(updated);
}

export function deleteEntity(entityId) {
  const entities = loadEntities();
  const remaining = entities.filter((entity) => entity.entity_id !== entityId);
  if (remaining.length === entities.length) throw new NotFoundError('La entidad ya no existe.');
  saveEntities(remaining);
  deleteDocumentsForEntity(entityId);
}

export function normalizeDocumentInput(input = {}, config = {}) {
  const type = typeof input.type === 'string' ? input.type.trim().toUpperCase() : '';
  const normalized = {
    entity_id: trimString(input.entity_id),
    type,
    quantity: parseQuantity(input.quantity),
    notes: trimString(input.notes),
    status: typeof input.status === 'string' ? input.status.trim() : '',
    customFields: normalizeCustomValues(input.customFields, config?.customFields?.document ?? [])
  };

  if (type === 'ENTRADA') {
    normalized.aisle = trimString(input.aisle);
    normalized.shelf = trimString(input.shelf);
    normalized.level = trimString(input.level);
  } else {
    normalized.aisle = '';
    normalized.shelf = '';
    normalized.level = '';
  }

  return normalized;
}

export function computeAvailableStock(entity, existingDocument = null) {
  if (!entity) return 0;
  let available = Number(entity.stockBalance) || 0;
  if (existingDocument && existingDocument.entity_id === entity.entity_id) {
    if (existingDocument.type === 'ENTRADA') {
      available -= Number(existingDocument.quantity) || 0;
    } else if (existingDocument.type === 'SALIDA') {
      available += Number(existingDocument.quantity) || 0;
    }
  }
  return Math.max(0, available);
}

export function getAvailableStock(entityId, existingDocument = null) {
  return computeAvailableStock(getEntity(entityId), existingDocument);
}

export function validateDocument(
  input,
  config = {},
  entities = loadEntities(),
  existingDocument = null
) {
  const errors = {};
  const entity = entities.find((item) => item.entity_id === input.entity_id);

  if (isBlank(input.entity_id)) {
    errors.entity_id = 'Seleccione una entidad.';
  } else if (!entity) {
    errors.entity_id = 'La entidad seleccionada no existe.';
  }

  if (!['ENTRADA', 'SALIDA'].includes(input.type)) {
    errors.type = 'Seleccione un tipo de movimiento válido.';
  }

  if (isBlank(input.quantity)) {
    errors.quantity = 'La cantidad es obligatoria.';
  } else if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    errors.quantity = 'La cantidad debe ser un entero mayor que 0.';
  }

  if (input.type === 'ENTRADA') {
    if (isBlank(input.aisle)) errors.aisle = 'El pasillo es obligatorio para una entrada.';
    if (isBlank(input.shelf)) errors.shelf = 'El estante es obligatorio para una entrada.';
    if (isBlank(input.level)) errors.level = 'El nivel es obligatorio para una entrada.';
  }

  if (input.type === 'SALIDA' && entity && Number.isInteger(input.quantity) && input.quantity > 0) {
    const available = computeAvailableStock(entity, existingDocument);
    if (input.quantity > available) {
      errors.quantity = `Stock insuficiente: disponible ${available}, solicitado ${input.quantity}.`;
    }
  }

  if (config?.statusLifecycle) {
    const { states, transitions } = config.statusLifecycle;
    const status = input.status;
    if (isBlank(status)) {
      errors.status = 'Seleccione un estado.';
    } else if (
      !states.includes(status) &&
      !(existingDocument && status === existingDocument.status)
    ) {
      errors.status = 'El estado seleccionado no está permitido.';
    } else if (existingDocument && existingDocument.status && status !== existingDocument.status) {
      const allowed = transitions[existingDocument.status] ?? [];
      if (!allowed.includes(status)) {
        errors.status = `Transición no permitida: ${existingDocument.status} → ${status}.`;
      }
    }
  }

  const customValues =
    input.customFields && typeof input.customFields === 'object' ? input.customFields : {};
  validateCustomFields(customValues, config?.customFields?.document ?? [], 'customFields', errors);

  if (typeof config?.customValidators?.document === 'function') {
    mergeErrors(errors, config.customValidators.document({ ...input, entity }));
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function loadDocuments() {
  return readCollection(STORAGE_KEYS.documents);
}

export function saveDocuments(documents) {
  writeCollection(STORAGE_KEYS.documents, Array.isArray(documents) ? documents : []);
}

export function getDocument(documentId) {
  return loadDocuments().find((document) => document.document_id === documentId) ?? null;
}

function applyStockEffect(entity, document, direction) {
  if (!entity) return;
  const quantity = (Number(document.quantity) || 0) * direction;
  const balance = Number(entity.stockBalance) || 0;
  entity.stockBalance = document.type === 'ENTRADA' ? balance + quantity : balance - quantity;
}

export function addDocument(input, config = {}) {
  const entities = loadEntities();
  const normalized = normalizeDocumentInput(input, config);
  if (config?.statusLifecycle && isBlank(normalized.status)) {
    normalized.status = config.statusLifecycle.states[0];
  }

  const { valid, errors } = validateDocument(normalized, config, entities, null);
  if (!valid) throw new ValidationError(errors);

  const entity = entities.find((item) => item.entity_id === normalized.entity_id);
  const document = {
    document_id: generateId('doc'),
    ...normalized,
    createdAt: nowIso()
  };

  applyStockEffect(entity, document, 1);
  entity.updatedAt = nowIso();
  saveEntities(entities);

  const documents = loadDocuments();
  documents.push(document);
  saveDocuments(documents);
  return clone(document);
}

export function updateDocument(documentId, updates = {}, config = {}) {
  const documents = loadDocuments();
  const index = documents.findIndex((document) => document.document_id === documentId);
  if (index === -1) throw new NotFoundError('El documento ya no existe.');

  const existing = documents[index];
  const merged = {
    ...existing,
    ...updates,
    customFields: {
      ...(existing.customFields ?? {}),
      ...(updates.customFields ?? {})
    }
  };

  const entities = loadEntities();
  const normalized = normalizeDocumentInput(merged, config);
  const { valid, errors } = validateDocument(normalized, config, entities, existing);
  if (!valid) throw new ValidationError(errors);

  const oldEntity = entities.find((entity) => entity.entity_id === existing.entity_id);
  if (oldEntity) {
    applyStockEffect(oldEntity, existing, -1);
    oldEntity.updatedAt = nowIso();
  }

  const newEntity = entities.find((entity) => entity.entity_id === normalized.entity_id);
  if (!newEntity) throw new ValidationError({ entity_id: 'La entidad seleccionada no existe.' });

  applyStockEffect(newEntity, normalized, 1);
  newEntity.updatedAt = nowIso();
  saveEntities(entities);

  const updated = {
    ...existing,
    ...normalized,
    document_id: existing.document_id,
    createdAt: existing.createdAt
  };
  documents[index] = updated;
  saveDocuments(documents);
  return clone(updated);
}

export function deleteDocument(documentId) {
  const documents = loadDocuments();
  const index = documents.findIndex((document) => document.document_id === documentId);
  if (index === -1) throw new NotFoundError('El documento ya no existe.');

  const document = documents[index];
  const entities = loadEntities();
  const entity = entities.find((item) => item.entity_id === document.entity_id);
  if (entity) {
    applyStockEffect(entity, document, -1);
    entity.updatedAt = nowIso();
    saveEntities(entities);
  }

  documents.splice(index, 1);
  saveDocuments(documents);
}

export function deleteDocumentsForEntity(entityId) {
  const documents = loadDocuments();
  const remaining = documents.filter((document) => document.entity_id !== entityId);
  if (remaining.length !== documents.length) saveDocuments(remaining);
}

export function getLatestLocation(entityId) {
  const entries = loadDocuments().filter(
    (document) => document.entity_id === entityId && document.type === 'ENTRADA'
  );
  if (entries.length === 0) return null;

  const latest = entries.reduce((current, document) => {
    if (!current) return document;
    const currentTime = new Date(current.createdAt).getTime();
    const documentTime = new Date(document.createdAt).getTime();
    return documentTime >= currentTime ? document : current;
  }, null);

  return {
    aisle: latest.aisle ?? '',
    shelf: latest.shelf ?? '',
    level: latest.level ?? ''
  };
}

export function getCategories(entities = loadEntities()) {
  const values = new Set();
  entities.forEach((entity) => {
    const category = trimString(entity.category);
    if (category) values.add(category);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'es'));
}

export function searchEntities(term = '', category = '') {
  const entities = loadEntities();
  const normalizedTerm = typeof term === 'string' ? term.trim().toLowerCase() : '';
  const categoryFilter = typeof category === 'string' ? category.trim().toLowerCase() : '';

  return entities.filter((entity) => {
    if (categoryFilter && String(entity.category ?? '').toLowerCase() !== categoryFilter) {
      return false;
    }
    if (!normalizedTerm) return true;

    const values = [
      entity.name,
      entity.code,
      entity.category,
      entity.description,
      entity.targetDate,
      entity.unitOfMeasure,
      ...Object.values(entity.customFields ?? {})
    ];
    return values.some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedTerm)
    );
  });
}

export function getDashboardStats(category = '') {
  const allEntities = loadEntities();
  const categoryFilter = typeof category === 'string' ? category.trim().toLowerCase() : '';
  const entities = categoryFilter
    ? allEntities.filter((entity) => String(entity.category ?? '').toLowerCase() === categoryFilter)
    : allEntities;
  const entityIds = new Set(entities.map((entity) => entity.entity_id));
  const documents = loadDocuments();
  const scopedDocuments = categoryFilter
    ? documents.filter((document) => entityIds.has(document.entity_id))
    : documents;

  const valuation = entities.reduce(
    (sum, entity) => sum + (Number(entity.stockBalance) || 0) * (Number(entity.unitCost) || 0),
    0
  );
  const critical = entities.filter(
    (entity) =>
      typeof entity.reorderPoint === 'number' &&
      Number.isFinite(entity.reorderPoint) &&
      (Number(entity.stockBalance) || 0) < entity.reorderPoint
  ).length;

  return {
    totalEntities: entities.length,
    totalDocuments: scopedDocuments.length,
    valuation,
    critical,
    categories: getCategories(allEntities)
  };
}

export function resetStore() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEYS.entities);
  storage.removeItem(STORAGE_KEYS.documents);
}
