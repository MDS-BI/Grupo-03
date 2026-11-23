import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../../src/components/dom.js';
import { loadDemoData } from '../../src/demo-data.js';
import {
  getDashboardStats,
  getKardex,
  getPersons,
  getReplenishmentSuggestions,
  loadDocuments,
  loadEntities,
  searchEntities
} from '../../src/storage.js';
import { configuredConfig, go, mountApp, setValue } from '../helpers.js';

function kpiValue(testId) {
  return document.querySelector(`[data-testid="${testId}"] .kpi-value`).textContent;
}

describe('prueba de datos: dataset simulado de logística', () => {
  it('persiste campos personalizados, proveedor y efectos de stock', () => {
    const { provider, tornillos, cinta } = loadDemoData();
    const entities = loadEntities();

    expect(getPersons()).toEqual(['Ana', 'Bruno', 'Carlos', 'Diana']);
    expect(entities).toHaveLength(2);
    expect(entities[0].customFields).toMatchObject({
      sku: 'TOR-M6',
      punto_reorden: 30,
      unidad_medida: 'Cajas'
    });
    expect(entities[0].providerId).toBe(provider.provider_id);
    expect(entities.find((entity) => entity.entity_id === tornillos.entity_id).stockBalance).toBe(
      55
    );
    expect(entities.find((entity) => entity.entity_id === cinta.entity_id).stockBalance).toBe(6);
    expect(loadDocuments()).toHaveLength(4);
  });

  it('calcula KPIs, kardex, búsqueda y reposición con los datos simulados', () => {
    const { tornillos } = loadDemoData();
    const stats = getDashboardStats();

    expect(stats.totalEntities).toBe(2);
    expect(stats.totalDocuments).toBe(4);
    expect(stats.valuation).toBe(68700);
    expect(stats.critical).toBe(1);
    expect(stats.categories).toEqual(['Ferretería', 'Oficina']);

    const kardex = getKardex(tornillos.entity_id);
    expect(kardex.map((row) => row.type)).toEqual(['ENTRADA', 'SALIDA', 'TRANSFERENCIA']);
    expect(kardex.map((row) => row.saldo)).toEqual([80, 55, 55]);

    expect(searchEntities('TOR-M6')).toHaveLength(1);
    expect(searchEntities('cinta', 'Oficina')).toHaveLength(1);
    expect(searchEntities('Tor', 'Ferretería')).toHaveLength(1);

    const suggestions = getReplenishmentSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].name).toBe('Cinta de embalaje');
    expect(suggestions[0].provider).toBe('Distribuidora Andina');
    expect(suggestions[0].suggestedQty).toBe(4);
  });

  it('renderiza el dataset simulado en panel, catálogo y movimientos', async () => {
    const { tornillos } = loadDemoData();
    const app = mountApp(configuredConfig);

    expect(kpiValue('kpi-entities')).toBe('2');
    expect(kpiValue('kpi-documents')).toBe('4');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(68700));
    expect(kpiValue('kpi-critical')).toBe('1');
    expect(document.querySelectorAll('[data-testid^="entity-row-"]')).toHaveLength(2);
    expect(document.querySelector('[data-testid="replenishment-table"]').textContent).toContain(
      'Cinta de embalaje'
    );

    setValue(document.querySelector('[data-testid="dashboard-category"]'), 'Ferretería');
    expect(kpiValue('kpi-entities')).toBe('1');
    expect(kpiValue('kpi-valuation')).toBe(formatCurrency(66000));

    await go(app, 'manage', 'entities');
    expect(document.body.textContent).toContain('Tornillos M6');
    expect(document.body.textContent).toContain('TOR-M6');

    await go(app, 'manage', 'documents');
    setValue(document.querySelector('[data-testid="kardex-entity"]'), tornillos.entity_id);
    expect(document.querySelectorAll('[data-testid^="document-row-"]')).toHaveLength(3);
  });

  it('carga los datos demo desde la interfaz y los visualiza en el panel', () => {
    mountApp(configuredConfig);

    expect(kpiValue('kpi-entities')).toBe('0');
    expect(document.querySelector('[data-testid="load-demo-data"]')).toBeTruthy();

    document.querySelector('[data-testid="load-demo-data"]').click();

    expect(kpiValue('kpi-entities')).toBe('2');
    expect(kpiValue('kpi-documents')).toBe('4');
    expect(document.body.textContent).toContain('Tornillos M6');
    expect(document.querySelector('[data-testid="demo-notice"]').textContent).toContain(
      'Datos demo cargados'
    );
    expect(document.querySelector('[data-testid="person-selector"]').value).toBe('Ana');
  });
});
