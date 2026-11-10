import { describe, expect, it } from 'vitest';
import { loadEntities } from '../../src/storage.js';
import { configuredConfig, go, mountApp, setValue, submit } from '../helpers.js';

describe('integración: creación de entidades', () => {
  it('crea una entidad con campos personalizados y la muestra en el catálogo', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');

    const form = document.querySelector('[data-testid="entity-form"]');
    expect(form).toBeTruthy();

    setValue(form.querySelector('[name="name"]'), 'Caja de tornillos 5 mm');
    setValue(form.querySelector('[name="code"]'), 'TOR-005');
    setValue(form.querySelector('[name="category"]'), 'Ferretería');
    setValue(form.querySelector('[data-testid="custom-sku"]'), 'TOR-005');
    setValue(form.querySelector('[data-testid="custom-punto_reorden"]'), '20');
    setValue(form.querySelector('[data-testid="entity-unit-cost"]'), '1500');
    submit(form);

    const entities = loadEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('Caja de tornillos 5 mm');
    expect(entities[0].customFields.sku).toBe('TOR-005');
    expect(entities[0].customFields.punto_reorden).toBe(20);
    expect(entities[0].unitCost).toBe(1500);

    await go(app, 'dashboard');
    const row = document.querySelector('[data-testid^="entity-row-"]');
    expect(row).toBeTruthy();
    expect(row.textContent).toContain('Caja de tornillos 5 mm');
    expect(row.textContent).toContain('Ferretería');
  });

  it('bloquea el guardado y muestra mensajes descriptivos cuando faltan obligatorios', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');

    const form = document.querySelector('[data-testid="entity-form"]');
    submit(form);

    expect(loadEntities()).toHaveLength(0);
    expect(document.querySelector('[data-field="name"] .field-error').textContent).toContain(
      'obligatorio'
    );
    expect(document.querySelector('[data-field="code"] .field-error').textContent).toContain(
      'obligatorio'
    );
    expect(document.querySelector('[data-field="category"] .field-error').textContent).toContain(
      'obligatoria'
    );
    expect(
      document.querySelector('[data-field="customFields.sku"] .field-error').textContent
    ).toContain('obligatorio');
    expect(
      document.querySelector('[data-field="customFields.punto_reorden"] .field-error').textContent
    ).toContain('obligatorio');
  });
});
