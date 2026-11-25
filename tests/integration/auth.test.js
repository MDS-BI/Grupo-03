import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_KEY,
  getCurrentRole,
  getCurrentSession,
  getCurrentUser,
  hasUsers,
  registerUser
} from '../../src/auth.js';
import { getPersons, savePersons } from '../../src/storage.js';
import { configuredConfig, mountApp, setValue, submit } from '../helpers.js';

const isLocked = () => {
  const roots = document.querySelectorAll('#app');
  return roots[roots.length - 1].classList.contains('is-locked');
};

async function registerFirstProfile(role = 'admin') {
  const form = document.querySelector('[data-testid="auth-form"]');
  setValue(form.querySelector('[data-testid="auth-username"]'), 'Ana');
  setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
  setValue(form.querySelector('[data-testid="auth-password-confirm"]'), 'clave123');
  const roleSelect = form.querySelector('[data-testid="auth-role"]');
  if (roleSelect) setValue(roleSelect, role);
  submit(form);
  await vi.waitFor(() => expect(getCurrentUser()).toBe('Ana'));
}

describe('integración: acceso local por perfil', () => {
  it('crea el primer perfil y entra al módulo', async () => {
    mountApp(configuredConfig, { authenticated: false });

    expect(hasUsers()).toBe(false);
    expect(isLocked()).toBe(true);
    expect(document.querySelector('[data-testid="auth-form"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="auth-submit"]').textContent).toBe('Crear perfil');

    await registerFirstProfile();

    expect(hasUsers()).toBe(true);
    expect(isLocked()).toBe(false);
    expect(document.querySelector('[data-testid="auth-form"]')).toBeNull();
    expect(document.querySelector('[data-testid="kpi-entities"]')).toBeTruthy();
  });

  it('registra al usuario como persona local sin nombres de demostración', async () => {
    mountApp(configuredConfig, { authenticated: false });
    const form = document.querySelector('[data-testid="auth-form"]');
    setValue(form.querySelector('[data-testid="auth-username"]'), 'Pedro');
    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
    setValue(form.querySelector('[data-testid="auth-password-confirm"]'), 'clave123');
    setValue(form.querySelector('[data-testid="auth-role"]'), 'recepcion');
    submit(form);

    await vi.waitFor(() => expect(getCurrentUser()).toBe('Pedro'));

    expect(getPersons()).toEqual(['Pedro']);
    expect(document.querySelector('[data-testid="person-selector"]').value).toBe('Pedro');
  });

  it('reemplaza la lista heredada de nombres demo al crear el primer perfil', async () => {
    savePersons(['Ana', 'Bruno', 'Carlos', 'Diana']);
    mountApp(configuredConfig, { authenticated: false });
    const form = document.querySelector('[data-testid="auth-form"]');
    setValue(form.querySelector('[data-testid="auth-username"]'), 'Sebastián');
    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
    setValue(form.querySelector('[data-testid="auth-password-confirm"]'), 'clave123');
    setValue(form.querySelector('[data-testid="auth-role"]'), 'despacho');
    submit(form);

    await vi.waitFor(() => expect(getCurrentUser()).toBe('Sebastián'));

    expect(getPersons()).toEqual(['Sebastián']);
    expect(document.querySelector('[data-testid="person-selector"]').value).toBe('Sebastián');
    expect(document.querySelector('[data-testid="person-selector"]').disabled).toBe(true);
  });

  it('rechaza credenciales incorrectas y permite ingresar después', async () => {
    mountApp(configuredConfig, { authenticated: false });
    await registerFirstProfile();

    document.querySelector('[data-testid="sign-out"]').click();

    expect(isLocked()).toBe(true);
    expect(document.querySelector('[data-testid="auth-form"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="auth-submit"]').textContent).toBe('Ingresar');
    expect(getCurrentUser()).toBe('');

    const form = document.querySelector('[data-testid="auth-form"]');
    setValue(form.querySelector('[data-testid="auth-username"]'), 'Ana');
    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave incorrecta');
    submit(form);

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-error"]').textContent).toContain(
        'incorrectos'
      )
    );
    expect(isLocked()).toBe(true);

    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
    submit(form);

    await vi.waitFor(() => expect(isLocked()).toBe(false));
    expect(document.querySelector('[data-testid="auth-form"]')).toBeNull();
    expect(document.querySelector('[data-testid="kpi-entities"]')).toBeTruthy();
  });

  it('mantiene la sesión al remontar y la limpia al cerrar sesión', async () => {
    mountApp(configuredConfig, { authenticated: false });
    await registerFirstProfile();

    window.__erpApp.destroy();
    mountApp(configuredConfig, { authenticated: false });

    expect(isLocked()).toBe(false);
    expect(document.querySelector('[data-testid="auth-form"]')).toBeNull();

    document.querySelector('[data-testid="sign-out"]').click();

    expect(window.sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(isLocked()).toBe(true);
    expect(document.querySelector('[data-testid="auth-form"]')).toBeTruthy();
  });

  it('exige un cargo/rol válido al crear el primer perfil', async () => {
    mountApp(configuredConfig, { authenticated: false });
    const form = document.querySelector('[data-testid="auth-form"]');

    expect(form.querySelector('[data-testid="auth-role"]')).toBeTruthy();
    setValue(form.querySelector('[data-testid="auth-username"]'), 'Ana');
    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
    setValue(form.querySelector('[data-testid="auth-password-confirm"]'), 'clave123');
    submit(form);

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-error"]').textContent).toContain(
        'Seleccione un cargo/rol'
      )
    );
    expect(hasUsers()).toBe(false);
    expect(isLocked()).toBe(true);

    setValue(form.querySelector('[data-testid="auth-role"]'), 'analista');
    submit(form);
    await vi.waitFor(() => expect(getCurrentUser()).toBe('Ana'));
    expect(hasUsers()).toBe(true);
  });

  it('guarda el cargo en el perfil y en la sesión y lo muestra en el marco', async () => {
    mountApp(configuredConfig, { authenticated: false });
    await registerFirstProfile('bodega');

    expect(getCurrentRole()).toBe('bodega');
    expect(getCurrentSession()).toEqual({ username: 'Ana', role: 'bodega' });
    expect(JSON.parse(window.localStorage.getItem('erp.auth.users'))[0].role).toBe('bodega');
    expect(document.querySelector('[data-testid="cargo-badge"]').textContent).toBe(
      'Jefe de Bodega'
    );
  });

  it('rechaza roles desconocidos en la capa de acceso', async () => {
    await expect(
      registerUser({ username: 'Invalido', password: 'clave123', role: 'invitado' })
    ).rejects.toThrow('no es válido');
    expect(hasUsers()).toBe(false);
  });

  it('pide completar el cargo una sola vez a perfiles heredados', async () => {
    mountApp(configuredConfig, { authenticated: false });
    await registerFirstProfile();
    const users = JSON.parse(window.localStorage.getItem('erp.auth.users'));
    delete users[0].role;
    window.localStorage.setItem('erp.auth.users', JSON.stringify(users));
    document.querySelector('[data-testid="sign-out"]').click();

    const form = document.querySelector('[data-testid="auth-form"]');
    setValue(form.querySelector('[data-testid="auth-username"]'), 'Ana');
    setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
    submit(form);

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-role"]')).toBeTruthy()
    );
    expect(document.querySelector('[data-testid="auth-error"]').textContent).toContain(
      'no tiene cargo/rol'
    );
    expect(isLocked()).toBe(true);

    const roleSelect = document.querySelector('[data-testid="auth-role"]');
    setValue(roleSelect, 'recepcion');
    submit(document.querySelector('[data-testid="auth-form"]'));

    await vi.waitFor(() => expect(isLocked()).toBe(false));
    expect(getCurrentRole()).toBe('recepcion');
    expect(JSON.parse(window.localStorage.getItem('erp.auth.users'))[0].role).toBe('recepcion');

    document.querySelector('[data-testid="sign-out"]').click();
    const loginForm = document.querySelector('[data-testid="auth-form"]');
    expect(loginForm.querySelector('[data-testid="auth-role"]')).toBeNull();
  });
});
