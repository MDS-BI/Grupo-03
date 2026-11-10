import { h, mount } from './dom.js';

const ICONS = {
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  entities:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z"/><path d="M3 8.5V16l9 5 9-5V8.5"/><path d="M12 14v7"/></svg>',
  documents:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
};

export function icon(name) {
  return h('span', { class: 'nav-icon', html: ICONS[name] ?? ICONS.dashboard });
}

export function getInitials(moduleName) {
  const words = String(moduleName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'ERP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function monogram(moduleName) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'brand-logo');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Logotipo de ${moduleName}`);

  const rect = document.createElementNS(namespace, 'rect');
  rect.setAttribute('width', '40');
  rect.setAttribute('height', '40');
  rect.setAttribute('rx', '10');
  rect.setAttribute('fill', 'var(--accent)');
  svg.append(rect);

  const text = document.createElementNS(namespace, 'text');
  text.setAttribute('x', '20');
  text.setAttribute('y', '21');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('fill', '#ffffff');
  text.setAttribute('font-size', '15');
  text.setAttribute('font-weight', '700');
  text.setAttribute('font-family', 'system-ui, sans-serif');
  text.textContent = getInitials(moduleName);
  svg.append(text);

  return svg;
}

export function applyAccent(root, config) {
  const accent = config?.theme?.accentColor;
  if (accent) {
    root.style.setProperty('--accent', accent);
  } else {
    root.style.removeProperty('--accent');
  }
}

function warningContent(errors) {
  return [
    h('strong', {}, 'Configuración del módulo con advertencias'),
    h(
      'ul',
      {},
      errors.map((error) => h('li', {}, error))
    )
  ];
}

export function mountShell(root, { config, errors = [], onNavigate = () => {} }) {
  const logo = monogram(config.moduleName);
  const brandName = h(
    'h1',
    { class: 'brand-name', 'data-testid': 'module-name' },
    config.moduleName
  );

  const topbar = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'brand' }, logo, brandName),
    h('div', { class: 'topbar-spacer' })
  );

  const navDefinitions = [
    { id: 'dashboard', label: config.labels.dashboard, iconName: 'dashboard' },
    { id: 'entities', label: config.labels.entity.plural, iconName: 'entities' },
    { id: 'documents', label: config.labels.document.plural, iconName: 'documents' },
    { id: 'search', label: config.labels.search, iconName: 'search' }
  ];

  const navButtons = new Map();
  const navList = h('ul', { class: 'nav-list' });
  navDefinitions.forEach((definition) => {
    const button = h(
      'button',
      {
        type: 'button',
        class: 'nav-button',
        'data-nav': definition.id,
        'data-testid': `nav-${definition.id}`,
        'aria-label': definition.label,
        title: definition.label,
        onclick: () => onNavigate(definition.id)
      },
      icon(definition.iconName),
      h('span', { class: 'nav-label' }, definition.label)
    );
    navButtons.set(definition.id, button);
    navList.append(h('li', {}, button));
  });

  const sidebar = h('nav', { class: 'sidebar', 'aria-label': 'Navegación principal' }, navList);

  const warning = h('div', {
    class: 'config-warning',
    'data-testid': 'config-warning',
    role: 'status',
    hidden: errors.length === 0
  });
  if (errors.length > 0) warning.append(...warningContent(errors));

  const view = h('div', { class: 'view', id: 'view' });
  const main = h(
    'main',
    { class: 'main-region', id: 'main-content', tabindex: '-1' },
    warning,
    view
  );
  const shell = h('div', { class: 'app-shell' }, topbar, sidebar, main);

  mount(root, shell);
  applyAccent(root, config);
  document.title = `${config.moduleName} · ERP`;

  function setActive(viewId, section = 'entities') {
    let activeId = viewId;
    if (viewId === 'manage') activeId = section === 'documents' ? 'documents' : 'entities';
    navButtons.forEach((button, id) => {
      if (id === activeId) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function setWarnings(nextErrors = []) {
    warning.replaceChildren();
    if (nextErrors.length > 0) {
      warning.append(...warningContent(nextErrors));
      warning.hidden = false;
    } else {
      warning.hidden = true;
    }
  }

  return { view, main, setActive, setWarnings, navButtons };
}
