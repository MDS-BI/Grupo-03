# Contrato de Configuración del Módulo (`module-config.js`)

**Feature**: `001-erp-base-module` | **Modelo**: [../data-model.md](../data-model.md) | **Fecha**: 2026-11-16

## Propósito

Único punto de adaptación para módulos ERP personalizados. La configuración se exporta desde `src/module-config.js` como `userConfig` y se carga al arrancar.

## Forma

```js
export const userConfig = {
  moduleName: "Logística e Inventario",
  labels: {
    entity: { singular: "Producto", plural: "Productos", article: "el" },
    document: { singular: "Movimiento de Inventario", plural: "Movimientos" },
    dashboard: "Panel",
    search: "Buscar",
    manage: "Gestión"
  },
  customFields: {
    entity: [
      // campos específicos del dominio
    ],
    document: [
      // campos específicos del dominio para movimientos/documentos
    ]
  },
  statusLifecycle: {
    states: ["Borrador", "Pendiente", "Completado", "Cancelado"],
    transitions: {
      Borrador: ["Pendiente", "Cancelado"],
      Pendiente: ["Completado", "Cancelado"],
      Completado: [],
      Cancelado: []
    }
  },
  theme: {
    accentColor: "#1f6feb"
  }
};
```

## Campos

| Campo | Tipo | Obligatorio | Comportamiento |
|-------|------|-------------|----------------|
| `moduleName` | string | No | Nombre en barra superior y logotipo monograma; por defecto "ERP" |
| `labels` | object | No | Reetiqueta entidad, documento/movimiento, navegación y mensajes; por defecto Entidad/Documento |
| `customFields.entity` | array | No | Campos dinámicos en formularios, listas, búsqueda y validación de entidades |
| `customFields.document` | array | No | Campos dinámicos en formularios/listas/validación de documentos/movimientos |
| `statusLifecycle` | object | No | Estados y transiciones permitidas cuando aplique a documentos/movimientos configurables |
| `theme.accentColor` | string | No | Color CSS válido; si falta o es inválido, se usa el valor base |

## Definición de Campo Personalizado

| Propiedad | Tipo | Obligatorio | Regla |
|-----------|------|-------------|-------|
| `key` | string | Sí | Identificador único; no choca con campos base |
| `label` | string | Sí | Texto visible |
| `type` | string | Sí | `text`, `number`, `date` o `select` |
| `required` | boolean | No | Bloquea guardado si vacío |
| `options` | string[] | Solo `select` | Opciones seleccionables |
| `min` / `max` | number | No | Límites para `number` |

## Reglas de Configuración

1. Sin configuración se usan valores base: Entidad/Documento, sin campos personalizados ni ciclo de vida (FR-024).
2. Configuración inválida o conflictiva se informa claramente en la UI, sin fallar en silencio (FR-025).
3. Clave que choque con campo base se rechaza e informa.
4. `type` desconocido se rechaza e informa.
5. `statusLifecycle` inválido se rechaza e informa.
6. `theme.accentColor` inválido se ignora y se usa color base (FR-038).
7. Todas las etiquetas visibles derivan de configuración (FR-029).

## Límites de adaptación

- La configuración **no** puede desactivar reglas base de integridad: unicidad de SKU, campos obligatorios base, validación de stock, inmutabilidad de movimientos confirmados, ni reglas de eliminación/desactivación por historial.
- La adaptación de terminología no altera el comportamiento de navegación ni la semántica de las reglas base.

## Extensibilidad Garantizada

| Requisito | Garantía |
|-----------|----------|
| XR-001 | Campos adicionales sin cambiar la estructura base |
| XR-002 | Reetiquetado sin alterar navegación |
| XR-003 | Reglas de validación del módulo junto a las base |
| XR-004 | Identidad, marcas de tiempo e integridad referencial; preservación de historial según reglas base |
| XR-005 | Nombre, logotipo derivado y color de acento solo por configuración |
