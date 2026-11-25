export const ROLES = {
  admin: { code: 'admin', label: 'Administrador del módulo' },
  recepcion: { code: 'recepcion', label: 'Operador de Recepción' },
  despacho: { code: 'despacho', label: 'Operador de Despacho' },
  bodega: { code: 'bodega', label: 'Jefe de Bodega' },
  analista: { code: 'analista', label: 'Analista de Inventario' }
};

export const ALL_PERMISSIONS = [
  'dashboard.read',
  'search.read',
  'catalog.read',
  'catalog.write',
  'kardex.read',
  'audit.read',
  'movement.entry',
  'movement.exit',
  'movement.transfer',
  'movement.adjust',
  'movement.void',
  'count.manage',
  'count.approve',
  'product.request',
  'config.write'
];

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  recepcion: [
    'dashboard.read',
    'search.read',
    'catalog.read',
    'kardex.read',
    'movement.entry',
    'movement.transfer',
    'product.request'
  ],
  despacho: [
    'dashboard.read',
    'search.read',
    'catalog.read',
    'kardex.read',
    'movement.exit',
    'movement.transfer'
  ],
  bodega: [
    'dashboard.read',
    'search.read',
    'catalog.read',
    'kardex.read',
    'audit.read',
    'movement.entry',
    'movement.exit',
    'movement.transfer',
    'movement.adjust',
    'movement.void',
    'count.manage',
    'count.approve'
  ],
  analista: ['dashboard.read', 'search.read', 'catalog.read', 'kardex.read']
};

export const MOVEMENT_TYPE_PERMISSIONS = {
  ENTRADA: 'movement.entry',
  SALIDA: 'movement.exit',
  TRANSFERENCIA: 'movement.transfer',
  AJUSTE: 'movement.adjust'
};

export const MOVEMENT_PERMISSIONS = [
  'movement.entry',
  'movement.exit',
  'movement.transfer',
  'movement.adjust',
  'movement.void',
  'count.manage'
];

export const ROUTE_PERMISSIONS = {
  dashboard: ['dashboard.read'],
  search: ['search.read'],
  audit: ['audit.read'],
  'manage:entities': ['catalog.write'],
  'manage:documents': MOVEMENT_PERMISSIONS
};

export const NAV_PERMISSIONS = {
  dashboard: ['dashboard.read'],
  entities: ['catalog.write'],
  documents: MOVEMENT_PERMISSIONS,
  search: ['search.read'],
  audit: ['audit.read']
};

export function isRole(role) {
  return typeof role === 'string' && Object.hasOwn(ROLES, role);
}

export function getRoleLabel(role) {
  return isRole(role) ? ROLES[role].label : '';
}

export function hasPermission(role, permission) {
  if (!isRole(role) || !permission) return false;
  const granted = ROLE_PERMISSIONS[role] ?? [];
  if (granted.includes('*')) return true;
  return granted.includes(permission);
}

export function hasAnyPermission(role, permissions = []) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function canAccessRoute(role, view, section = 'entities') {
  if (!isRole(role)) return false;
  if (view === 'manage') {
    const key = section === 'documents' ? 'manage:documents' : 'manage:entities';
    return hasAnyPermission(role, ROUTE_PERMISSIONS[key]);
  }
  const requirements = ROUTE_PERMISSIONS[view];
  if (!requirements) return view === 'dashboard';
  return hasAnyPermission(role, requirements);
}

export function firstAllowedRoute(role) {
  if (canAccessRoute(role, 'dashboard')) return { view: 'dashboard', section: 'entities' };
  if (canAccessRoute(role, 'search')) return { view: 'search', section: 'entities' };
  if (canAccessRoute(role, 'manage', 'entities')) return { view: 'manage', section: 'entities' };
  if (canAccessRoute(role, 'manage', 'documents')) return { view: 'manage', section: 'documents' };
  if (canAccessRoute(role, 'audit')) return { view: 'audit', section: 'audit' };
  return null;
}
