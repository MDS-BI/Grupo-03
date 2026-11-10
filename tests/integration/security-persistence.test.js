import { describe, expect, it } from 'vitest';
import { addEntity, loadEntities, searchEntities } from '../../src/storage.js';
import {
  baseConfig,
  configuredConfig,
  go,
  mountApp,
  seedEntity,
  setValue,
  submit
} from '../helpers.js';

describe('integración: seguridad, persistencia y volumen', () => {
  it('escapa los datos de usuario y no ejecuta HTML ni scripts', () => {
    seedEntity({
      name: '<img src=x onerror="window.__xss=1">',
      code: '<script>window.__xss=2</script>',
      category: 'Ferretería'
    });
    mountApp(configuredConfig);

    const row = document.querySelector('[data-testid^="entity-row-"]');
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('script')).toBeNull();
    expect(window.__xss).toBeUndefined();
    expect(row.textContent).toContain('<img src=x');
  });

  it('persiste los datos al recargar la aplicación', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');
    const form = document.querySelector('[data-testid="entity-form"]');
    setValue(form.querySelector('[data-testid="entity-name"]'), 'Producto persistente');
    setValue(form.querySelector('[data-testid="entity-code"]'), 'PER-01');
    setValue(form.querySelector('[data-testid="entity-category"]'), 'Ferretería');
    setValue(form.querySelector('[data-testid="custom-sku"]'), 'PER-01');
    setValue(form.querySelector('[data-testid="custom-punto_reorden"]'), '5');
    submit(form);

    expect(loadEntities()).toHaveLength(1);

    window.__erpApp.destroy();
    document.body.innerHTML = '';
    window.location.hash = '';
    mountApp(configuredConfig);

    expect(document.querySelector('[data-testid^="entity-row-"]').textContent).toContain(
      'Producto persistente'
    );
  });

  it('mantiene el listado y la búsqueda usables con 500 entidades', () => {
    for (let index = 0; index < 500; index += 1) {
      addEntity(
        {
          name: `Producto ${index}`,
          code: `P-${index}`,
          category: index % 2 === 0 ? 'Ferretería' : 'Oficina'
        },
        baseConfig
      );
    }

    mountApp(configuredConfig);

    expect(document.querySelectorAll('[data-testid^="entity-row-"]')).toHaveLength(500);
    expect(searchEntities('Producto 499')).toHaveLength(1);
    expect(searchEntities('', 'Oficina')).toHaveLength(250);
  });
});
