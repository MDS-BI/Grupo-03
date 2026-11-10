export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

function appendChildren(element, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === undefined || child === null || child === false || child === '') return;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
}

export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attributes ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'class') {
      element.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key === 'text') {
      element.textContent = String(value);
    } else if (key === 'html') {
      element.innerHTML = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (
      ['checked', 'disabled', 'selected', 'required', 'readOnly', 'multiple'].includes(key)
    ) {
      element[key] = Boolean(value);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  });
  appendChildren(element, children);
  return element;
}

export function clear(element) {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function mount(element, ...children) {
  clear(element);
  appendChildren(element, children);
  return element;
}

export function safeIdPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function formField({ label, name, control, required = false, hint, className = '' }) {
  const id = control.id || `field-${safeIdPart(name)}`;
  const errorId = `${safeIdPart(name)}-error`;
  control.id = id;
  if (!control.name) control.name = name;
  if (required) control.required = true;
  control.setAttribute('aria-describedby', errorId);

  return h(
    'div',
    { class: ['field', className].filter(Boolean).join(' '), 'data-field': name },
    h(
      'label',
      { for: id },
      label,
      required ? h('span', { class: 'required', 'aria-hidden': 'true' }, ' *') : null
    ),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    h('p', { class: 'field-error', id: errorId, role: 'alert' })
  );
}

export function clearErrors(form) {
  if (!form) return;
  form.querySelectorAll('.field-error').forEach((node) => {
    node.textContent = '';
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((node) => {
    node.removeAttribute('aria-invalid');
  });
  const formError = form.querySelector('[data-form-error]');
  if (formError) formError.textContent = '';
}

export function applyErrors(form, errors = {}) {
  if (!form) return false;
  clearErrors(form);
  const formError = form.querySelector('[data-form-error]');
  let firstInvalid = null;

  Object.entries(errors ?? {}).forEach(([key, message]) => {
    if (!message) return;
    if (key === '_form') {
      if (formError) formError.textContent = String(message);
      return;
    }
    const wrapper = form.querySelector(`[data-field="${String(key).replace(/"/g, '\\"')}"]`);
    if (!wrapper) {
      if (formError) formError.textContent = String(message);
      return;
    }
    const errorNode = wrapper.querySelector('.field-error');
    if (errorNode) errorNode.textContent = String(message);
    const control = wrapper.querySelector('input, select, textarea');
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      if (!firstInvalid) firstInvalid = control;
    }
  });

  if (firstInvalid) firstInvalid.focus();
  return Boolean(firstInvalid) || Boolean(errors?._form);
}

export function formatCurrency(value, locale = 'es-CO', currency = 'COP') {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(safe);
  } catch {
    return String(safe);
  }
}

export function formatNumber(value, locale = 'es-CO') {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  try {
    return new Intl.NumberFormat(locale).format(safe);
  } catch {
    return String(safe);
  }
}

export function formatDate(value, locale = 'es-CO') {
  if (!value) return '—';
  const date = String(value).length === 10 ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  } catch {
    return String(value);
  }
}

export function formatDateTime(value, locale = 'es-CO') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch {
    return String(value);
  }
}

export function debounce(fn, wait = 150) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

export function option(value, label, selected = false) {
  return h('option', { value, selected }, label);
}
