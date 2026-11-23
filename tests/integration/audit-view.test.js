import { describe, expect, it } from 'vitest';
import { updateEntity, voidDocument } from '../../src/storage.js';
import { baseConfig, go, mountApp, seedEntity, seedEntry, setValue } from '../helpers.js';

function auditRows() {
  return document.querySelectorAll('[data-testid^="audit-row-"]');
}

describe('integración: vista de auditoría', () => {
  it('muestra el registro de auditoría con persona, acción y valores antes/después', async () => {
    const entity = seedEntity();
    updateEntity(entity.entity_id, { name: 'Tornillos actualizados' }, baseConfig, {
      actorPerson: 'Bruno'
    });
    const entry = seedEntry(entity.entity_id, { quantity: 10, state: 'confirmed' });
    voidDocument(entry.document_id, { reason: 'Error de captura', actorPerson: 'Carlos' });

    const app = mountApp(baseConfig);
    await go(app, 'audit', 'audit');

    expect(document.querySelector('[data-testid="audit-table"]')).toBeTruthy();
    expect(auditRows().length).toBeGreaterThanOrEqual(3);
    const voidRow = Array.from(auditRows()).find((row) => row.textContent.includes('void'));
    expect(voidRow).toBeTruthy();
    expect(voidRow.textContent).toContain('Carlos');
    expect(voidRow.textContent).toContain('confirmed');
    expect(voidRow.textContent).toContain('voided');
  });

  it('filtra por acción, persona, entidad y rango de fechas', async () => {
    const entity = seedEntity();
    updateEntity(entity.entity_id, { name: 'Tornillos editados' }, baseConfig, {
      actorPerson: 'Bruno'
    });
    const entry = seedEntry(entity.entity_id, { quantity: 10, state: 'confirmed' });
    voidDocument(entry.document_id, { reason: 'Error de captura', actorPerson: 'Carlos' });

    const app = mountApp(baseConfig);
    await go(app, 'audit', 'audit');

    setValue(document.querySelector('[data-testid="audit-action"]'), 'void');
    expect(auditRows()).toHaveLength(1);
    expect(auditRows()[0].textContent).toContain('void');

    setValue(document.querySelector('[data-testid="audit-person"]'), 'Carlos');
    expect(auditRows()).toHaveLength(1);

    setValue(document.querySelector('[data-testid="audit-entity"]'), entity.entity_id);
    expect(auditRows()).toHaveLength(1);

    setValue(document.querySelector('[data-testid="audit-from"]'), '2099-01-01');
    expect(document.querySelector('[data-testid="audit-empty"]')).toBeTruthy();
  });

  it('muestra un estado vacío cuando no hay registros de auditoría', async () => {
    const app = mountApp(baseConfig);
    await go(app, 'audit', 'audit');
    expect(document.querySelector('[data-testid="audit-empty"]')).toBeTruthy();
  });
});
