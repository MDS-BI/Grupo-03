import { describe, expect, it, vi } from 'vitest';
import { AUTH_SESSION_KEY, getCurrentUser, hasUsers } from '../../src/auth.js';
import { getPersons, savePersons } from '../../src/storage.js';
import { configuredConfig, mountApp, setValue, submit } from '../helpers.js';

const isLocked = () => {
  const roots = document.querySelectorAll('#app');
  return roots[roots.length - 1].classList.contains('is-locked');
};

async function registerFirstProfile() {
  const form = document.querySelector('[data-testid="auth-form"]');
  setValue(form.querySelector('[data-testid="auth-username"]'), 'Ana');
  setValue(form.querySelector('[data-testid="auth-password"]'), 'clave123');
  setValue(form.querySelector('[data-testid="auth-password-confirm"]'), 'clave123');
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
});
