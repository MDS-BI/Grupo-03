import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  canAccessRoute,
  firstAllowedRoute,
  hasAnyPermission,
  hasPermission,
  isRole
} from '../../src/roles.js';

describe('unitarias: catálogo de roles y permisos', () => {
  it('define los cinco cargos del catálogo con etiquetas en español', () => {
    expect(Object.keys(ROLES)).toEqual(['admin', 'recepcion', 'despacho', 'bodega', 'analista']);
    expect(ROLES.analista.label).toBe('Analista de Inventario');
    expect(isRole('admin')).toBe(true);
    expect(isRole('invitado')).toBe(false);
  });

  it('da acceso total al administrador mediante comodín', () => {
    expect(ROLE_PERMISSIONS.admin).toEqual(['*']);
    ALL_PERMISSIONS.forEach((permission) => {
      expect(hasPermission('admin', permission)).toBe(true);
    });
    expect(hasPermission('admin', 'permiso.futuro')).toBe(true);
  });

  it('resuelve permisos por cargo y rechaza roles desconocidos', () => {
    expect(hasPermission('recepcion', 'movement.entry')).toBe(true);
    expect(hasPermission('recepcion', 'movement.exit')).toBe(false);
    expect(hasPermission('despacho', 'movement.exit')).toBe(true);
    expect(hasPermission('despacho', 'movement.entry')).toBe(false);
    expect(hasPermission('bodega', 'movement.void')).toBe(true);
    expect(hasPermission('bodega', 'catalog.write')).toBe(false);
    expect(hasPermission('analista', 'audit.read')).toBe(false);
    expect(hasPermission('invitado', 'dashboard.read')).toBe(false);
    expect(hasAnyPermission('recepcion', ['movement.exit', 'movement.transfer'])).toBe(true);
    expect(hasAnyPermission('analista', ['movement.entry', 'catalog.write'])).toBe(false);
  });

  it('comprueba el acceso a rutas según el cargo', () => {
    expect(canAccessRoute('admin', 'manage', 'documents')).toBe(true);
    expect(canAccessRoute('admin', 'audit')).toBe(true);
    expect(canAccessRoute('analista', 'dashboard')).toBe(true);
    expect(canAccessRoute('analista', 'search')).toBe(true);
    expect(canAccessRoute('analista', 'manage', 'entities')).toBe(false);
    expect(canAccessRoute('analista', 'manage', 'documents')).toBe(false);
    expect(canAccessRoute('analista', 'audit')).toBe(false);
    expect(canAccessRoute('despacho', 'manage', 'documents')).toBe(true);
    expect(canAccessRoute('recepcion', 'manage', 'entities')).toBe(false);
    expect(canAccessRoute('', 'dashboard')).toBe(false);
  });

  it('selecciona la primera ruta permitida para cada perfil', () => {
    expect(firstAllowedRoute('admin')).toEqual({ view: 'dashboard', section: 'entities' });
    expect(firstAllowedRoute('analista')).toEqual({ view: 'dashboard', section: 'entities' });
    expect(firstAllowedRoute('')).toBeNull();
  });
});
