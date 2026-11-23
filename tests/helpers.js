import { AUTH_SESSION_KEY } from '../src/auth.js';
import { addDocument, addEntity, savePersons } from '../src/storage.js';
import { initApp } from '../src/app.js';
import { userConfig } from '../src/module-config.js';

export const baseConfig = {
  moduleName: 'Logística e Inventario',
  labels: {
    entity: { singular: 'Producto', plural: 'Productos', article: 'el' },
    document: { singular: 'Movimiento de Inventario', plural: 'Movimientos', article: 'el' },
    dashboard: 'Panel',
    search: 'Buscar',
    manage: 'Gestión'
  },
  customFields: { entity: [], document: [] },
  statusLifecycle: null,
  theme: { accentColor: '#1f6feb' }
};

export const configuredConfig = userConfig;

export function mountApp(rawConfig = baseConfig, { authenticated = true } = {}) {
  const root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
  if (authenticated) {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, 'Ana');
    savePersons(['Ana', 'Bruno', 'Carlos', 'Diana']);
  }
  return initApp({ root, rawConfig });
}

export function setValue(element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
}

export function submit(form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

export function tick(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function go(app, view, section = 'entities') {
  app.navigate(view, { section });
  await tick();
}

export function seedEntity(overrides = {}, config = baseConfig) {
  const customFields = { ...(overrides.customFields ?? {}) };
  const code = overrides.code ?? 'TOR-005';
  const reorderPoint = overrides.reorderPoint ?? 0;
  const unit = overrides.unit ?? overrides.unitOfMeasure ?? 'Unidades';
  return addEntity(
    {
      name: 'Tornillos',
      code,
      category: 'Ferretería',
      unit,
      reorderPoint,
      customFields: {
        sku: customFields.sku ?? code,
        punto_reorden: customFields.punto_reorden ?? reorderPoint,
        ...customFields
      },
      ...overrides
    },
    config
  );
}

export function seedEntry(entityId, overrides = {}, config = baseConfig) {
  return addDocument(
    {
      entity_id: entityId,
      type: 'ENTRADA',
      quantity: 10,
      doc_respaldo: 'Guía de despacho de prueba',
      aisle: 'A',
      shelf: '1',
      level: '1',
      ...overrides
    },
    config
  );
}
