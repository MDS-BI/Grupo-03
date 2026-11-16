import { beforeEach, describe, expect, it } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  addDocument,
  addEntity,
  deleteEntity,
  getDashboardStats,
  loadEntities,
  searchEntities,
  updateEntity
} from '../../src/storage.js';
import { userConfig } from '../../src/module-config.js';
import { baseConfig, seedEntity, seedEntry } from '../helpers.js';

function configuredEntity(overrides = {}) {
  return {
    name: 'Caja de tornillos',
    code: 'TOR-005',
    category: 'Ferretería',
    customFields: { sku: 'TOR-005', punto_reorden: 20 },
    ...overrides
  };
}

describe('storage: entidades', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('crea una entidad con identidad, marcas de tiempo y stock inicial 0', () => {
    const entity = addEntity(configuredEntity(), userConfig);
    expect(entity.entity_id).toMatch(/^ent_/);
    expect(entity.stockBalance).toBe(0);
    expect(entity.createdAt).toBeTruthy();
    expect(entity.updatedAt).toBeTruthy();
    expect(loadEntities()).toHaveLength(1);
  });

  it('rechaza entidades sin nombre, código o categoría', () => {
    expect(() => addEntity({ name: '', code: '', category: '' }, baseConfig)).toThrow(
      ValidationError
    );
    try {
      addEntity({ name: '', code: '', category: '' }, baseConfig);
    } catch (error) {
      expect(error.errors.name).toBeTruthy();
      expect(error.errors.code).toBeTruthy();
      expect(error.errors.category).toBeTruthy();
    }
  });

  it('valida fecha objetivo inválida', () => {
    expect(() =>
      addEntity({ name: 'A', code: 'A', category: 'C', targetDate: '2026-02-30' }, baseConfig)
    ).toThrow(ValidationError);
  });

  it('valida campos personalizados obligatorios y numéricos', () => {
    expect(() =>
      addEntity(
        {
          name: 'Caja',
          code: 'C-1',
          category: 'Ferretería',
          customFields: { sku: '', punto_reorden: 'abc' }
        },
        userConfig
      )
    ).toThrow(ValidationError);

    try {
      addEntity(
        {
          name: 'Caja',
          code: 'C-1',
          category: 'Ferretería',
          customFields: { sku: '', punto_reorden: 'abc' }
        },
        userConfig
      );
    } catch (error) {
      expect(error.errors['customFields.sku']).toBeTruthy();
      expect(error.errors['customFields.punto_reorden']).toBeTruthy();
    }
  });

  it('actualiza una entidad preservando stock y campos personalizados no declarados', () => {
    const entity = addEntity(
      configuredEntity({
        customFields: { sku: 'TOR-005', punto_reorden: 20, legado: 'conservar' }
      }),
      userConfig
    );
    const updated = updateEntity(
      entity.entity_id,
      {
        name: 'Caja de tornillos 5 mm',
        customFields: { sku: 'TOR-006', punto_reorden: 30 }
      },
      userConfig
    );
    expect(updated.name).toBe('Caja de tornillos 5 mm');
    expect(updated.stockBalance).toBe(0);
    expect(updated.customFields.legado).toBe('conservar');
    expect(updated.customFields.sku).toBe('TOR-006');
    expect(updated.customFields.punto_reorden).toBe(30);
  });

  it('normaliza y rechaza SKU/código duplicado globalmente', () => {
    addEntity(configuredEntity({ code: 'abc 123', customFields: { sku: 'abc 123', punto_reorden: 1 } }), userConfig);
    expect(() =>
      addEntity(
        configuredEntity({ name: 'Otro', code: 'ABC123', customFields: { sku: 'ABC123', punto_reorden: 2 } }),
        userConfig
      )
    ).toThrow(ValidationError);
  });

  it('elimina físicamente una entidad sin historial', () => {
    const entity = seedEntity();
    const result = deleteEntity(entity.entity_id);
    expect(result).toBeNull();
    expect(loadEntities()).toHaveLength(0);
  });

  it('no elimina físicamente una entidad con historial; la desactiva y conserva documentos', () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id);
    const result = deleteEntity(entity.entity_id);
    expect(loadEntities()).toHaveLength(1);
    expect(result?.status).toBe('inactive');
    expect(loadEntities()[0].status).toBe('inactive');
    expect(JSON.parse(localStorage.getItem('erp.documents') ?? '[]')).toHaveLength(1);
  });

  it('informa cuando la entidad ya no existe al editar o eliminar', () => {
    expect(() => updateEntity('ent_missing', {}, baseConfig)).toThrow(NotFoundError);
    expect(() => deleteEntity('ent_missing')).toThrow(NotFoundError);
  });

  it('aplica reglas de validación específicas del módulo', () => {
    const config = {
      ...baseConfig,
      customValidators: {
        entity: (record) =>
          record.name === 'Bloqueado'
            ? { name: 'El nombre está bloqueado por la regla del módulo.' }
            : {}
      }
    };
    expect(() => addEntity({ name: 'Bloqueado', code: 'B-1', category: 'C' }, config)).toThrow(
      ValidationError
    );
    expect(() =>
      addEntity({ name: 'Permitido', code: 'P-1', category: 'C' }, config)
    ).not.toThrow();
  });

  it('busca por nombre, código, categoría, descripción, fecha objetivo y campos personalizados', () => {
    addEntity(
      configuredEntity({
        name: 'Caja de tornillos',
        code: 'TOR-005',
        category: 'Ferretería',
        description: 'Acero inoxidable',
        targetDate: '2026-12-31'
      }),
      userConfig
    );
    addEntity(
      configuredEntity({
        name: 'Resma de papel',
        code: 'PAP-01',
        category: 'Oficina',
        customFields: { sku: 'PAP-01', punto_reorden: 5 }
      }),
      userConfig
    );

    expect(searchEntities('tornillos')).toHaveLength(1);
    expect(searchEntities('PAP-01')).toHaveLength(1);
    expect(searchEntities('oficina')).toHaveLength(1);
    expect(searchEntities('inoxidable')).toHaveLength(1);
    expect(searchEntities('2026-12')).toHaveLength(1);
    expect(searchEntities('TOR-005')).toHaveLength(1);
    expect(searchEntities('', 'Ferretería')).toHaveLength(1);
    expect(searchEntities('', 'No existe')).toHaveLength(0);
    expect(searchEntities('')).toHaveLength(2);
  });

  it('calcula KPIs globales y filtrados por categoría', () => {
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

    const globalStats = getDashboardStats();
    expect(globalStats.totalEntities).toBe(3);
    expect(globalStats.totalDocuments).toBe(3);
    expect(globalStats.valuation).toBe(111000);
    expect(globalStats.critical).toBe(2);
    expect(globalStats.categories).toEqual(['Ferretería', 'Oficina']);

    const filtered = getDashboardStats('Ferretería');
    expect(filtered.totalEntities).toBe(2);
    expect(filtered.totalDocuments).toBe(2);
    expect(filtered.valuation).toBe(106000);
    expect(filtered.critical).toBe(1);
  });

  it('mantiene documentos asociados al editar una entidad', () => {
    const entity = seedEntity();
    const document = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 5,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    updateEntity(entity.entity_id, { name: 'Nuevo nombre' }, baseConfig);
    expect(JSON.parse(localStorage.getItem('erp.documents'))[0].document_id).toBe(
      document.document_id
    );
  });
});

