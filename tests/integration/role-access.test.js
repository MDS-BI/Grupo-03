import { describe, expect, it } from 'vitest';
import { configuredConfig, go, mountApp, tick } from '../helpers.js';

function visibleNavIds() {
  return Array.from(document.querySelectorAll('[data-nav]'))
    .filter((button) => !button.hidden && !button.parentElement.hidden)
    .map((button) => button.dataset.nav);
}

function documentTypes() {
  return Array.from(document.querySelectorAll('[data-testid="document-type"] option')).map(
    (option) => option.value
  );
}

describe('integración: acceso por cargo/rol', () => {
  it('el analista solo ve navegación y acciones de lectura', async () => {
    const app = mountApp(configuredConfig, { role: 'analista' });

    expect(document.querySelector('[data-testid="cargo-badge"]').textContent).toBe(
      'Analista de Inventario'
    );
    expect(visibleNavIds()).toEqual(['dashboard', 'search']);
    expect(document.querySelector('[data-testid="quick-new-entity"]')).toBeNull();
    expect(document.querySelector('[data-testid="quick-new-document"]')).toBeNull();
    expect(document.querySelector('[data-testid="quick-manage-entities"]')).toBeNull();
    expect(document.querySelector('[data-testid="quick-search"]')).toBeTruthy();

    await go(app, 'manage', 'documents');
    expect(app.state.view).toBe('dashboard');
    expect(document.querySelector('[data-testid="documents-panel"]')).toBeNull();
  });

  it('redirige enlaces directos no permitidos con un aviso accesible', async () => {
    window.location.hash = '#/documents';
    const app = mountApp(configuredConfig, { role: 'analista' });

    expect(app.state.view).toBe('dashboard');
    expect(window.location.hash).toBe('#/dashboard');
    expect(document.querySelector('[data-testid="documents-panel"]')).toBeNull();
    expect(document.querySelector('[data-testid="access-denied"]').textContent).toContain(
      'No tiene permiso'
    );

    window.location.hash = '#/audit';
    await tick();
    expect(app.state.view).toBe('dashboard');
    expect(window.location.hash).toBe('#/dashboard');
    expect(document.querySelector('[data-testid="audit-panel"]')).toBeNull();
  });

  it('muestra solo entradas y transferencias al operador de recepción', async () => {
    const app = mountApp(configuredConfig, { role: 'recepcion' });

    expect(visibleNavIds()).toEqual(['dashboard', 'documents', 'search']);
    await go(app, 'manage', 'documents');
    expect(documentTypes()).toEqual(['ENTRADA', 'TRANSFERENCIA']);
    expect(document.querySelector('[data-testid="count-section"]')).toBeNull();
    expect(document.querySelector('[data-testid="product-request-section"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="audit-panel"]')).toBeNull();
  });

  it('muestra solo salidas y transferencias al operador de despacho', async () => {
    const app = mountApp(configuredConfig, { role: 'despacho' });

    await go(app, 'manage', 'documents');
    expect(documentTypes()).toEqual(['SALIDA', 'TRANSFERENCIA']);
    expect(document.querySelector('[data-testid="product-request-section"]')).toBeNull();
    expect(document.querySelector('[data-testid="count-section"]')).toBeNull();
  });

  it('permite conteos, ajustes y auditoría al jefe de bodega sin editar catálogo', async () => {
    const app = mountApp(configuredConfig, { role: 'bodega' });

    expect(visibleNavIds()).toEqual(['dashboard', 'documents', 'search', 'audit']);
    expect(document.querySelector('[data-testid="quick-new-entity"]')).toBeNull();
    await go(app, 'manage', 'documents');
    expect(documentTypes()).toEqual(['ENTRADA', 'SALIDA', 'TRANSFERENCIA']);
    expect(document.querySelector('[data-testid="count-section"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="count-approve-adjustment"]')).toBeTruthy();
  });

  it('da acceso total al administrador y mantiene el cargo fijo hasta salir', async () => {
    window.localStorage.setItem(
      'erp.auth.users',
      JSON.stringify([{ username: 'Ana', salt: 'demo', hash: 'demo', role: 'admin' }])
    );
    mountApp(configuredConfig);

    expect(visibleNavIds()).toEqual(['dashboard', 'entities', 'documents', 'search', 'audit']);
    expect(document.querySelector('[data-testid="quick-new-entity"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="quick-new-document"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="role-selector"]')).toBeNull();
    expect(document.querySelector('[data-testid="cargo-badge"]').textContent).toBe(
      'Administrador del módulo'
    );

    document.querySelector('[data-testid="sign-out"]').click();
    await tick();

    expect(document.querySelector('[data-testid="auth-form"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="auth-role"]')).toBeNull();
    expect(document.querySelector('[data-testid="cargo-badge"]').textContent).toBe('');
    expect(document.querySelector('[data-testid="cargo-badge"]').hidden).toBe(true);
  });

  it('bloquea rutas de escritura aunque se invoquen desde la API de la app', async () => {
    const app = mountApp(configuredConfig, { role: 'analista' });

    app.navigate('manage', { section: 'entities' });
    await tick();

    expect(app.state.view).toBe('dashboard');
    expect(document.querySelector('[data-testid="access-denied"]').textContent).toContain(
      'No tiene permiso'
    );
  });
});
