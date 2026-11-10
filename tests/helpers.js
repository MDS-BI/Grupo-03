import { addDocument, addEntity } from '../src/storage.js';
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

export function mountApp(rawConfig = baseConfig) {
  const root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
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
  return addEntity(
    {
      name: 'Tornillos',
      code: 'TOR-005',
      category: 'Ferretería',
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
      aisle: 'A',
      shelf: '1',
      level: '1',
      ...overrides
    },
    config
  );
}