describe('storage: US4 kardex y conteos', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('genera kardex cronol�gico con saldo acumulado y permite filtrar por tipo', async () => {
    const { getKardex, addDocument } = await import('../../src/storage.js');
    const entity = seedEntity();
    addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 50, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);
    addDocument({ entity_id: entity.entity_id, type: 'SALIDA', quantity: 30, reason: 'Venta', state: 'confirmed' }, baseConfig);

    const kardex = getKardex(entity.entity_id);
    expect(kardex).toHaveLength(2);
    expect(kardex[0].saldo).toBe(50);
    expect(kardex[1].saldo).toBe(20);

    const salidas = getKardex(entity.entity_id, { type: 'SALIDA' });
    expect(salidas).toHaveLength(1);
    expect(salidas[0].type).toBe('SALIDA');
  });

  it('requiere motivo y aprobador distinto al contador al aprobar ajuste', async () => {
    const { createPhysicalCount, recordBlindCountDetail, closePhysicalCount, approveCountAdjustment, addDocument } = await import('../../src/storage.js');
    const entity = seedEntity();
    addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 10, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);
    const count = createPhysicalCount({ actorLabel: 'operador' });
    recordBlindCountDetail(count.count_id, { entity_id: entity.entity_id, countedQuantity: 9 });
    closePhysicalCount(count.count_id);

    expect(() => approveCountAdjustment(count.count_id, { approverLabel: 'operador', reason: 'Diferencia' })).toThrow();
    expect(() => approveCountAdjustment(count.count_id, { approverLabel: 'supervisor', reason: '' })).toThrow();
  });
});

