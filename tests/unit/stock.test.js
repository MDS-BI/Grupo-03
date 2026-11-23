import { beforeEach, describe, expect, it } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  addDocument,
  deleteDocument,
  getAvailableStock,
  getLatestLocation,
  getLocationBalances,
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
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
        doc_respaldo: 'Guía de prueba',
        quantity: 1,
        aisle: 'B',
        shelf: '2',
        level: '3'
      },
      baseConfig
    );
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'B', shelf: '2', level: '3' });
  });

  it('registra una TRANSFERENCIA entre ubicaciones sin cambiar el stock total', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        doc_respaldo: 'Guía de prueba',
        quantity: 50,
        aisle: 'A',
        shelf: '3',
        level: '2'
      },
      baseConfig
    );
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'TRANSFERENCIA',
        quantity: 10,
        fromAisle: 'A',
        fromShelf: '3',
        fromLevel: '2',
        toAisle: 'B',
        toShelf: '1',
        toLevel: '1'
      },
      baseConfig
    );

    expect(getEntity(entity.entity_id).stockBalance).toBe(50);
    expect(getLatestLocation(entity.entity_id)).toEqual({ aisle: 'B', shelf: '1', level: '1' });
    expect(getLocationBalances(entity.entity_id)).toEqual({ 'A-3-2': 40, 'B-1-1': 10 });
  });

  it('bloquea una TRANSFERENCIA que excede el stock disponible', () => {
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        doc_respaldo: 'Guía de prueba',
        quantity: 5,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    expect(() =>
      addDocument(
        {
          entity_id: entity.entity_id,
          type: 'TRANSFERENCIA',
          quantity: 10,
          fromAisle: 'A',
          fromShelf: '1',
          fromLevel: '1',
          toAisle: 'B',
          toShelf: '1',
          toLevel: '1'
        },
        baseConfig
      )
    ).toThrow(ValidationError);
    expect(getEntity(entity.entity_id).stockBalance).toBe(5);
  });

  it('requiere observación cuando el motivo de SALIDA es Merma y detecta umbral de reorden', async () => {
    const { getDashboardStats, isBelowReorderPoint } = await import('../../src/storage.js');
    const entity = seedEntity({ reorderPoint: 10 });
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        doc_respaldo: 'Guía de prueba',
        quantity: 10,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    expect(() =>
      addDocument(
        { entity_id: entity.entity_id, type: 'SALIDA', quantity: 2, reason: 'Merma', notes: '' },
        baseConfig
      )
    ).toThrow(ValidationError);

    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'SALIDA',
        quantity: 2,
        reason: 'Merma',
        notes: 'Producto dañado'
      },
      baseConfig
    );
    expect(getEntity(entity.entity_id).stockBalance).toBe(8);
    expect(isBelowReorderPoint(getEntity(entity.entity_id))).toBe(true);
    expect(getDashboardStats().critical).toBeGreaterThanOrEqual(1);
  });
});

