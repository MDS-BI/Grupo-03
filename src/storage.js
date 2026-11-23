export const STORAGE_KEYS = {
  entities: 'erp.entities',
  movements: 'erp.movements',
  documents: 'erp.movements',
  legacyDocuments: 'erp.documents',
  counts: 'erp.counts',
  replenishmentRequests: 'erp.replenishmentRequests',
  productRequests: 'erp.productRequests',
  providers: 'erp.providers',
  persons: 'erp.persons',
  audit: 'erp.audit'
};

const DEFAULT_PERSONS = ['Ana', 'Bruno', 'Carlos', 'Diana'];

function normalizeCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function normalizeRut(value) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!cleaned) return '';
  if (cleaned.includes('-')) {
    const [body, ...rest] = cleaned.split('-');
    return `${body}-${rest.join('')}`;
  }
  if (cleaned.length > 1) return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  return cleaned;
}

export function computeRutCheckDigit(body) {
  const digits = String(body ?? '').replace(/\D/g, '');
  if (!digits) return '';
  let sum = 0;
  let multiplier = 2;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

export function isValidRut(value) {
  const normalized = normalizeRut(value);
  if (!/^\d{1,8}-[\dK]$/.test(normalized)) return false;
  const [body, checkDigit] = normalized.split('-');
  return computeRutCheckDigit(body) === checkDigit;
}

function ensureEntityDefaults(entity) {
  const unit =
    trimString(entity?.unit ?? entity?.unitOfMeasure ?? entity?.customFields?.unidad_medida) ||
    'Unidades';
  const reorderPointRaw = entity?.reorderPoint ?? entity?.customFields?.punto_reorden;
  const reorderPoint =
    reorderPointRaw === undefined || reorderPointRaw === '' || reorderPointRaw === null
      ? 0
      : Number(reorderPointRaw);
  return {
    ...entity,
    unit,
    unitOfMeasure: entity?.unitOfMeasure ?? unit,
    reorderPoint: Number.isFinite(reorderPoint) ? reorderPoint : 0,
    status: entity?.status === 'inactive' ? 'inactive' : 'active'
  };
}

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

function hasStoredKey(key) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function readDocuments() {
  if (hasStoredKey(STORAGE_KEYS.movements)) {
    return readCollection(STORAGE_KEYS.movements);
  }
  const legacy = readCollection(STORAGE_KEYS.legacyDocuments);
  if (legacy.length > 0) writeCollection(STORAGE_KEYS.movements, legacy);
  return legacy;
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

function normalizePersonLabel(value) {
  return trimString(value).replace(/\s+/g, ' ').slice(0, 80);
}

function resolveActor(options = {}, fallback = 'local') {
  const source = typeof options === 'string' ? { actorPerson: options } : (options ?? {});
  const candidates = [
    source.actorPerson,
    source.person,
    source.approvedByPerson,
    source.actorLabel,
    source.actor
  ];
  for (const candidate of candidates) {
    const normalized = normalizePersonLabel(candidate);
    if (normalized) return normalized;
  }
  return fallback;
}

export function getPersons() {
  const stored = readCollection(STORAGE_KEYS.persons)
    .map((item) =>
      normalizePersonLabel(typeof item === 'string' ? item : (item?.label ?? item?.person))
    )
    .filter(Boolean);
  const seen = new Set();
  const unique = stored.filter((label) => {
    const key = label.toLocaleLowerCase('es');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.length > 0 ? unique : [...DEFAULT_PERSONS];
}

export function savePersons(persons = []) {
  const source = Array.isArray(persons) ? persons : [];
  const labels = source
    .map((item) =>
      normalizePersonLabel(
        typeof item === 'string' ? item : (item?.label ?? item?.person ?? item?.name)
      )
    )
    .filter(Boolean);
  if (labels.length === 0) {
    throw new ValidationError(
      { persons: 'Debe existir al menos una persona local.' },
      'Persona local requerida.'
    );
  }
  const seen = new Set();
  const unique = labels.filter((label) => {
    const key = label.toLocaleLowerCase('es');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  writeCollection(STORAGE_KEYS.persons, unique);
  return [...unique];
}

export function addPerson(label) {
  const normalized = normalizePersonLabel(label);
  if (!normalized) {
    throw new ValidationError(
      { person: 'La etiqueta de la persona es obligatoria.' },
      'Persona inválida.'
    );
  }
  const persons = savePersons([...getPersons(), normalized]);
  const person = persons.find(
    (item) => item.toLocaleLowerCase('es') === normalized.toLocaleLowerCase('es')
  );
  return { persons, person };
}

function appendAudit({
  entityId = null,
  entityType = 'entity',
  action = '',
  person = '',
  details = '',
  before = null,
  after = null
} = {}) {
  const entry = {
    audit_id: generateId('aud'),
    entityId: entityId || null,
    entityType,
    action,
    person: resolveActor({ actorPerson: person }, 'local'),
    timestamp: nowIso(),
    details: trimString(details),
    before: before ? clone(before) : null,
    after: after ? clone(after) : null
  };
  const entries = readCollection(STORAGE_KEYS.audit);
  entries.push(entry);
  writeCollection(STORAGE_KEYS.audit, entries);
  return clone(entry);
}

export function getAuditTrail(filters = {}) {
  const { entityId = '', action = '', person = '', fromDate = '', toDate = '' } = filters ?? {};
  const personFilter = normalizePersonLabel(person).toLocaleLowerCase('es');
  return readCollection(STORAGE_KEYS.audit)
    .filter((entry) => {
      if (entityId && entry.entityId !== entityId) return false;
      if (action && entry.action !== action) return false;
      if (personFilter && String(entry.person ?? '').toLocaleLowerCase('es') !== personFilter)
        return false;
      const date = String(entry.timestamp ?? '').slice(0, 10);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    })
    .sort((a, b) => String(a.timestamp ?? '').localeCompare(String(b.timestamp ?? '')))
    .map((entry) => clone(entry));
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
  const customValues = normalizeCustomValues(input.customFields, definitions);
  const normalized = {
    name: trimString(input.name),
    code: trimString(input.code),
    category: trimString(input.category),
    unit: trimString(input.unit ?? input.unitOfMeasure ?? customValues.unidad_medida) || 'Unidades',
    description: trimString(input.description),
    targetDate: trimString(input.targetDate),
    customFields: customValues
  };

  const reorderPoint = parseOptionalNumber(input.reorderPoint ?? customValues.punto_reorden);
  normalized.reorderPoint = reorderPoint === undefined ? 0 : reorderPoint;

  const unitCost = parseOptionalNumber(input.unitCost);
  if (unitCost !== undefined) normalized.unitCost = unitCost;

  const providerId = trimString(
    input.providerId ?? input.proveedor_id ?? customValues.proveedor_id
  );
  if (providerId) normalized.providerId = providerId;

  const provider = trimString(input.provider ?? input.proveedor ?? customValues.proveedor);
  if (provider) normalized.provider = provider;

  // Keep legacy field in sync for existing UI/data compatibility
  if (normalized.unit) normalized.unitOfMeasure = normalized.unit;

  return normalized;
}

export function validateEntity(
  input,
  config = {},
  { entities = loadEntities(), entityId = null } = {}
) {
  const errors = {};
  if (isBlank(input.name)) errors.name = 'El nombre es obligatorio.';
  if (isBlank(input.code)) errors.code = 'El código es obligatorio.';
  if (isBlank(input.category)) errors.category = 'La categoría es obligatoria.';
  if (isBlank(input.unit)) errors.unit = 'La unidad es obligatoria.';

  if (
    input.reorderPoint === undefined ||
    input.reorderPoint === '' ||
    Number.isNaN(input.reorderPoint)
  ) {
    errors.reorderPoint = 'El punto de reorden es obligatorio.';
  } else if (typeof input.reorderPoint !== 'number' || !Number.isFinite(input.reorderPoint)) {
    errors.reorderPoint = 'El punto de reorden debe ser un número válido.';
  } else if (input.reorderPoint < 0) {
    errors.reorderPoint = 'El punto de reorden debe ser mayor o igual a 0.';
  }

  if (!isBlank(input.targetDate) && !isValidDate(input.targetDate)) {
    errors.targetDate = 'La fecha objetivo no es una fecha de calendario válida.';
  }

  validateOptionalNumber(input.unitCost, 'unitCost', 'El costo unitario', errors);

  if (!isBlank(input.code)) {
    const normalized = normalizeCode(input.code);
    const duplicate = entities.find(
      (entity) => entity.entity_id !== entityId && normalizeCode(entity.code) === normalized
    );
    if (duplicate) {
      errors.code = 'Ya existe una entidad con este código (SKU).';
    }
  }

  if (!isBlank(input.providerId)) {
    const provider = loadProviders().find((item) => item.provider_id === input.providerId);
    if (!provider) errors.providerId = 'El proveedor seleccionado no existe.';
  }

  const customValues =
    input.customFields && typeof input.customFields === 'object' ? input.customFields : {};
  validateCustomFields(customValues, config?.customFields?.entity ?? [], 'customFields', errors);

  if (typeof config?.customValidators?.entity === 'function') {
    mergeErrors(errors, config.customValidators.entity({ ...input, customFields: customValues }));
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function loadEntities() {
  return readCollection(STORAGE_KEYS.entities).map(ensureEntityDefaults);
}

export function saveEntities(entities) {
  writeCollection(STORAGE_KEYS.entities, Array.isArray(entities) ? entities : []);
}

export function loadProviders() {
  return readCollection(STORAGE_KEYS.providers);
}

export function saveProviders(providers) {
  writeCollection(STORAGE_KEYS.providers, Array.isArray(providers) ? providers : []);
}

export function getProvider(providerId) {
  return loadProviders().find((provider) => provider.provider_id === providerId) ?? null;
}

export function normalizeProviderInput(input = {}) {
  return {
    rut: normalizeRut(input.rut),
    razon_social: trimString(input.razon_social ?? input.razonSocial ?? input.name),
    contacto: trimString(input.contacto ?? input.contact)
  };
}

export function validateProvider(input, { providers = loadProviders(), providerId = null } = {}) {
  const errors = {};
  if (isBlank(input.rut)) {
    errors.rut = 'El RUT del proveedor es obligatorio.';
  } else if (!isValidRut(input.rut)) {
    errors.rut = 'El RUT no es válido (formato o dígito verificador).';
  }
  if (isBlank(input.razon_social)) {
    errors.razon_social = 'La razón social es obligatoria.';
  }
  if (!isBlank(input.rut)) {
    const normalized = normalizeRut(input.rut);
    const duplicate = providers.find(
      (provider) => provider.provider_id !== providerId && normalizeRut(provider.rut) === normalized
    );
    if (duplicate) errors.rut = 'Ya existe un proveedor con este RUT.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addProvider(input = {}) {
  const normalized = normalizeProviderInput(input);
  const providers = loadProviders();
  const { valid, errors } = validateProvider(normalized, { providers });
  if (!valid) throw new ValidationError(errors);
  const timestamp = nowIso();
  const provider = {
    provider_id: generateId('prov'),
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  providers.push(provider);
  saveProviders(providers);
  return clone(provider);
}

export function updateProvider(providerId, updates = {}) {
  const providers = loadProviders();
  const index = providers.findIndex((provider) => provider.provider_id === providerId);
  if (index === -1) throw new NotFoundError('El proveedor ya no existe.');
  const normalized = normalizeProviderInput({ ...providers[index], ...updates });
  const { valid, errors } = validateProvider(normalized, { providers, providerId });
  if (!valid) throw new ValidationError(errors);
  providers[index] = {
    ...providers[index],
    ...normalized,
    provider_id: providerId,
    updatedAt: nowIso()
  };
  saveProviders(providers);
  return clone(providers[index]);
}

export function deleteProvider(providerId) {
  const providers = loadProviders();
  const index = providers.findIndex((provider) => provider.provider_id === providerId);
  if (index === -1) throw new NotFoundError('El proveedor ya no existe.');
  providers.splice(index, 1);
  saveProviders(providers);
}

export function getEntity(entityId) {
  return loadEntities().find((entity) => entity.entity_id === entityId) ?? null;
}

export function addEntity(input, config = {}, { actorPerson = '', actorLabel = '' } = {}) {
  const normalized = normalizeEntityInput(input, config);
  const entities = loadEntities();
  const { valid, errors } = validateEntity(normalized, config, { entities });
  if (!valid) throw new ValidationError(errors);

  const timestamp = nowIso();
  const actor = resolveActor({ actorPerson, actorLabel });
  const entity = {
    entity_id: generateId('ent'),
    ...normalized,
    status: 'active',
    stockBalance: 0,
    audit: [
      {
        action: 'create',
        at: timestamp,
        actorPerson: actor,
        actorLabel: actor
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  entities.push(entity);
  saveEntities(entities);
  appendAudit({
    entityId: entity.entity_id,
    action: 'create',
    person: actor,
    details: entity.name
  });
  return clone(entity);
}

export function updateEntity(
  entityId,
  updates = {},
  config = {},
  { actorPerson = '', actorLabel = '' } = {}
) {
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
  const { valid, errors } = validateEntity(normalized, config, { entities, entityId });
  if (!valid) throw new ValidationError(errors);

  const timestamp = nowIso();
  const actor = resolveActor({ actorPerson, actorLabel });
  const updated = {
    ...existing,
    ...normalized,
    status: existing.status === 'inactive' ? 'inactive' : 'active',
    entity_id: existing.entity_id,
    stockBalance: existing.stockBalance,
    createdAt: existing.createdAt,
    audit: [
      ...(Array.isArray(existing.audit) ? existing.audit : []),
      { action: 'update', at: timestamp, actorPerson: actor, actorLabel: actor }
    ],
    updatedAt: timestamp
  };
  entities[index] = updated;
  saveEntities(entities);
  appendAudit({ entityId, action: 'update', person: actor, details: updated.name });
  return clone(updated);
}

export function deactivateEntity(entityId, { actorPerson = '', actorLabel = '' } = {}) {
  const entities = loadEntities();
  const index = entities.findIndex((entity) => entity.entity_id === entityId);
  if (index === -1) throw new NotFoundError('La entidad ya no existe.');
  const timestamp = nowIso();
  const actor = resolveActor({ actorPerson, actorLabel });
  entities[index] = {
    ...entities[index],
    status: 'inactive',
    audit: [
      ...(Array.isArray(entities[index].audit) ? entities[index].audit : []),
      { action: 'deactivate', at: timestamp, actorPerson: actor, actorLabel: actor }
    ],
    updatedAt: timestamp
  };
  saveEntities(entities);
  appendAudit({ entityId, action: 'deactivate', person: actor, details: entities[index].name });
  return clone(entities[index]);
}

export function hasEntityHistory(entityId) {
  return loadDocuments().some((document) => document.entity_id === entityId);
}

export function deleteEntity(entityId, { force = false, actorPerson = '', actorLabel = '' } = {}) {
  const entities = loadEntities();
  const index = entities.findIndex((entity) => entity.entity_id === entityId);
  if (index === -1) throw new NotFoundError('La entidad ya no existe.');

  const hasHistory = hasEntityHistory(entityId);
  if (hasHistory && !force) {
    return deactivateEntity(entityId, { actorPerson, actorLabel });
  }

  const actor = resolveActor({ actorPerson, actorLabel });
  appendAudit({ entityId, action: 'delete', person: actor, details: entities[index].name });
  entities.splice(index, 1);
  saveEntities(entities);
  deleteDocumentsForEntity(entityId);
  return null;
}

export function normalizeDocumentInput(input = {}, config = {}) {
  const type = typeof input.type === 'string' ? input.type.trim().toUpperCase() : '';
  const normalized = {
    entity_id: trimString(input.entity_id),
    type,
    quantity: parseQuantity(input.quantity),
    notes: trimString(input.notes),
    reason: trimString(input.reason ?? input.motivo),
    doc_respaldo: trimString(input.doc_respaldo ?? input.docRespaldo),
    providerId: trimString(input.providerId ?? input.proveedor_id),
    provider: trimString(input.provider ?? input.proveedor),
    status: typeof input.status === 'string' ? input.status.trim() : '',
    customFields: normalizeCustomValues(input.customFields, config?.customFields?.document ?? [])
  };

  if (type === 'ENTRADA') {
    normalized.aisle = trimString(input.aisle);
    normalized.shelf = trimString(input.shelf);
    normalized.level = trimString(input.level);
  } else if (type === 'TRANSFERENCIA') {
    normalized.fromAisle = trimString(input.fromAisle ?? input.aisle);
    normalized.fromShelf = trimString(input.fromShelf ?? input.shelf);
    normalized.fromLevel = trimString(input.fromLevel ?? input.level);
    normalized.toAisle = trimString(input.toAisle);
    normalized.toShelf = trimString(input.toShelf);
    normalized.toLevel = trimString(input.toLevel);
    // keep latest location at destination for compatibility
    normalized.aisle = normalized.toAisle;
    normalized.shelf = normalized.toShelf;
    normalized.level = normalized.toLevel;
  } else {
    normalized.aisle = '';
    normalized.shelf = '';
    normalized.level = '';
    if (type === 'SALIDA') {
      normalized.suggestedLocation = {
        aisle: trimString(input.fifoAisle ?? input.suggestedAisle),
        shelf: trimString(input.fifoShelf ?? input.suggestedShelf),
        level: trimString(input.fifoLevel ?? input.suggestedLevel)
      };
    }
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

  if (!['ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE'].includes(input.type)) {
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
    if (isBlank(input.doc_respaldo)) {
      errors.doc_respaldo = 'El documento de respaldo es obligatorio para una entrada.';
    }
    if (!isBlank(input.providerId)) {
      const provider = loadProviders().find((item) => item.provider_id === input.providerId);
      if (!provider) errors.providerId = 'El proveedor seleccionado no existe.';
    }
  }

  if (input.type === 'TRANSFERENCIA') {
    if (isBlank(input.fromAisle)) errors.fromAisle = 'La ubicación de origen es obligatoria.';
    if (isBlank(input.fromShelf)) errors.fromShelf = 'La ubicación de origen es obligatoria.';
    if (isBlank(input.fromLevel)) errors.fromLevel = 'La ubicación de origen es obligatoria.';
    if (isBlank(input.toAisle)) errors.toAisle = 'La ubicación de destino es obligatoria.';
    if (isBlank(input.toShelf)) errors.toShelf = 'La ubicación de destino es obligatoria.';
    if (isBlank(input.toLevel)) errors.toLevel = 'La ubicación de destino es obligatoria.';
  }

  if (
    (input.type === 'SALIDA' || input.type === 'TRANSFERENCIA') &&
    entity &&
    Number.isInteger(input.quantity) &&
    input.quantity > 0
  ) {
    const available = computeAvailableStock(entity, existingDocument);
    if (input.quantity > available) {
      errors.quantity = `Stock insuficiente: disponible ${available}, solicitado ${input.quantity}.`;
    }
  }

  if (input.type === 'SALIDA') {
    const reason = trimString(input.reason);
    if (reason && !['Venta', 'Consumo interno', 'Merma', 'Devolución'].includes(reason)) {
      errors.reason = 'Seleccione un motivo de salida válido.';
    }
    if (reason === 'Merma' && isBlank(input.notes)) {
      errors.notes = 'La observación es obligatoria cuando el motivo es Merma.';
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
  return readDocuments();
}

export function saveDocuments(documents) {
  writeCollection(STORAGE_KEYS.movements, Array.isArray(documents) ? documents : []);
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEYS.legacyDocuments);
    } catch {
      // Storage may be unavailable; the canonical collection remains authoritative.
    }
  }
}

export function loadCounts() {
  return readCollection(STORAGE_KEYS.counts);
}

export function saveCounts(counts) {
  writeCollection(STORAGE_KEYS.counts, Array.isArray(counts) ? counts : []);
}

export function loadReplenishmentRequests() {
  return readCollection(STORAGE_KEYS.replenishmentRequests);
}

export function saveReplenishmentRequests(requests) {
  writeCollection(STORAGE_KEYS.replenishmentRequests, Array.isArray(requests) ? requests : []);
}

export function loadProductRequests() {
  return readCollection(STORAGE_KEYS.productRequests);
}

export function saveProductRequests(requests) {
  writeCollection(STORAGE_KEYS.productRequests, Array.isArray(requests) ? requests : []);
}

export function createProductRequest({
  name = '',
  code = '',
  category = '',
  notes = '',
  actorPerson = '',
  actorLabel = ''
} = {}) {
  const normalizedName = trimString(name);
  if (!normalizedName) {
    throw new ValidationError(
      { name: 'El nombre del producto solicitado es obligatorio.' },
      'Solicitud de alta inválida.'
    );
  }
  const request = {
    request_id: generateId('preq'),
    name: normalizedName,
    code: normalizeCode(code) || trimString(code),
    category: trimString(category),
    notes: trimString(notes),
    status: 'pending',
    actorPerson: resolveActor({ actorPerson, actorLabel }),
    createdAt: nowIso()
  };
  const requests = loadProductRequests();
  requests.push(request);
  saveProductRequests(requests);
  return clone(request);
}

export function getDocument(documentId) {
  return loadDocuments().find((document) => document.document_id === documentId) ?? null;
}

function movementStockDelta(document) {
  const qty = Number(document.quantity) || 0;
  if (document.type === 'ENTRADA') return qty;
  if (document.type === 'SALIDA') return -qty;
  if (document.type === 'AJUSTE') {
    if (document.delta !== undefined && document.delta !== null && document.delta !== '') {
      return Number(document.delta) || 0;
    }
    return qty;
  }
  return 0; // TRANSFERENCIA
}

function applyStockEffect(entity, document, direction) {
  if (!entity) return;
  const balance = Number(entity.stockBalance) || 0;
  entity.stockBalance = balance + movementStockDelta(document) * direction;
}

export function addDocument(input, config = {}, { actorPerson = '', actorLabel = '' } = {}) {
  const entities = loadEntities();
  const normalized = normalizeDocumentInput(input, config);
  if (config?.statusLifecycle && isBlank(normalized.status)) {
    normalized.status = config.statusLifecycle.states[0];
  }

  const { valid, errors } = validateDocument(normalized, config, entities, null);
  if (!valid) throw new ValidationError(errors);

  const entity = entities.find((item) => item.entity_id === normalized.entity_id);
  const actor = resolveActor({
    actorPerson: actorPerson || input.actorPerson,
    actorLabel: actorLabel || input.actorLabel
  });
  const document = {
    document_id: generateId('doc'),
    ...normalized,
    state: normalized.state || input.state || 'active',
    actorPerson: actor,
    actorLabel: actor,
    createdAt: nowIso(),
    confirmedAt: normalized.confirmedAt || ''
  };

  applyStockEffect(entity, document, 1);
  entity.updatedAt = nowIso();
  saveEntities(entities);

  const documents = loadDocuments();
  documents.push(document);
  saveDocuments(documents);
  return clone(document);
}

export function updateDocument(
  documentId,
  updates = {},
  config = {},
  { actorPerson = '', actorLabel = '' } = {}
) {
  const documents = loadDocuments();
  const index = documents.findIndex((document) => document.document_id === documentId);
  if (index === -1) throw new NotFoundError('El documento ya no existe.');

  const existing = documents[index];
  if (existing.state === 'confirmed' || existing.state === 'voided' || existing.voidsMovementId) {
    throw new ValidationError(
      { _form: 'Los movimientos confirmados son inmutables. Use anulación con contramovimiento.' },
      'Movimiento inmutable.'
    );
  }

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

  const actor = resolveActor(
    {
      actorPerson: actorPerson || updates.actorPerson,
      actorLabel: actorLabel || updates.actorLabel
    },
    resolveActor(existing, existing.actorLabel || 'local')
  );
  const updated = {
    ...existing,
    ...normalized,
    document_id: existing.document_id,
    createdAt: existing.createdAt,
    state: existing.state ?? 'active',
    actorPerson: actor,
    actorLabel: actor,
    confirmedAt: existing.confirmedAt ?? ''
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
  if (document.state === 'confirmed' || document.state === 'voided' || document.voidsMovementId) {
    throw new ValidationError(
      { _form: 'Los movimientos confirmados no se eliminan. Use anulación con contramovimiento.' },
      'Movimiento inmutable.'
    );
  }
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

export function voidDocument(documentId, { reason = '', actorPerson = '', actorLabel = '' } = {}) {
  const documents = loadDocuments();
  const index = documents.findIndex((document) => document.document_id === documentId);
  if (index === -1) throw new NotFoundError('El documento ya no existe.');
  const original = documents[index];
  if (original.state === 'voided' || original.voidedAt) {
    throw new ValidationError({ _form: 'El movimiento ya fue anulado.' }, 'Movimiento ya anulado.');
  }
  if (original.state === 'draft') {
    throw new ValidationError(
      { _form: 'Solo los movimientos confirmados pueden anularse.' },
      'No anulable.'
    );
  }

  const voidedAt = nowIso();
  const voidReason = trimString(reason);
  const actor = resolveActor({ actorPerson, actorLabel });
  documents[index] = {
    ...original,
    state: 'voided',
    voidedAt,
    voidReason,
    voidedByPerson: actor,
    voidedBy: actor,
    actorPerson: original.actorPerson || original.actorLabel || actor,
    actorLabel: original.actorLabel || actor
  };

  // Contramovement reverses stock effect and is linked to original
  const inverseType =
    original.type === 'ENTRADA' ? 'SALIDA' : original.type === 'SALIDA' ? 'ENTRADA' : original.type;
  const contramovement = {
    ...original,
    document_id: generateId('doc'),
    type: inverseType,
    state: 'confirmed',
    delta: original.type === 'AJUSTE' ? -movementStockDelta(original) : undefined,
    fromAisle: original.type === 'TRANSFERENCIA' ? original.toAisle : original.fromAisle,
    fromShelf: original.type === 'TRANSFERENCIA' ? original.toShelf : original.fromShelf,
    fromLevel: original.type === 'TRANSFERENCIA' ? original.toLevel : original.fromLevel,
    toAisle: original.type === 'TRANSFERENCIA' ? original.fromAisle : original.toAisle,
    toShelf: original.type === 'TRANSFERENCIA' ? original.fromShelf : original.toShelf,
    toLevel: original.type === 'TRANSFERENCIA' ? original.fromLevel : original.toLevel,
    aisle: original.type === 'TRANSFERENCIA' ? original.fromAisle : original.aisle,
    shelf: original.type === 'TRANSFERENCIA' ? original.fromShelf : original.shelf,
    level: original.type === 'TRANSFERENCIA' ? original.fromLevel : original.level,
    voidsMovementId: original.document_id,
    reason: voidReason || original.reason || '',
    notes: voidReason ? `Contramovimiento: ${voidReason}` : `Anulación de ${original.document_id}`,
    actorPerson: actor,
    actorLabel: actor,
    createdAt: voidedAt,
    confirmedAt: voidedAt,
    voidedAt: '',
    voidReason: ''
  };

  const entities = loadEntities();
  const entity = entities.find((item) => item.entity_id === original.entity_id);
  if (entity) {
    applyStockEffect(entity, contramovement, 1);
    entity.updatedAt = voidedAt;
    saveEntities(entities);
  }

  documents.push(contramovement);
  saveDocuments(documents);
  appendAudit({
    entityId: original.entity_id,
    entityType: 'document',
    action: 'void',
    person: actor,
    details: `${original.type} ${original.document_id}`,
    before: { state: original.state, quantity: original.quantity },
    after: {
      state: 'voided',
      reason: voidReason,
      contramovementId: contramovement.document_id
    }
  });
  return { voided: clone(documents[index]), contramovement: clone(contramovement) };
}

export function getKardex(entityId, filters = {}) {
  const { fromDate = '', toDate = '', type = '' } = filters;
  const movements = loadDocuments()
    .filter((d) => d.entity_id === entityId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let running = 0;
  const rows = [];
  for (const movement of movements) {
    // Only confirmed/voided/active legacy records affect/history shown; drafts excluded from kardex totals except maybe not created
    if (movement.state === 'draft') continue;
    const delta = movementStockDelta(movement);
    running += delta;
    const created = movement.createdAt ? new Date(movement.createdAt) : null;
    if (fromDate && created && created.getTime() < parseDayStart(fromDate)) {
      rows.push({ ...clone(movement), saldo: running, _filteredOut: true });
      continue;
    }
    if (toDate && created && created.getTime() > parseDayEnd(toDate)) {
      rows.push({ ...clone(movement), saldo: running, _filteredOut: true });
      continue;
    }
    if (type && movement.type !== type) {
      rows.push({ ...clone(movement), saldo: running, _filteredOut: true });
      continue;
    }
    rows.push({ ...clone(movement), saldo: running, _filteredOut: false });
  }
  return rows.filter((r) => !r._filteredOut).map(({ _filteredOut, ...rest }) => rest);
}

export function getKardexOpeningBalance(entityId, filters = {}) {
  const { fromDate = '', type = '' } = filters ?? {};
  if (!fromDate) return 0;
  const start = parseDayStart(fromDate);
  let opening = 0;
  for (const movement of loadDocuments()) {
    if (movement.entity_id !== entityId) continue;
    if (movement.state === 'draft') continue;
    if (type && movement.type !== type) continue;
    const created = movement.createdAt ? new Date(movement.createdAt) : null;
    if (created && created.getTime() < start) opening += movementStockDelta(movement);
  }
  return opening;
}

export function getFifoLocationSuggestion(entityId) {
  const entries = loadDocuments()
    .filter(
      (document) =>
        document.entity_id === entityId &&
        document.type === 'ENTRADA' &&
        document.state !== 'draft' &&
        document.state !== 'voided' &&
        !document.voidsMovementId &&
        (document.aisle || document.shelf || document.level)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (entries.length === 0) return null;
  const oldest = entries[0];
  return {
    documentId: oldest.document_id,
    createdAt: oldest.createdAt,
    aisle: oldest.aisle ?? '',
    shelf: oldest.shelf ?? '',
    level: oldest.level ?? ''
  };
}

const DAY_MS = 1000 * 60 * 60 * 24;

function parseDayStart(value) {
  return new Date(`${String(value)}T00:00:00.000Z`).getTime();
}

function parseDayEnd(value) {
  return new Date(`${String(value)}T23:59:59.999Z`).getTime();
}

function withinDateRange(dateValue, fromDate, toDate) {
  if (!dateValue) return !fromDate && !toDate;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return false;
  if (fromDate && time < parseDayStart(fromDate)) return false;
  if (toDate && time > parseDayEnd(toDate)) return false;
  return true;
}

function consumptionStats(entity, documents, { fromDate = '', toDate = '' } = {}) {
  const history = documents
    .filter(
      (document) =>
        document.entity_id === entity.entity_id &&
        document.state !== 'draft' &&
        document.state !== 'voided' &&
        !document.voidsMovementId
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const historyStart = history.length > 0 ? history[0].createdAt : entity.createdAt;
  const historyDays = Math.max(
    1,
    (Date.now() - new Date(historyStart || Date.now()).getTime()) / DAY_MS || 1
  );
  const periodDays =
    fromDate || toDate
      ? Math.max(
          1,
          ((toDate ? new Date(toDate).getTime() : Date.now()) -
            (fromDate
              ? new Date(fromDate).getTime()
              : new Date(historyStart || Date.now()).getTime())) /
            DAY_MS || 1
        )
      : historyDays;
  const totalConsumed = history
    .filter((document) => document.type === 'SALIDA')
    .filter((document) => withinDateRange(document.createdAt, fromDate, toDate))
    .reduce((sum, document) => sum + (Number(document.quantity) || 0), 0);
  const averageDailyConsumption = totalConsumed / periodDays;
  const stock = Number(entity.stockBalance) || 0;
  const coverageDays = averageDailyConsumption > 0 ? stock / averageDailyConsumption : null;
  return {
    totalConsumed,
    averageDailyConsumption,
    coverageDays,
    historyDays,
    sufficientHistory: historyDays >= 30
  };
}

export function getDaysOfCoverage(entityId, filters = {}) {
  const entity = getEntity(entityId);
  if (!entity) return null;
  return consumptionStats(entity, loadDocuments(), filters);
}

export function getInventoryCoverage(filters = {}) {
  const { category = '', fromDate = '', toDate = '' } = filters ?? {};
  const categoryFilter = typeof category === 'string' ? category.trim().toLowerCase() : '';
  const entities = loadEntities().filter(
    (entity) => !categoryFilter || String(entity.category ?? '').toLowerCase() === categoryFilter
  );
  const documents = loadDocuments();
  const rows = entities.map((entity) => {
    const stats = consumptionStats(entity, documents, { fromDate, toDate });
    return {
      entity_id: entity.entity_id,
      name: entity.name,
      code: entity.code,
      category: entity.category,
      stockBalance: Number(entity.stockBalance) || 0,
      ...stats
    };
  });
  const withCoverage = rows.filter((row) => row.coverageDays !== null);
  const averageCoverageDays =
    withCoverage.length > 0
      ? withCoverage.reduce((sum, row) => sum + row.coverageDays, 0) / withCoverage.length
      : null;
  return { rows, averageCoverageDays };
}

export function getLatestLocation(entityId) {
  const entries = loadDocuments().filter(
    (document) =>
      document.entity_id === entityId &&
      (document.type === 'ENTRADA' || document.type === 'TRANSFERENCIA')
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

function locationKey(location = {}) {
  const parts = [location?.aisle, location?.shelf, location?.level]
    .map((value) => trimString(value))
    .filter(Boolean);
  return parts.length > 0 ? parts.join('-') : 'Sin ubicación';
}

export function getLocationBalances(entityId) {
  const balances = {};
  let currentLocation = null;
  const movements = loadDocuments()
    .filter((document) => document.entity_id === entityId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  function apply(location, quantity) {
    if (!quantity) return;
    const key = locationKey(location);
    balances[key] = (balances[key] || 0) + quantity;
    if (balances[key] === 0) delete balances[key];
    currentLocation = key;
  }

  for (const document of movements) {
    if (document.state === 'draft' || document.state === 'voided') continue;
    const quantity = Number(document.quantity) || 0;
    if (document.type === 'ENTRADA') {
      apply(document, quantity);
    } else if (document.type === 'TRANSFERENCIA') {
      apply(
        { aisle: document.fromAisle, shelf: document.fromShelf, level: document.fromLevel },
        -quantity
      );
      apply(document, quantity);
    } else if (document.type === 'SALIDA') {
      apply(currentLocation ? { aisle: currentLocation } : document, -quantity);
    } else if (document.type === 'AJUSTE') {
      apply(currentLocation ? { aisle: currentLocation } : document, movementStockDelta(document));
    }
  }

  return balances;
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

function daysSince(dateValue) {
  const d = dateValue ? new Date(dateValue) : null;
  if (!d || Number.isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function getLastMovementDate(entityId, documents) {
  let last = null;
  for (const doc of documents) {
    if (doc.entity_id !== entityId) continue;
    if (doc.state === 'draft') continue;
    const t = doc.createdAt || doc.confirmedAt;
    if (!t) continue;
    if (!last || new Date(t) > new Date(last)) last = t;
  }
  return last;
}

export function getDashboardStats(category = '', filters = {}) {
  if (category && typeof category === 'object') {
    filters = category;
    category = filters.category ?? '';
  }
  const { fromDate = '', toDate = '' } = filters ?? {};
  const allEntities = loadEntities();
  const categoryFilter = typeof category === 'string' ? category.trim().toLowerCase() : '';
  const entities = categoryFilter
    ? allEntities.filter((entity) => String(entity.category ?? '').toLowerCase() === categoryFilter)
    : allEntities;
  const entityIds = new Set(entities.map((entity) => entity.entity_id));
  const documents = loadDocuments();
  const scopedDocuments = (
    categoryFilter ? documents.filter((document) => entityIds.has(document.entity_id)) : documents
  ).filter((document) => withinDateRange(document.createdAt, fromDate, toDate));

  const activeEntities = entities.filter((e) => e.status !== 'inactive');
  const valuation = entities.reduce(
    (sum, entity) => sum + (Number(entity.stockBalance) || 0) * (Number(entity.unitCost) || 0),
    0
  );

  const alerts = entities.filter((entity) => {
    const rp = Number(entity.reorderPoint);
    return Number.isFinite(rp) && (Number(entity.stockBalance) || 0) <= rp;
  });
  const critical = entities.filter((entity) => {
    const rp = Number(entity.reorderPoint);
    return Number.isFinite(rp) && (Number(entity.stockBalance) || 0) < rp;
  }).length;

  let noMovement90Days = 0;
  for (const entity of entities) {
    const last = getLastMovementDate(entity.entity_id, scopedDocuments);
    if (!last) {
      // no movement history: if entity is older than 90 days treat as no movement in 90 days, else insufficient history context
      const age = daysSince(entity.createdAt);
      if (age >= 90) noMovement90Days += 1;
      continue;
    }
    if (daysSince(last) >= 90) noMovement90Days += 1;
  }

  const coverage = getInventoryCoverage({ category, fromDate, toDate });

  return {
    totalEntities: entities.length,
    activeEntities: activeEntities.length,
    totalDocuments: scopedDocuments.length,
    valuation,
    critical,
    alerts: alerts.length,
    noMovement90Days,
    averageCoverageDays: coverage.averageCoverageDays,
    categories: getCategories(allEntities)
  };
}

export function getReplenishmentSuggestions(filters = {}) {
  const category = typeof filters?.category === 'string' ? filters.category : '';
  const fromDate = typeof filters?.fromDate === 'string' ? filters.fromDate : '';
  const toDate = typeof filters?.toDate === 'string' ? filters.toDate : '';
  const allEntities = loadEntities();
  const documents = loadDocuments();
  const filtered = category
    ? allEntities.filter(
        (e) => String(e.category ?? '').toLowerCase() === category.trim().toLowerCase()
      )
    : allEntities;

  return filtered
    .filter((entity) => {
      const rp = Number(entity.reorderPoint);
      return Number.isFinite(rp) && (Number(entity.stockBalance) || 0) <= rp;
    })
    .map((entity) => {
      const stock = Number(entity.stockBalance) || 0;
      const reorderPoint = Number(entity.reorderPoint) || 0;
      const maxStock = Number(
        entity.maxStock ?? entity.stockMaximo ?? entity.customFields?.stock_maximo
      );
      const suggestedQty = Number.isFinite(maxStock)
        ? Math.max(0, maxStock - stock)
        : Math.max(0, reorderPoint - stock);
      const linkedProvider = entity.providerId ? getProvider(entity.providerId) : null;
      const provider =
        entity.provider ||
        linkedProvider?.razon_social ||
        entity.supplier ||
        entity.customFields?.proveedor ||
        'Sin proveedor';
      const historyDays = daysSince(entity.createdAt);
      const coverage = consumptionStats(entity, documents, { fromDate, toDate });
      return {
        entity_id: entity.entity_id,
        name: entity.name,
        code: entity.code,
        category: entity.category,
        provider,
        stockBalance: stock,
        reorderPoint,
        suggestedQty,
        alertLevel: stock <= 0 ? 'red' : 'yellow',
        rotationLabel: historyDays < 30 ? 'Datos insuficientes' : null,
        coverageDays: coverage.coverageDays,
        sufficientHistory: coverage.sufficientHistory
      };
    });
}

export function createReplenishmentRequest({
  lines = [],
  actorPerson = '',
  actorLabel = 'local'
} = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ValidationError(
      { _form: 'Seleccione al menos un producto para generar la solicitud.' },
      'Solicitud vacía.'
    );
  }
  const entities = loadEntities();
  const normalizedLines = lines.map((line) => {
    const entity = entities.find((e) => e.entity_id === line.entity_id);
    if (!entity)
      throw new ValidationError(
        { _form: 'Una entidad seleccionada ya no existe.' },
        'Entidad inválida.'
      );
    const qty = Number(line.suggestedQty ?? line.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new ValidationError(
        { suggestedQty: 'La cantidad sugerida debe ser un número mayor o igual a 0.' },
        'Cantidad inválida.'
      );
    }
    const provider =
      line.provider ||
      entity.provider ||
      entity.supplier ||
      entity.customFields?.proveedor ||
      'Sin proveedor';
    return {
      entity_id: entity.entity_id,
      name: entity.name,
      code: entity.code,
      provider,
      suggestedQty: qty
    };
  });

  const grouped = normalizedLines.reduce((acc, line) => {
    acc[line.provider] = acc[line.provider] || [];
    acc[line.provider].push(line);
    return acc;
  }, {});

  const actor = resolveActor({ actorPerson, actorLabel });
  const request = {
    request_id: generateId('req'),
    status: 'created',
    actorPerson: actor,
    actorLabel: actor,
    createdAt: nowIso(),
    lines: normalizedLines,
    groupedByProvider: grouped
  };
  const requests = loadReplenishmentRequests();
  requests.push(request);
  saveReplenishmentRequests(requests);
  return clone(request);
}

export function resetStore() {
  const storage = getStorage();
  if (!storage) return;
  Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
}

export function isBelowReorderPoint(entity) {
  if (!entity) return false;
  const reorderPoint = Number(entity.reorderPoint);
  if (!Number.isFinite(reorderPoint)) return false;
  return (Number(entity.stockBalance) || 0) <= reorderPoint;
}

export function createPhysicalCount({ actorPerson = '', actorLabel = 'local', notes = '' } = {}) {
  const counts = loadCounts();
  const actor = resolveActor({ actorPerson, actorLabel });
  const count = {
    count_id: generateId('cnt'),
    state: 'open',
    actorPerson: actor,
    actorLabel: actor,
    notes: trimString(notes),
    details: [],
    createdAt: nowIso(),
    closedAt: '',
    approvedAt: '',
    approvedBy: ''
  };
  counts.push(count);
  saveCounts(counts);
  return clone(count);
}

export function recordBlindCountDetail(countId, { entity_id, countedQuantity }) {
  const counts = loadCounts();
  const count = counts.find((c) => c.count_id === countId);
  if (!count) throw new NotFoundError('El conteo no existe.');
  if (count.state !== 'open')
    throw new ValidationError({ _form: 'El conteo ya está cerrado.' }, 'Conteo cerrado.');
  const entity = getEntity(entity_id);
  if (!entity) throw new NotFoundError('La entidad ya no existe.');
  const qty = Number(countedQuantity);
  if (!Number.isInteger(qty) || qty < 0) {
    throw new ValidationError(
      { countedQuantity: 'La cantidad contada debe ser un entero mayor o igual a 0.' },
      'Cantidad inválida.'
    );
  }
  count.details = Array.isArray(count.details) ? count.details : [];
  const existing = count.details.find((d) => d.entity_id === entity_id);
  const detail = {
    detail_id: existing?.detail_id || generateId('cdt'),
    entity_id,
    countedQuantity: qty
    // systemQuantity intentionally not exposed during blind capture
  };
  if (existing) Object.assign(existing, detail);
  else count.details.push(detail);
  saveCounts(counts);
  return clone(detail);
}

export function closePhysicalCount(countId) {
  const counts = loadCounts();
  const count = counts.find((c) => c.count_id === countId);
  if (!count) throw new NotFoundError('El conteo no existe.');
  if (count.state !== 'open')
    throw new ValidationError({ _form: 'El conteo ya está cerrado.' }, 'Conteo cerrado.');
  const entities = loadEntities();
  count.details = (count.details || []).map((d) => {
    const entity = entities.find((e) => e.entity_id === d.entity_id);
    const systemQuantity = Number(entity?.stockBalance) || 0;
    const countedQuantity = Number(d.countedQuantity) || 0;
    return {
      ...d,
      systemQuantity,
      difference: countedQuantity - systemQuantity
    };
  });
  count.state = 'closed';
  count.closedAt = nowIso();
  saveCounts(counts);
  return clone(count);
}

export function approveCountAdjustment(
  countId,
  { approvedByPerson = '', approverLabel = '', reason = '' } = {}
) {
  const counts = loadCounts();
  const count = counts.find((c) => c.count_id === countId);
  if (!count) throw new NotFoundError('El conteo no existe.');
  if (count.state !== 'closed') {
    throw new ValidationError(
      { _form: 'El conteo debe estar cerrado antes de aprobar ajustes.' },
      'Conteo no cerrado.'
    );
  }
  const approver = resolveActor(
    { actorPerson: approvedByPerson, actorLabel: approverLabel },
    'supervisor'
  );
  const countedBy = resolveActor(count, count.actorLabel || 'operador');
  if (approver.toLocaleLowerCase('es') === countedBy.toLocaleLowerCase('es')) {
    throw new ValidationError(
      { approverLabel: 'La aprobación debe registrarse con un actor distinto al del conteo.' },
      'Actor inválido.'
    );
  }
  const adjustmentReason = trimString(reason);
  if (!adjustmentReason) {
    throw new ValidationError(
      { reason: 'El motivo del ajuste es obligatorio.' },
      'Motivo requerido.'
    );
  }

  const documents = loadDocuments();
  const entities = loadEntities();
  const now = nowIso();
  const adjustments = [];
  const auditEvents = [];

  for (const detail of count.details || []) {
    const diff = Number(detail.difference) || 0;
    if (diff === 0) continue;
    const entity = entities.find((e) => e.entity_id === detail.entity_id);
    if (!entity) continue;
    const beforeStock = Number(entity.stockBalance) || 0;
    const movement = {
      document_id: generateId('doc'),
      entity_id: detail.entity_id,
      type: 'AJUSTE',
      quantity: Math.abs(diff),
      delta: diff,
      state: 'confirmed',
      reason: adjustmentReason,
      notes: `Ajuste por conteo ${count.count_id}`,
      actorPerson: approver,
      actorLabel: approver,
      approvedByPerson: approver,
      approvedBy: approver,
      countId: count.count_id,
      createdAt: now,
      confirmedAt: now
    };
    applyStockEffect(entity, movement, 1);
    entity.updatedAt = now;
    documents.push(movement);
    adjustments.push(clone(movement));
    auditEvents.push({
      entityId: detail.entity_id,
      before: { stockBalance: beforeStock },
      after: { stockBalance: Number(entity.stockBalance) || 0, reason: adjustmentReason }
    });
  }

  count.state = 'approved';
  count.approvedAt = now;
  count.approvedByPerson = approver;
  count.approvedBy = approver;
  count.adjustmentReason = adjustmentReason;

  saveEntities(entities);
  saveDocuments(documents);
  saveCounts(counts);
  auditEvents.forEach((event) => {
    appendAudit({
      entityId: event.entityId,
      entityType: 'document',
      action: 'approve-adjustment',
      person: approver,
      details: `Conteo ${count.count_id}`,
      before: event.before,
      after: event.after
    });
  });
  return { count: clone(count), adjustments };
}

export function getCount(countId) {
  return loadCounts().find((c) => c.count_id === countId) || null;
}
