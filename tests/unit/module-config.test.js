import { describe, expect, it } from 'vitest';
import {
  defaultConfig,
  isValidAccentColor,
  loadModuleConfig,
  userConfig
} from '../../src/module-config.js';

describe('module-config', () => {
  it('usa los valores base cuando no hay configuración', () => {
    const { config, errors } = loadModuleConfig(undefined);
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe('ERP');
    expect(config.labels.entity).toEqual({
      singular: 'Entidad',
      plural: 'Entidades',
      article: 'la'
    });
    expect(config.labels.document).toEqual({
      singular: 'Documento',
      plural: 'Documentos',
      article: 'el'
    });
    expect(config.customFields).toEqual({ entity: [], document: [] });
    expect(config.statusLifecycle).toBeNull();
    expect(config.theme.accentColor).toBeNull();
    expect(defaultConfig.moduleName).toBe('ERP');
  });

  it('carga la configuración de logística e inventario sin errores', () => {
    const { config, errors } = loadModuleConfig(userConfig);
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe('Logística e Inventario');
    expect(config.labels.entity.singular).toBe('Producto');
    expect(config.customFields.entity).toHaveLength(3);
    expect(config.customFields.document).toHaveLength(1);
    expect(config.statusLifecycle.states).toContain('Completado');
    expect(config.theme.accentColor).toBe('#1f6feb');
  });

  it('informa colisiones con campos base y omite el campo conflictivo', () => {
    const { config, errors } = loadModuleConfig({
      ...userConfig,
      customFields: {
        entity: [{ key: 'name', label: 'Nombre duplicado', type: 'text' }],
        document: []
      }
    });
    expect(errors.some((error) => error.includes('choca con un campo base'))).toBe(true);
    expect(config.customFields.entity).toHaveLength(0);
  });

  it('informa tipos de campo desconocidos y select sin opciones', () => {
    const { config, errors } = loadModuleConfig({
      ...userConfig,
      customFields: {
        entity: [
          { key: 'raro', label: 'Raro', type: 'color' },
          { key: 'sin_opciones', label: 'Sin opciones', type: 'select' }
        ],
        document: []
      }
    });
    expect(errors.some((error) => error.includes('tipo desconocido'))).toBe(true);
    expect(errors.some((error) => error.includes('requiere opciones'))).toBe(true);
    expect(config.customFields.entity).toHaveLength(0);
  });

  it('informa ciclos de vida inválidos y retrocede a texto libre', () => {
    const { config, errors } = loadModuleConfig({
      ...userConfig,
      statusLifecycle: {
        states: ['Borrador', 'Completado'],
        transitions: { Borrador: ['NoExiste'] }
      }
    });
    expect(errors.some((error) => error.includes('no declarado'))).toBe(true);
    expect(config.statusLifecycle).toBeNull();
  });

  it('acepta un ciclo de vida válido', () => {
    const { config, errors } = loadModuleConfig(userConfig);
    expect(errors).toEqual([]);
    expect(config.statusLifecycle.transitions.Borrador).toEqual(['Pendiente', 'Cancelado']);
  });

  it('valida el color de acento y retrocede de forma segura', () => {
    expect(isValidAccentColor('#1f6feb')).toBe(true);
    expect(isValidAccentColor('#abc')).toBe(true);
    expect(isValidAccentColor('rgb(31, 111, 235)')).toBe(true);
    expect(isValidAccentColor('azul-invalido')).toBe(false);

    const invalid = loadModuleConfig({ ...userConfig, theme: { accentColor: 'azul-invalido' } });
    expect(invalid.config.theme.accentColor).toBeNull();
    expect(invalid.errors.some((error) => error.includes('color de acento'))).toBe(true);

    const valid = loadModuleConfig({ ...userConfig, theme: { accentColor: '#123456' } });
    expect(valid.config.theme.accentColor).toBe('#123456');
  });

  it('acepta reglas de validación específicas del módulo', () => {
    const validator = () => ({});
    const { config, errors } = loadModuleConfig({
      ...userConfig,
      customValidators: { entity: validator }
    });
    expect(errors).toEqual([]);
    expect(config.customValidators.entity).toBe(validator);

    const invalid = loadModuleConfig({
      ...userConfig,
      customValidators: { entity: 'no-es-funcion' }
    });
    expect(invalid.errors.some((error) => error.includes('debe ser una función'))).toBe(true);
  });

  it('informa configuraciones que no son objetos', () => {
    const { config, errors } = loadModuleConfig('texto');
    expect(errors.length).toBeGreaterThan(0);
    expect(config.moduleName).toBe('ERP');
  });
});
