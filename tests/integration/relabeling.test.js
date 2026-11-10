import { describe, expect, it } from 'vitest';
import { loadDocuments, updateDocument, ValidationError } from '../../src/storage.js';
import { configuredConfig, go, mountApp, seedEntity, setValue, submit } from '../helpers.js';

describe('integración: etiquetas, ciclo de vida y tema', () => {
  it('usa las etiquetas genéricas por defecto sin textos de logística', async () => {
    const app = mountApp({});
    expect(document.querySelector('[data-testid="module-name"]').textContent).toBe('ERP');
    expect(document.querySelector('[data-testid="nav-entities"]').textContent).toContain(
      'Entidades'
    );
    expect(document.querySelector('[data-testid="nav-documents"]').textContent).toContain(
      'Documentos'
    );

    await go(app, 'manage', 'entities');
    expect(document.querySelector('[data-testid="entity-save"]').textContent).toBe('Crear Entidad');
    expect(document.body.textContent).not.toContain('Producto');
    expect(document.body.textContent).not.toContain('Movimiento de Inventario');
  });

  it('refleja las etiquetas del módulo en navegación, formularios y acciones', async () => {
    const app = mountApp(configuredConfig);
    expect(document.querySelector('[data-testid="module-name"]').textContent).toBe(
      'Logística e Inventario'
    );
    expect(document.querySelector('[data-testid="nav-entities"]').textContent).toContain(
      'Productos'
    );
    expect(document.querySelector('[data-testid="nav-documents"]').textContent).toContain(
      'Movimientos'
    );

    await go(app, 'manage', 'entities');
    expect(document.querySelector('[data-testid="entity-save"]').textContent).toBe(
      'Crear Producto'
    );
    expect(document.querySelector('[data-testid="document-save"]').textContent).toBe(
      'Crear Movimiento de Inventario'
    );
    expect(document.querySelector('[data-testid="document-form"]').textContent).toContain(
      'Producto'
    );
  });

  it('aplica el color de acento configurado y advierte si es inválido', () => {
    mountApp(configuredConfig);
    expect(document.getElementById('app').style.getPropertyValue('--accent')).toBe('#1f6feb');
    expect(document.querySelector('[data-testid="config-warning"]').hidden).toBe(true);

    document.getElementById('app').remove();
    mountApp({ ...configuredConfig, theme: { accentColor: 'azul-invalido' } });
    const warning = document.querySelector('[data-testid="config-warning"]');
    expect(warning.hidden).toBe(false);
    expect(warning.textContent).toContain('color de acento');
    expect(document.getElementById('app').style.getPropertyValue('--accent')).toBe('');
  });

  it('ofrece estados del ciclo de vida y bloquea transiciones no permitidas', async () => {
    const entity = seedEntity();
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'documents');

    let form = document.querySelector('[data-testid="document-form"]');
    setValue(form.querySelector('[data-testid="document-entity"]'), entity.entity_id);
    setValue(form.querySelector('[data-testid="document-quantity"]'), '10');
    setValue(form.querySelector('[data-testid="document-aisle"]'), 'A');
    setValue(form.querySelector('[data-testid="document-shelf"]'), '1');
    setValue(form.querySelector('[data-testid="document-level"]'), '1');
    submit(form);

    let documentRecord = loadDocuments()[0];
    expect(documentRecord.status).toBe('Borrador');

    setValue(
      document.querySelector('[data-testid="document-selector"]'),
      documentRecord.document_id
    );
    form = document.querySelector('[data-testid="document-form"]');
    let status = form.querySelector('[data-testid="document-status"]');
    expect(status.tagName).toBe('SELECT');
    expect(Array.from(status.options).map((item) => item.value)).toEqual([
      'Borrador',
      'Pendiente',
      'Cancelado'
    ]);

    setValue(status, 'Pendiente');
    submit(form);
    expect(loadDocuments()[0].status).toBe('Pendiente');

    setValue(
      document.querySelector('[data-testid="document-selector"]'),
      documentRecord.document_id
    );
    form = document.querySelector('[data-testid="document-form"]');
    status = form.querySelector('[data-testid="document-status"]');
    expect(Array.from(status.options).map((item) => item.value)).toEqual([
      'Pendiente',
      'Completado',
      'Cancelado'
    ]);

    setValue(status, 'Completado');
    submit(form);
    documentRecord = loadDocuments()[0];
    expect(documentRecord.status).toBe('Completado');

    expect(() =>
      updateDocument(documentRecord.document_id, { status: 'Borrador' }, configuredConfig)
    ).toThrow(ValidationError);
  });
});
