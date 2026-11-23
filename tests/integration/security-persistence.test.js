import { describe, expect, it } from 'vitest';
import { addEntity, loadEntities, searchEntities } from '../../src/storage.js';
import {
  baseConfig,
  configuredConfig,
  go,
  mountApp,
  seedEntity,
  setValue,
  submit
} from '../helpers.js';

describe('integración: seguridad, persistencia y volumen', () => {
  it('escapa los datos de usuario y no ejecuta HTML ni scripts', () => {
    seedEntity({
      name: '<img src=x onerror="window.__xss=1">',
      code: '<script>window.__xss=2</script>',
      category: 'Ferretería'
    });
    mountApp(configuredConfig);

    const row = document.querySelector('[data-testid^="entity-row-"]');
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('script')).toBeNull();
    expect(window.__xss).toBeUndefined();
    expect(row.textContent).toContain('<img src=x');
  });

  it('persiste los datos al recargar la aplicación', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');
    const form = document.querySelector('[data-testid="entity-form"]');
    setValue(form.querySelector('[data-testid="entity-name"]'), 'Producto persistente');
    setValue(form.querySelector('[data-testid="entity-code"]'), 'PER-01');
    setValue(form.querySelector('[data-testid="entity-category"]'), 'Ferretería');
    setValue(form.querySelector('[data-testid="custom-sku"]'), 'PER-01');
    setValue(form.querySelector('[data-testid="custom-punto_reorden"]'), '5');
    submit(form);

    expect(loadEntities()).toHaveLength(1);

    window.__erpApp.destroy();
    document.body.innerHTML = '';
    window.location.hash = '';
    mountApp(configuredConfig);

    expect(document.querySelector('[data-testid^="entity-row-"]').textContent).toContain(
      'Producto persistente'
    );
  });

  it('mantiene el listado y la búsqueda usables con 500 entidades', () => {
    for (let index = 0; index < 500; index += 1) {
      addEntity(
        {
          name: `Producto ${index}`,
          code: `P-${index}`,
          category: index % 2 === 0 ? 'Ferretería' : 'Oficina'
        },
        baseConfig
      );
    }

    mountApp(configuredConfig);

    expect(document.querySelectorAll('[data-testid^="entity-row-"]')).toHaveLength(500);
    expect(searchEntities('Producto 499')).toHaveLength(1);
    expect(searchEntities('', 'Oficina')).toHaveLength(250);
  });
});

describe('integración: auditoría y solicitudes de alta', () => {
  it('registra auditoría de anulación y aprobación de ajuste con valores antes/después', async () => {
    const {
      addDocument,
      approveCountAdjustment,
      closePhysicalCount,
      createPhysicalCount,
      getAuditTrail,
      recordBlindCountDetail,
      voidDocument
    } = await import('../../src/storage.js');

    const entity = seedEntity();
    const entry = addDocument(
      {
        entity_id: entity.entity_id,
        type: 'ENTRADA',
        quantity: 20,
        doc_respaldo: 'Guíaa 1',
        aisle: 'A',
        shelf: '1',
        level: '1',
        state: 'confirmed'
      },
      baseConfig
    );
    voidDocument(entry.document_id, { reason: 'Error de captura', actorPerson: 'Ana' });

    const count = createPhysicalCount({ actorPerson: 'Operador' });
    recordBlindCountDetail(count.count_id, {
      entity_id: entity.entity_id,
      countedQuantity: 18
    });
    closePhysicalCount(count.count_id);
    approveCountAdjustment(count.count_id, {
      approvedByPerson: 'Supervisor',
      reason: 'Daño por humedad'
    });

    const trail = getAuditTrail({ entityId: entity.entity_id });
    expect(trail.some((item) => item.action === 'create' && item.person === 'local')).toBe(true);
    const voidEntry = trail.find((item) => item.action === 'void');
    expect(voidEntry).toBeTruthy();
    expect(voidEntry.before.state).toBe('confirmed');
    expect(voidEntry.after.state).toBe('voided');
    const adjustment = trail.find((item) => item.action === 'approve-adjustment');
    expect(adjustment).toBeTruthy();
    expect(adjustment.before.stockBalance).toBe(0);
    expect(adjustment.after.stockBalance).toBe(18);
  });

  it('envía una solicitud de alta sin crear el producto', async () => {
    const { loadEntities, loadProductRequests } = await import('../../src/storage.js');
    const app = mountApp();
    await go(app, 'manage', 'documents');

    setValue(
      document.querySelector('[data-testid="product-request-name"]'),
      'Producto inexistente'
    );
    setValue(document.querySelector('[data-testid="product-request-code"]'), 'NEW-1');
    document.querySelector('[data-testid="product-request-submit"]').click();

    expect(loadProductRequests()).toHaveLength(1);
    expect(loadEntities()).toHaveLength(0);
    expect(document.querySelector('[data-testid="product-request-notice"]').textContent).toContain(
      'Solicitud enviada'
    );
  });
});
