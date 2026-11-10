import { describe, expect, it, vi } from 'vitest';
import { getEntity, getLatestLocation, loadDocuments } from '../../src/storage.js';
import { go, mountApp, seedEntity, seedEntry, setValue, submit } from '../helpers.js';

function documentForm() {
  return document.querySelector('[data-testid="document-form"]');
}

describe('integración: entradas y salidas de inventario', () => {
  it('habilita la ubicación tras indicar entidad y cantidad y actualiza el stock', async () => {
    const entity = seedEntity();
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    const aisle = form.querySelector('[data-testid="document-aisle"]');
    expect(aisle.disabled).toBe(true);
    expect(form.querySelector('[data-testid="entity-unit-cost"]')).toBeNull();
    expect(form.textContent).not.toContain('Costo unitario');

    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    expect(aisle.disabled).toBe(true);

    setValue(form.querySelector('[data-testid="document-quantity"]'), '100');
    expect(aisle.disabled).toBe(false);

    setValue(aisle, 'A');
    setValue(form.querySelector('[data-testid="document-shelf"]'), '3');
    setValue(form.querySelector('[data-testid="document-level"]'), '2');
    submit(form);

    expect(getEntity(entity.entity_id).stockBalance).toBe(100);
    expect(loadDocuments()).toHaveLength(1);
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'A', shelf: '3', level: '2' });

    await go(app, 'dashboard');
    const row = document.querySelector('[data-testid^="entity-row-"]');
    expect(row.textContent).toContain('Pasillo A');
    expect(row.textContent).toContain('100');
  });

  it('muestra mensajes cuando falta la ubicación de una entrada', async () => {
    const entity = seedEntity();
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-quantity"]'), '10');
    submit(form);

    expect(document.querySelector('[data-field="aisle"] .field-error').textContent).toContain(
      'obligatorio'
    );
    expect(document.querySelector('[data-field="shelf"] .field-error').textContent).toContain(
      'obligatorio'
    );
    expect(document.querySelector('[data-field="level"] .field-error').textContent).toContain(
      'obligatorio'
    );
    expect(loadDocuments()).toHaveLength(0);
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
  });

  it('bloquea una salida superior al stock y descuenta una salida válida', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 100 });
    const app = mountApp();
    await go(app, 'manage', 'documents');

    let form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'SALIDA');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '30');
    expect(form.querySelector('[data-testid="stock-info"]').textContent).toContain('100');
    submit(form);

    expect(getEntity(entity.entity_id).stockBalance).toBe(70);
    expect(loadDocuments()).toHaveLength(2);

    form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'SALIDA');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '1000');

    const stockError = form.querySelector('[data-testid="stock-error"]');
    expect(stockError.hidden).toBe(false);
    expect(stockError.textContent).toContain('Stock insuficiente');
    expect(form.querySelector('[data-testid="document-save"]').disabled).toBe(true);
    expect(loadDocuments()).toHaveLength(2);
    expect(getEntity(entity.entity_id).stockBalance).toBe(70);
  });

  it('cancela una entrada sin modificar el stock', async () => {
    const entity = seedEntity();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-quantity"]'), '50');
    setValue(form.querySelector('[data-testid="document-aisle"]'), 'A');
    setValue(form.querySelector('[data-testid="document-shelf"]'), '1');
    setValue(form.querySelector('[data-testid="document-level"]'), '1');

    form.querySelector('[data-testid="document-cancel"]').click();

    expect(confirm).toHaveBeenCalled();
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
    expect(loadDocuments()).toHaveLength(0);
  });

  it('muestra el stock disponible al seleccionar un producto', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 42 });
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    expect(form.querySelector('[data-testid="stock-info"]').textContent).toContain('42');
  });
});
