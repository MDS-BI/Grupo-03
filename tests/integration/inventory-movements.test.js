import { describe, expect, it, vi } from 'vitest';
import { getEntity, getLatestLocation, loadDocuments } from '../../src/storage.js';
import { baseConfig, go, mountApp, seedEntity, seedEntry, setValue, submit, tick } from '../helpers.js';

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

  it('registra una transferencia entre ubicaciones sin cambiar el stock total', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 50, aisle: 'A', shelf: '3', level: '2' });
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'TRANSFERENCIA');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '10');

    setValue(form.querySelector('[data-testid="transfer-from-aisle"]'), 'A');
    setValue(form.querySelector('[data-testid="transfer-from-shelf"]'), '3');
    setValue(form.querySelector('[data-testid="transfer-from-level"]'), '2');
    setValue(form.querySelector('[data-testid="transfer-to-aisle"]'), 'B');
    setValue(form.querySelector('[data-testid="transfer-to-shelf"]'), '1');
    setValue(form.querySelector('[data-testid="transfer-to-level"]'), '1');
    submit(form);

    expect(getEntity(entity.entity_id).stockBalance).toBe(50);
    expect(loadDocuments().filter((d) => d.type === 'TRANSFERENCIA')).toHaveLength(1);
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'B', shelf: '1', level: '1' });
  });

  it('bloquea una transferencia que excede el stock disponible', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 5 });
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'TRANSFERENCIA');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '10');
    setValue(form.querySelector('[data-testid="transfer-from-aisle"]'), 'A');
    setValue(form.querySelector('[data-testid="transfer-from-shelf"]'), '1');
    setValue(form.querySelector('[data-testid="transfer-from-level"]'), '1');
    setValue(form.querySelector('[data-testid="transfer-to-aisle"]'), 'B');
    setValue(form.querySelector('[data-testid="transfer-to-shelf"]'), '1');
    setValue(form.querySelector('[data-testid="transfer-to-level"]'), '1');

    expect(form.querySelector('[data-testid="stock-error"]').hidden).toBe(false);
    expect(form.querySelector('[data-testid="document-save"]').disabled).toBe(true);
    expect(loadDocuments().filter((d) => d.type === 'TRANSFERENCIA')).toHaveLength(0);
  });

  it('exige observación cuando el motivo de salida es Merma', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 20 });
    const app = mountApp();
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'SALIDA');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '2');
    setValue(form.querySelector('[data-testid="document-reason"]'), 'Merma');
    submit(form);

    expect(document.querySelector('[data-field="notes"] .field-error').textContent).toContain('obligatoria');
    expect(loadDocuments().filter((d) => d.type === 'SALIDA')).toHaveLength(0);

    setValue(form.querySelector('[data-testid="document-notes"]'), 'Producto dañado');
    submit(form);
    expect(loadDocuments().filter((d) => d.type === 'SALIDA')).toHaveLength(1);
    expect(getEntity(entity.entity_id).stockBalance).toBe(18);
  });
});

describe('integraci�n: US4 kardex, anulaci�n y conteos/ajustes', () => {
  it('muestra kardex con filtros y permite anular un movimiento confirmado', async () => {
    const { voidDocument, getKardex, addDocument } = await import('../../src/storage.js');
    const entity = seedEntity();
    addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 50, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);
    const salida = addDocument({ entity_id: entity.entity_id, type: 'SALIDA', quantity: 30, reason: 'Venta', state: 'confirmed' }, baseConfig);

    const app = mountApp();
    await go(app, 'manage', 'documents');
    const kardexEntity = document.querySelector('[data-testid="kardex-entity"]');
    setValue(kardexEntity, entity.entity_id);
    expect(document.querySelector('[data-testid="kardex-list"]').textContent).toContain('Saldo');

    setValue(document.querySelector('[data-testid="kardex-type"]'), 'SALIDA');
    expect(document.querySelectorAll('[data-testid^="document-row-"]').length).toBeGreaterThanOrEqual(1);

    voidDocument(salida.document_id, { reason: 'Correcci�n', actorLabel: 'admin' });
    await go(app, 'manage', 'documents');
    setValue(document.querySelector('[data-testid="kardex-entity"]'), entity.entity_id);
    const kardex = getKardex(entity.entity_id);
    expect(kardex.some((d) => d.voidsMovementId === salida.document_id)).toBe(true);
  });

  it('ejecuta flujo de conteo ciego, cierre y ajuste aprobado', async () => {
    const { createPhysicalCount, recordBlindCountDetail, closePhysicalCount, approveCountAdjustment, addDocument, loadDocuments } = await import('../../src/storage.js');
    const entity = seedEntity();
    addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 20, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);

    const app = mountApp();
    await go(app, 'manage', 'documents');

    // create count via UI
    document.querySelector('[data-testid="count-create"]').click();
    await tick();
    const countId = document.querySelector('[data-testid="count-id"]').value || document.querySelector('[data-testid="count-status"]').textContent.match(/(cnt_[^\s]+)/)?.[1];
    expect(countId).toBeTruthy();

    // blind capture + close + approve
    if (countId) document.querySelector('[data-testid="count-id"]').value = countId;
    setValue(document.querySelector('[data-testid="count-entity"]'), entity.entity_id);
    setValue(document.querySelector('[data-testid="count-qty"]'), '18');
    document.querySelector('[data-testid="count-record"]').click();
    await tick();
    document.querySelector('[data-testid="count-close"]').click();
    await tick();
    setValue(document.querySelector('[data-testid="adjust-approver"]'), 'supervisor');
    setValue(document.querySelector('[data-testid="adjust-reason"]'), 'Da�o');
    document.querySelector('[data-testid="count-approve-adjustment"]').click();
    await tick();

    expect(getEntity(entity.entity_id).stockBalance).toBe(18);
    expect(loadDocuments().some((d) => d.type === 'AJUSTE' && d.reason === 'Da�o')).toBe(true);
  });
});