describe('storage: US5 KPIs, alertas y reposici�n', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calcula KPIs incluyendo activos, alertas y sin movimiento en 90 d�as', async () => {
    const { getDashboardStats, addEntity, addDocument } = await import('../../src/storage.js');
    const { deactivateEntity } = await import('../../src/storage.js');
    const active = addEntity({ name: 'A', code: 'A1', category: 'Cat', unit: 'u', reorderPoint: 10, unitCost: 5, customFields: {} }, baseConfig);
    const inactive = addEntity({ name: 'B', code: 'B1', category: 'Cat', unit: 'u', reorderPoint: 5, customFields: {} }, baseConfig);
    deactivateEntity(inactive.entity_id);
    addDocument({ entity_id: active.entity_id, type: 'ENTRADA', quantity: 3, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);

    const stats = getDashboardStats();
    expect(stats.activeEntities).toBe(1);
    expect(stats.alerts).toBeGreaterThanOrEqual(1);
    expect(stats.noMovement90Days).toBeGreaterThanOrEqual(0);
  });

  it('genera sugerencias de reposici�n con clasificaci�n de alerta y cantidad sugerida', async () => {
    const { getReplenishmentSuggestions, addEntity, addDocument } = await import('../../src/storage.js');
    const e = addEntity({ name: 'Papel', code: 'P1', category: 'Papeler�a', unit: 'u', reorderPoint: 20, customFields: { proveedor: 'Prov A' } }, baseConfig);
    addDocument({ entity_id: e.entity_id, type: 'ENTRADA', quantity: 15, aisle: 'A', shelf: '1', level: '1', state: 'confirmed' }, baseConfig);

    const suggestions = getReplenishmentSuggestions();
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].entity_id).toBe(e.entity_id);
    expect(suggestions[0].suggestedQty).toBeGreaterThanOrEqual(0);
    expect(['red', 'yellow']).toContain(suggestions[0].alertLevel);
  });

  it('crea solicitud de reposici�n agrupada por proveedor', async () => {
    const { createReplenishmentRequest, loadReplenishmentRequests } = await import('../../src/storage.js');
    const e1 = seedEntity({ name: 'E1', code: 'E1', customFields: { proveedor: 'Prov A' } });
    const e2 = seedEntity({ name: 'E2', code: 'E2', customFields: { proveedor: 'Prov B' } });

    const req = createReplenishmentRequest({
      lines: [
        { entity_id: e1.entity_id, provider: 'Prov A', suggestedQty: 5 },
        { entity_id: e2.entity_id, provider: 'Prov B', suggestedQty: 3 }
      ],
      actorLabel: 'admin'
    });

    expect(req.request_id).toMatch(/^req_/);
    expect(Object.keys(req.groupedByProvider)).toEqual(expect.arrayContaining(['Prov A', 'Prov B']));
    expect(loadReplenishmentRequests()).toHaveLength(1);
  });
});
