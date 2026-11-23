import { describe, expect, it } from 'vitest';
import { loadDocuments, saveDocuments } from '../../src/storage.js';
import { baseConfig, go, mountApp, seedEntity, seedEntry, setValue } from '../helpers.js';

function documentForm() {
  return document.querySelector('[data-testid="document-form"]');
}

describe('integración: sugerencia FIFO y saldo inicial', () => {
  it('muestra la ubicación FIFO al preparar una salida', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id, { quantity: 10, aisle: 'A', shelf: '1', level: '1' });
    const app = mountApp(baseConfig);
    await go(app, 'manage', 'documents');

    const form = documentForm();
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-type"]'), 'SALIDA');

    const fifo = form.querySelector('[data-testid="fifo-suggestion"]');
    expect(fifo.hidden).toBe(false);
    expect(fifo.textContent).toContain('A-1-1');
  });

  it('muestra el saldo inicial del período en el kardex filtrado', async () => {
    const entity = seedEntity();
    const first = seedEntry(entity.entity_id, { quantity: 40 });
    const second = seedEntry(entity.entity_id, {
      quantity: 5,
      aisle: 'B',
      shelf: '2',
      level: '2'
    });

    const docs = loadDocuments();
    docs.find((document) => document.document_id === first.document_id).createdAt =
      '2026-01-01T10:00:00.000Z';
    docs.find((document) => document.document_id === second.document_id).createdAt =
      '2026-02-05T10:00:00.000Z';
    saveDocuments(docs);

    const app = mountApp(baseConfig);
    await go(app, 'manage', 'documents');

    setValue(document.querySelector('[data-testid="kardex-entity"]'), entity.entity_id);
    setValue(document.querySelector('[data-testid="kardex-from"]'), '2026-02-01');

    const opening = document.querySelector('[data-testid="kardex-opening"]');
    expect(opening).toBeTruthy();
    expect(opening.textContent).toContain('40');
    expect(document.querySelector('[data-testid="kardex-list"]').textContent).toContain('45');
  });
});