describe('storage: US4 inmutabilidad, anulación y ajustes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('impide editar o eliminar un movimiento confirmado y permite anular con contramovimiento vinculado', async () => {
    const { voidDocument, updateDocument, deleteDocument, loadDocuments } =
      await import('../../src/storage.js');
    const entity = seedEntity();
    const doc = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        doc_respaldo: 'Guía de prueba',
        quantity: 20,
        aisle: 'A',
        shelf: '1',
        level: '1',
        state: 'confirmed'
      },
      baseConfig
    );

    expect(() => updateDocument(doc.document_id, { quantity: 10 }, baseConfig)).toThrow(
      ValidationError
    );
    expect(() => deleteDocument(doc.document_id)).toThrow(ValidationError);

    const result = voidDocument(doc.document_id, {
      reason: 'Error de captura',
      actorPerson: 'Ana'
    });
    expect(result.voided.state).toBe('voided');
    expect(result.voided.voidedByPerson).toBe('Ana');
    expect(result.contramovement.actorPerson).toBe('Ana');
    expect(result.contramovement.voidsMovementId).toBe(doc.document_id);
    expect(result.contramovement.state).toBe('confirmed');

    const docs = loadDocuments();
    expect(docs.find((d) => d.document_id === doc.document_id).state).toBe('voided');
    expect(docs.some((d) => d.voidsMovementId === doc.document_id)).toBe(true);
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
  });

  it('aplica ajustes aprobados desde conteo y los registra como AJUSTE confirmado', async () => {
    const {
      createPhysicalCount,
      recordBlindCountDetail,
      closePhysicalCount,
      approveCountAdjustment,
      loadDocuments
    } = await import('../../src/storage.js');
    const entity = seedEntity();
    addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        doc_respaldo: 'Guía de prueba',
        quantity: 20,
        aisle: 'A',
        shelf: '1',
        level: '1',
        state: 'confirmed'
      },
      baseConfig
    );

    const count = createPhysicalCount({ actorPerson: 'Operador' });
    recordBlindCountDetail(count.count_id, { entity_id: entity.entity_id, countedQuantity: 18 });
    const closed = closePhysicalCount(count.count_id);
    expect(closed.details[0].systemQuantity).toBe(20);
    expect(closed.details[0].difference).toBe(-2);

    const { adjustments } = approveCountAdjustment(count.count_id, {
      approvedByPerson: 'Supervisor',
      reason: 'Daño'
    });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].type).toBe('AJUSTE');
    expect(adjustments[0].state).toBe('confirmed');
    expect(adjustments[0].approvedByPerson).toBe('Supervisor');
    expect(getEntity(entity.entity_id).stockBalance).toBe(18);
    expect(loadDocuments().some((d) => d.type === 'AJUSTE' && d.countId === count.count_id)).toBe(
      true
    );
  });
});

describe('storage: US2 respaldo y proveedor en entradas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exige el documento de respaldo en una ENTRADA', () => {
    const entity = seedEntity();
    expect(() =>
      addDocument(
        {
          entity_id: entity.entity_id,
          type: 'ENTRADA',
          quantity: 5,
          aisle: 'A',
          shelf: '1',
          level: '1'
        },
        baseConfig
      )
    ).toThrow(ValidationError);

    try {
      addDocument(
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
    } catch (error) {
      expect(error.errors.doc_respaldo).toBeTruthy();
    }
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
  });

  it('valida que el proveedor de la entrada exista', async () => {
    const { addProvider } = await import('../../src/storage.js');
    const entity = seedEntity();
    expect(() =>
      addDocument(
        {
          entity_id: entity.entity_id,
          type: 'ENTRADA',
          quantity: 5,
          doc_respaldo: 'Guíaa 1',
          providerId: 'prov_missing',
          aisle: 'A',
          shelf: '1',
          level: '1'
        },
        baseConfig
      )
    ).toThrow(ValidationError);

    const provider = addProvider({ rut: '12.345.678-5', razon_social: 'Distribuidora Sur' });
    const document = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 5,
        doc_respaldo: 'Guíaa 1',
        providerId: provider.provider_id,
        aisle: 'A',
        shelf: '1',
        level: '1'
      },
      baseConfig
    );
    expect(document.providerId).toBe(provider.provider_id);
    expect(document.doc_respaldo).toBe('Guíaa 1');
  });
});

describe('storage: US3 sugerencia FIFO', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sugiere la ubicación de la entrada confirmada más antigua', async () => {
    const { getFifoLocationSuggestion, loadDocuments, saveDocuments } =
      await import('../../src/storage.js');
    const entity = seedEntity();
    const first = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 10,
        doc_respaldo: 'Guíaa 1',
        aisle: 'A',
        shelf: '1',
        level: '1',
        state: 'confirmed'
      },
      baseConfig
    );
    const second = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 10,
        doc_respaldo: 'Guíaa 2',
        aisle: 'B',
        shelf: '2',
        level: '2',
        state: 'confirmed'
      },
      baseConfig
    );

    const docs = loadDocuments();
    docs.find((document) => document.document_id === first.document_id).createdAt =
      '2026-01-01T10:00:00.000Z';
    docs.find((document) => document.document_id === second.document_id).createdAt =
      '2026-02-01T10:00:00.000Z';
    saveDocuments(docs);

    expect(getFifoLocationSuggestion(entity.entity_id)).toMatchObject({
      documentId: first.document_id,
      aisle: 'A',
      shelf: '1',
      level: '1'
    });
  });
});
