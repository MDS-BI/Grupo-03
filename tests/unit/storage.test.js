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

  it('elimina una entidad y sus documentos en cascada', () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id);
    deleteEntity(entity.entity_id);
    expect(loadEntities()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('erp.documents') ?? '[]')).toHaveLength(0);
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
