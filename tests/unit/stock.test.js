import { beforeEach, describe, expect, it } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  addDocument,
  deleteDocument,
  getAvailableStock,
  getLatestLocation,
  getEntity,
  updateDocument
} from '../../src/storage.js';
import { baseConfig, seedEntity } from '../helpers.js';

describe('storage: movimientos de inventario', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('incrementa el stock al registrar una ENTRADA y guarda la ubicación', () => {
    const entity = seedEntity();
    const document = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '3',
        level: '2'
      },
      baseConfig
    );

    expect(document.document_id).toMatch(/^doc_/);
    expect(getEntity(entity.entity_id).stockBalance).toBe(100);
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'A', shelf: '3', level: '2' });
  });

  it('exige pasillo, estante y nivel en una ENTRADA', () => {
    const entity = seedEntity();
    expect(() =>
      addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 10 }, baseConfig)
    ).toThrow(ValidationError);

    try {
      addDocument({ entity_id: entity.entity_id, type: 'ENTRADA', quantity: 10 }, baseConfig);
    } catch (error) {
      expect(error.errors.aisle).toBeTruthy();
      expect(error.errors.shelf).toBeTruthy();
      expect(error.errors.level).toBeTruthy();
    }
  });

  it('rechaza una SALIDA superior al stock disponible', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    expect(() =>
      addDocument({ entity_id: entity.entity_id, type: 'SALIDA', quantity: 101 }, baseConfig)
    ).toThrow(ValidationError);
    expect(getEntity(entity.entity_id).stockBalance).toBe(100);
  });

  it('descuenta el stock exactamente en una SALIDA válida', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    addDocument({ entity_id: entity.entity_id, type: 'SALIDA', quantity: 30 }, baseConfig);
    expect(getEntity(entity.entity_id).stockBalance).toBe(70);
  });

  it('ajusta el stock al editar un documento', () => {
    const entity = seedEntity();
    const entry = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    updateDocument(entry.document_id, { quantity: 120 }, baseConfig);
    expect(getEntity(entity.entity_id).stockBalance).toBe(120);

    const exit = addDocument(
      { entity_id: entity.entity_id, type: 'SALIDA', quantity: 30 },
      baseConfig
    );
    expect(getEntity(entity.entity_id).stockBalance).toBe(90);
    updateDocument(exit.document_id, { quantity: 50 }, baseConfig);
    expect(getEntity(entity.entity_id).stockBalance).toBe(70);
  });

  it('revierte el stock al eliminar un documento', () => {
    const entity = seedEntity();
    const entry = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    deleteDocument(entry.document_id);
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
  });

  it('informa cuando el documento ya no existe', () => {
    expect(() => updateDocument('doc_missing', {}, baseConfig)).toThrow(NotFoundError);
    expect(() => deleteDocument('doc_missing')).toThrow(NotFoundError);
  });

  it('calcula el stock disponible al editar una SALIDA', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 100,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    const exit = addDocument(
      { entity_id: entity.entity_id, type: 'SALIDA', quantity: 30 },
      baseConfig
    );
    expect(getAvailableStock(entity.entity_id, exit)).toBe(100);
    expect(getEntity(entity.entity_id).stockBalance).toBe(70);
  });

  it('deriva la ubicación de la entrada más reciente', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 1,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 1,
        aisle: 'B',
        shelf: '2',
        level: '3'
      },
      baseConfig
    );
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'B', shelf: '2', level: '3' });
  });
});
