import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../../src/components/dom.js';
import { baseConfig, mountApp, seedEntity, seedEntry, setValue } from '../helpers.js';

function kpiValue(testId) {
  return document.querySelector(`[data-testid="${testId}"] .kpi-value`).textContent;
}

describe('integración: panel analítico', () => {
  it('muestra KPIs globales, filtra por categoría y limpia filtros', async () => {
    const a = seedEntity({
      name: 'A',
      code: 'A',
      category: 'Ferretería',
      unitCost: 1000,
      reorderPoint: 50
    });
    seedEntry(a.entity_id, { quantity: 100 });
    const b = seedEntity({
      name: 'B',
      code: 'B',
      category: 'Oficina',
      unitCost: 500,
      reorderPoint: 20
    });
    seedEntry(b.entity_id, { quantity: 10 });
    const c = seedEntity({
      name: 'C',
      code: 'C',
      category: 'Ferretería',
      unitCost: 2000,
      reorderPoint: 5
    });
    seedEntry(c.entity_id, { quantity: 3 });

    mountApp();

    expect(kpiValue('kpi-entities')).toBe('3');
    expect(kpiValue('kpi-documents')).toBe('3');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(111000));
    expect(kpiValue('kpi-critical')).toBe('2');
    expect(document.querySelector('[data-testid="critical-alert"]').textContent).toContain('2');
    expect(document.querySelectorAll('[data-testid^="entity-row-"]')).toHaveLength(3);

    setValue(document.querySelector('[data-testid="dashboard-category"]'), 'Ferretería');

    expect(kpiValue('kpi-entities')).toBe('2');
    expect(kpiValue('kpi-documents')).toBe('2');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(106000));
    expect(kpiValue('kpi-critical')).toBe('1');
    const rows = Array.from(document.querySelectorAll('[data-testid^="entity-row-"]'));
    expect(rows).toHaveLength(2);
    rows.forEach((row) => {
      expect(row.textContent).toContain('Ferretería');
      expect(row.textContent).not.toContain('Oficina');
    });

    document.querySelector('[data-testid="clear-filters"]').click();

    expect(kpiValue('kpi-entities')).toBe('3');
    expect(kpiValue('kpi-documents')).toBe('3');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(111000));
    expect(kpiValue('kpi-critical')).toBe('2');
  });

  it('renderiza un estado vacío cuando no hay entidades ni documentos', () => {
    mountApp();

    expect(document.querySelector('[data-testid="dashboard-empty"]')).toBeTruthy();
    expect(kpiValue('kpi-entities')).toBe('0');
    expect(kpiValue('kpi-documents')).toBe('0');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(0));
    expect(kpiValue('kpi-critical')).toBe('0');
    expect(document.querySelector('[data-testid="critical-alert"]')).toBeNull();
  });

  it('muestra una alerta visual cuando hay productos en nivel crítico', () => {
    const entity = seedEntity({ reorderPoint: 10 });
    seedEntry(entity.entity_id, { quantity: 5 });
    mountApp();
    expect(
      document.querySelector('[data-testid="kpi-critical"]').classList.contains('is-critical')
    ).toBe(true);
    expect(document.querySelector('[data-testid="critical-alert"]')).toBeTruthy();
  });
});

describe('integraci�n: panel US5 reposici�n', () => {
  it('renderiza alertas de reposici�n y genera solicitud agrupada por proveedor', async () => {
    const { loadReplenishmentRequests } = await import('../../src/storage.js');
    const a = seedEntity({
      name: 'A',
      code: 'RA',
      category: 'Cat',
      reorderPoint: 20,
      customFields: { proveedor: 'Prov A' }
    });
    seedEntry(a.entity_id, { quantity: 10 });
    const b = seedEntity({
      name: 'B',
      code: 'RB',
      category: 'Cat',
      reorderPoint: 20,
      customFields: { proveedor: 'Prov B' }
    });
    seedEntry(b.entity_id, { quantity: 5 });

    mountApp();

    expect(document.querySelector('[data-testid="dashboard-alerts"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="replenishment-table"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="kpi-no-movement"]')).toBeTruthy();

    // ensure suggested quantities editable and generate request
    const qtyA = document.querySelector(`[data-testid="replenish-qty-${a.entity_id}"]`);
    setValue(qtyA, '7');
    document.querySelector('[data-testid="generate-replenishment"]').click();

    expect(loadReplenishmentRequests().length).toBe(1);
    expect(document.querySelector('[data-testid="replenishment-notice"]').textContent).toContain(
      'proveedor'
    );
  });

  it('mantiene comportamiento de filtros y limpiar filtros en el panel', () => {
    const a = seedEntity({ name: 'A', code: 'FA', category: 'Ferreter�a', reorderPoint: 1 });
    seedEntry(a.entity_id, { quantity: 5 });
    seedEntity({ name: 'B', code: 'FB', category: 'Oficina', reorderPoint: 1 });
    mountApp();

    setValue(document.querySelector('[data-testid="dashboard-category"]'), 'Ferreter�a');
    expect(document.querySelector('[data-testid="active-filter"]')).toBeTruthy();
    document.querySelector('[data-testid="clear-filters"]').click();
    expect(document.querySelector('[data-testid="dashboard-category"]').value).toBe('');
  });
});

describe('integraci�n: panel US7 per�odo y cobertura', () => {
  it('recalcula KPIs y cobertura al aplicar un rango de fechas', async () => {
    const { addDocument, loadDocuments, saveDocuments } = await import('../../src/storage.js');
    const entity = seedEntity({ name: 'A', code: 'PA', category: 'Cat', reorderPoint: 1 });
    const entry = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        doc_respaldo: 'Gu�a 1',
        aisle: 'A',
        shelf: '1',
        level: '1',
        state: 'confirmed'
      },
      baseConfig
    );
    const exit = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'SALIDA',
        quantity: 30,
        reason: 'Venta',
        state: 'confirmed'
      },
      baseConfig
    );
    const docs = loadDocuments();
    docs.find((document) => document.document_id === entry.document_id).createdAt =
      '2026-01-01T10:00:00.000Z';
    docs.find((document) => document.document_id === exit.document_id).createdAt =
      '2026-01-31T10:00:00.000Z';
    saveDocuments(docs);

    mountApp();
    expect(kpiValue('kpi-documents')).toBe('2');

    setValue(document.querySelector('[data-testid="dashboard-from"]'), '2026-01-01');
    setValue(document.querySelector('[data-testid="dashboard-to"]'), '2026-01-31');
    expect(kpiValue('kpi-documents')).toBe('2');
    const coverageDays = document.querySelector(
      `[data-testid="coverage-days-${entity.entity_id}"]`
    );
    expect(coverageDays.textContent).toBe('70.0');
    expect(document.querySelector('[data-testid="active-filter"]').textContent).toContain(
      'Desde: 2026-01-01'
    );

    setValue(document.querySelector('[data-testid="dashboard-from"]'), '2026-02-01');
    expect(kpiValue('kpi-documents')).toBe('0');
    expect(
      document.querySelector(`[data-testid="coverage-days-${entity.entity_id}"]`).textContent
    ).toBe('\u2014');
  });
});
