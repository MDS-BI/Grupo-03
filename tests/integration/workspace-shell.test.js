import { describe, expect, it, vi } from 'vitest';
import { loadEntities } from '../../src/storage.js';
import { configuredConfig, go, mountApp, seedEntity, setValue, tick } from '../helpers.js';

function navCurrent(testId) {
  return document.querySelector(`[data-testid="${testId}"]`).getAttribute('aria-current');
}

describe('integración: shell, navegación y búsqueda', () => {
  it('marca la sección activa en la navegación principal', async () => {
    const app = mountApp(configuredConfig);
    expect(navCurrent('nav-dashboard')).toBe('page');

    await go(app, 'manage', 'entities');
    expect(navCurrent('nav-entities')).toBe('page');

    await go(app, 'manage', 'documents');
    expect(navCurrent('nav-documents')).toBe('page');

    await go(app, 'search');
    expect(navCurrent('nav-search')).toBe('page');
  });

  it('navega mediante los botones del menú lateral', async () => {
    mountApp(configuredConfig);

    document.querySelector('[data-testid="nav-entities"]').click();
    await tick();
    expect(window.location.hash).toBe('#/entities');
    expect(document.querySelector('[data-testid="entities-panel"]')).toBeTruthy();

    document.querySelector('[data-testid="nav-documents"]').click();
    await tick();
    expect(window.location.hash).toBe('#/documents');
    expect(document.querySelector('[data-testid="documents-panel"]')).toBeTruthy();

    document.querySelector('[data-testid="nav-dashboard"]').click();
    await tick();
    expect(window.location.hash).toBe('#/dashboard');
    expect(document.querySelector('[data-testid="kpi-entities"]')).toBeTruthy();
  });

  it('enfoca el formulario correspondiente desde las acciones rápidas', async () => {
    const app = mountApp(configuredConfig);

    document.querySelector('[data-testid="quick-new-entity"]').click();
    await tick();
    expect(window.location.hash).toBe('#/entities');
    expect(document.activeElement).toBe(document.querySelector('[data-testid="entity-name"]'));

    await go(app, 'dashboard');
    document.querySelector('[data-testid="quick-new-document"]').click();
    await tick();
    expect(window.location.hash).toBe('#/documents');
    expect(document.activeElement).toBe(document.querySelector('[data-testid="document-entity"]'));

    await go(app, 'dashboard');
    document.querySelector('[data-testid="quick-search"]').click();
    await tick();
    expect(window.location.hash).toBe('#/search');
    expect(document.activeElement).toBe(document.querySelector('[data-testid="search-input"]'));
  });

  it('busca con debounce y combina término, categoría y fecha objetivo', async () => {
    seedEntity({ name: 'Tornillos', code: 'TOR-005', category: 'Ferretería' });
    seedEntity({
      name: 'Resma de papel',
      code: 'PAP-01',
      category: 'Oficina',
      targetDate: '2026-12-31'
    });

    const app = mountApp(configuredConfig);
    await go(app, 'search');
    expect(document.querySelectorAll('[data-testid^="search-result-"]')).toHaveLength(2);

    const input = document.querySelector('[data-testid="search-input"]');
    setValue(input, 'tornillos');
    await tick(200);
    let results = document.querySelectorAll('[data-testid^="search-result-"]');
    expect(results).toHaveLength(1);
    expect(results[0].textContent).toContain('Tornillos');

    setValue(input, '');
    await tick(200);
    setValue(document.querySelector('[data-testid="search-category"]'), 'Oficina');
    results = document.querySelectorAll('[data-testid^="search-result-"]');
    expect(results).toHaveLength(1);
    expect(results[0].textContent).toContain('Resma de papel');

    setValue(input, '2026-12');
    await tick(200);
    results = document.querySelectorAll('[data-testid^="search-result-"]');
    expect(results).toHaveLength(1);
    expect(results[0].textContent).toContain('2026');

    setValue(input, 'sin-coincidencias');
    await tick(200);
    expect(document.querySelector('[data-testid="search-empty"]')).toBeTruthy();
  });

  it('respeta enlaces profundos a las vistas principales', () => {
    window.location.hash = '#/documents';
    mountApp(configuredConfig);
    expect(document.querySelector('[data-testid="documents-panel"]')).toBeTruthy();

    window.__erpApp.destroy();
    window.location.hash = '#/search';
    mountApp(configuredConfig);
    expect(document.querySelector('[data-testid="search-input"]')).toBeTruthy();

    window.__erpApp.destroy();
    window.location.hash = '#/entities';
    mountApp(configuredConfig);
    expect(document.querySelector('[data-testid="entities-panel"]')).toBeTruthy();
  });

  it('reacciona a cambios de hash equivalentes al botón atrás', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');
    expect(document.querySelector('[data-testid="entities-panel"]')).toBeTruthy();

    window.location.hash = '#/dashboard';
    await tick();
    expect(document.querySelector('[data-testid="kpi-entities"]')).toBeTruthy();
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('pide confirmación antes de abandonar un formulario con cambios', async () => {
    const app = mountApp(configuredConfig);
    await go(app, 'manage', 'entities');
    setValue(document.querySelector('[data-testid="entity-name"]'), 'Borrador sin guardar');

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    document.querySelector('[data-testid="nav-dashboard"]').click();
    await tick();
    expect(confirm).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/entities');

    confirm.mockReturnValue(true);
    document.querySelector('[data-testid="nav-dashboard"]').click();
    await tick();
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('abre la edición desde el panel y elimina con confirmación', async () => {
    const entity = seedEntity();
    const app = mountApp(configuredConfig);
    await go(app, 'dashboard');

    document.querySelector(`[data-testid="entity-edit-${entity.entity_id}"]`).click();
    await tick();
    expect(window.location.hash).toBe('#/entities');
    expect(document.querySelector('[data-testid="entity-selector"]').value).toBe(entity.entity_id);
    expect(document.querySelector('[data-testid="entity-name"]').value).toBe(entity.name);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await go(app, 'dashboard');
    document.querySelector(`[data-testid="entity-delete-row-${entity.entity_id}"]`).click();
    expect(confirm).toHaveBeenCalled();
    expect(loadEntities()).toHaveLength(0);
  });
});
