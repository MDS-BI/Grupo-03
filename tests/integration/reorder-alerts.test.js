import { describe, expect, it } from 'vitest';
import { addDocument } from '../../src/storage.js';
import { mountApp, seedEntity, seedEntry, setValue } from '../helpers.js';

function alertCodes() {
  return Array.from(document.querySelectorAll('[data-testid="reorder-alerts-table"] tbody tr td:first-child')).map(
    (cell) => cell.textContent.trim()
  );
}

describe('integración: alertas de reposición (HU1)', () => {
  it('lista solo productos bajo el punto de reorden con faltante y orden por urgencia', () => {
    const a = seedEntity({ name: 'Leche', code: 'L-1', category: 'Lácteos', reorderPoint: 10 });
    seedEntry(a.entity_id, { quantity: 3 });
    const b = seedEntity({ name: 'Arroz', code: 'A-1', category: 'Abarrotes', reorderPoint: 5 });
    seedEntry(b.entity_id, { quantity: 5 }); // igual al punto: no alerta
    const c = seedEntity({ name: 'Azúcar', code: 'Z-1', category: 'Abarrotes', reorderPoint: 8 });
    seedEntry(c.entity_id, { quantity: 1 }); // faltante 7
    const d = seedEntity({ name: 'Pan', code: 'P-1', category: 'Panadería', reorderPoint: 10 });
    seedEntry(d.entity_id, { quantity: 3 }); // faltante 7, empate con Leche? Leche faltante 7 también -> nombre

    mountApp();

    expect(document.querySelector('[data-testid="reorder-alerts-empty"]')).toBeNull();
    const rows = Array.from(document.querySelectorAll('[data-testid^="alert-row-"]'));
    expect(rows).toHaveLength(3);
    expect(rows.some((r) => r.textContent.includes('Arroz'))).toBe(false);

    // faltantes: Azúcar 7, Leche 7, Pan 7 -> mismo faltante, orden por nombre asc (es)
    expect(alertCodes()).toEqual(['Z-1', 'L-1', 'P-1']);
    const azucarRow = rows.find((r) => r.textContent.includes('Azúcar'));
    expect(azucarRow.textContent).toContain('1');
    expect(azucarRow.textContent).toContain('8');
    expect(azucarRow.textContent).toContain('7');
  });

  it('excluye productos sin punto de reorden y muestra estado vacío cuando no hay alertas', () => {
    const sinPunto = seedEntity({ name: 'Sin punto', code: 'SP', category: 'X' });
    seedEntry(sinPunto.entity_id, { quantity: 1 });
    const ok = seedEntity({ name: 'Suficiente', code: 'OK', category: 'X', reorderPoint: 5 });
    seedEntry(ok.entity_id, { quantity: 5 });

    mountApp();

    expect(document.querySelector('[data-testid="reorder-alerts-table"]')).toBeNull();
    expect(document.querySelector('[data-testid="reorder-alerts-empty"]').textContent).toContain(
      'No hay alertas'
    );
  });

  it('desaparece de alertas tras una entrada que repone sobre el punto de reorden', async () => {
    const prod = seedEntity({ name: 'Tornillo', code: 'T-1', category: 'F', reorderPoint: 10 });
    seedEntry(prod.entity_id, { quantity: 3 });
    const app = mountApp();

    expect(document.querySelectorAll('[data-testid^="alert-row-"]')).toHaveLength(1);

    addDocument(
      { entity_id: prod.entity_id, type: 'ENTRADA', quantity: 7, aisle: 'A', shelf: '1', level: '1' },
      app.config
    );
    app.render();
    await new Promise((r) => setTimeout(r, 0));

    expect(document.querySelector('[data-testid="reorder-alerts-table"]')).toBeNull();
    expect(document.querySelector('[data-testid="reorder-alerts-empty"]')).toBeTruthy();
  });

  it('respeta el filtro de categoría del dashboard', () => {
    const a = seedEntity({ name: 'Leche', code: 'L-1', category: 'Lácteos', reorderPoint: 10 });
    seedEntry(a.entity_id, { quantity: 1 });
    const b = seedEntity({ name: 'Arroz', code: 'A-1', category: 'Abarrotes', reorderPoint: 10 });
    seedEntry(b.entity_id, { quantity: 1 });

    mountApp();
    expect(document.querySelectorAll('[data-testid^="alert-row-"]')).toHaveLength(2);

    setValue(document.querySelector('[data-testid="dashboard-category"]'), 'Lácteos');
    const rows = Array.from(document.querySelectorAll('[data-testid^="alert-row-"]'));
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Leche');
  });
});
