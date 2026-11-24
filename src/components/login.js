import { h } from './dom.js';
import { hasUsers } from '../auth.js';
import { ROLES } from '../roles.js';

export function renderLogin(container, { config, onSubmit }) {
  let mode = hasUsers() ? 'login' : 'register';
  let requireRole = false;

  function render(error = '', { forceRole = false } = {}) {
    if (forceRole) requireRole = true;
    container.replaceChildren();

    const usernameInput = h('input', {
      id: 'auth-username',
      name: 'username',
      autocomplete: 'username',
      required: true,
      'data-testid': 'auth-username'
    });
    const passwordInput = h('input', {
      id: 'auth-password',
      name: 'password',
      type: 'password',
      autocomplete: mode === 'login' ? 'current-password' : 'new-password',
      required: true,
      'data-testid': 'auth-password'
    });
    const confirmInput =
      mode === 'register'
        ? h('input', {
            id: 'auth-password-confirm',
            name: 'confirm',
            type: 'password',
            autocomplete: 'new-password',
            required: true,
            'data-testid': 'auth-password-confirm'
          })
        : null;

    const showRole = mode === 'register' || requireRole;
    const roleSelect = showRole
      ? h(
          'select',
          {
            id: 'auth-role',
            name: 'role',
            required: true,
            'data-testid': 'auth-role'
          },
          h('option', { value: '' }, 'Seleccione un cargo/rol'),
          ...Object.values(ROLES).map((role) => h('option', { value: role.code }, role.label))
        )
      : null;

    const errorNode = h('p', {
      class: 'auth-error',
      'data-testid': 'auth-error',
      role: 'alert'
    });
    errorNode.textContent = error;

    const form = h(
      'form',
      { class: 'auth-form', 'data-testid': 'auth-form', novalidate: true },
      h('div', { class: 'field' }, h('label', { for: 'auth-username' }, 'Usuario'), usernameInput),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'auth-password' }, 'Contraseña'),
        passwordInput
      ),
      roleSelect
        ? h('div', { class: 'field' }, h('label', { for: 'auth-role' }, 'Cargo/Rol'), roleSelect)
        : null,
      confirmInput
        ? h(
            'div',
            { class: 'field' },
            h('label', { for: 'auth-password-confirm' }, 'Confirmar contraseña'),
            confirmInput
          )
        : null,
      errorNode,
      h(
        'div',
        { class: 'auth-actions' },
        h(
          'button',
          { type: 'submit', class: 'button button-primary', 'data-testid': 'auth-submit' },
          mode === 'login' ? 'Ingresar' : 'Crear perfil'
        ),
        hasUsers()
          ? h(
              'button',
              {
                type: 'button',
                class: 'button button-ghost',
                'data-testid': 'auth-toggle',
                onclick: () => {
                  mode = mode === 'login' ? 'register' : 'login';
                  render();
                }
              },
              mode === 'login' ? 'Crear un perfil' : 'Volver a ingresar'
            )
          : null
      )
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorNode.textContent = '';
      try {
        await onSubmit({
          mode,
          username: usernameInput.value,
          password: passwordInput.value,
          confirm: confirmInput?.value ?? passwordInput.value,
          role: roleSelect?.value ?? ''
        });
      } catch (submittedError) {
        if (submittedError?.code === 'ROLE_REQUIRED') {
          render(submittedError.message, { forceRole: true });
          return;
        }
        errorNode.textContent = submittedError.message;
      }
    });

    const card = h(
      'section',
      { class: 'auth-card', 'data-testid': 'auth-card' },
      h('h1', {}, config.moduleName),
      h(
        'p',
        { class: 'page-subtitle' },
        mode === 'login'
          ? requireRole
            ? 'Complete su cargo/rol para continuar.'
            : 'Ingrese con su perfil local para acceder al módulo.'
          : 'Cree un perfil local con su cargo/rol para comenzar a utilizar el módulo.'
      ),
      form
    );

    container.append(card);
  }

  render();
}
