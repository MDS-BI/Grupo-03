import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../../src/components/dom.js';
import { mountApp, seedEntity, seedEntry, setValue } from '../helpers.js';

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
