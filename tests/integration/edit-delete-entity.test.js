import { describe, expect, it, vi } from 'vitest';
import { deleteEntity, getEntity, loadDocuments, loadEntities } from '../../src/storage.js';
import { go, mountApp, seedEntity, seedEntry, setValue, submit } from '../helpers.js';

describe('integración: edición y eliminación', () => {
  it('edita una entidad desde la pantalla de gestión sin mostrar la lista', async () => {
    const entity = seedEntity();
    const app = mountApp();
    await go(app, 'manage', 'entities');

    expect(document.querySelector('[data-testid="entity-table"]')).toBeNull();

    const selector = document.querySelector('[data-testid="entity-selector"]');
    setValue(selector, entity.entity_id);

    const form = document.querySelector('[data-testid="entity-form"]');
    expect(form.querySelector('[name="name"]').value).toBe(entity.name);
    setValue(form.querySelector('[name="name"]'), 'Tornillos actualizados');
    submit(form);

    expect(loadEntities()[0].name).toBe('Tornillos actualizados');
  });

  it('elimina una entidad y sus documentos en cascada', async () => {
    const entity = seedEntity();
    seedEntry(entity.entity_id);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const app = mountApp();
    await go(app, 'manage', 'entities');
    setValue(document.querySelector('[data-testid="entity-selector"]'), entity.entity_id);
    document.querySelector('[data-testid="entity-delete"]').click();

    expect(confirm).toHaveBeenCalled();
    expect(loadEntities()).toHaveLength(0);
    expect(loadDocuments()).toHaveLength(0);
  });

  it('informa con claridad cuando la entidad ya no existe', async () => {
    const entity = seedEntity();
    const app = mountApp();
    await go(app, 'manage', 'entities');
    setValue(document.querySelector('[data-testid="entity-selector"]'), entity.entity_id);

    deleteEntity(entity.entity_id);
    submit(document.querySelector('[data-testid="entity-form"]'));

    expect(document.body.textContent).toContain('ya no existe');
  });

  it('edita y elimina un documento desde la pantalla de gestión', async () => {
    const entity = seedEntity();
    const entry = seedEntry(entity.entity_id, { quantity: 100 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const app = mountApp();
    await go(app, 'manage', 'documents');

    setValue(document.querySelector('[data-testid="document-selector"]'), entry.document_id);
    const form = document.querySelector('[data-testid="document-form"]');
    expect(form.querySelector('[data-testid="document-quantity"]').value).toBe('100');
    setValue(form.querySelector('[data-testid="document-quantity"]'), '120');
    submit(form);

    expect(getEntity(entity.entity_id).stockBalance).toBe(120);
    expect(loadDocuments()[0].quantity).toBe(120);

    setValue(document.querySelector('[data-testid="document-selector"]'), entry.document_id);
    document.querySelector('[data-testid="document-delete"]').click();

    expect(loadDocuments()).toHaveLength(0);
    expect(getEntity(entity.entity_id).stockBalance).toBe(0);
  });
});
