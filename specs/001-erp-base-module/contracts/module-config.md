# Contrato de Configuración del Módulo (`module-config.js`)

**Feature**: `001-erp-base-module` | **Modelo**: [data-model.md](../data-model.md) | **Fecha**: 2026-11-10

## Propósito

Definir el único punto de adaptación para construir módulos ERP personalizados sobre la base. La configuración se exporta desde `src/module-config.js` como `userConfig` y se carga al arrancar.

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
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "punto_reorden", label: "Punto de reorden", type: "number", required: true, min: 0 },
      { key: "unidad_medida", label: "Unidad de medida", type: "select", required: false, options: ["Unidades", "Cajas", "Kg", "Litros"] }
    ],
    document: [
      { key: "tipo_movimiento", label: "Tipo de movimiento", type: "select", required: false, options: ["Entrada", "Salida"] }
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
| `moduleName` | string | No | Nombre en barra superior y logotipo monograma derivado; por defecto "ERP" |
| `labels` | object | No | Reetiqueta entidad, documento, navegación y mensajes; por defecto Entidad/Documento |
| `customFields.entity` | array | No | Campos dinámicos en formularios, listas, búsqueda y validación de entidades |
| `customFields.document` | array | No | Campos dinámicos en formularios, listas y validación de documentos |
| `statusLifecycle` | object | No | Estados y transiciones permitidas de documentos |
| `theme.accentColor` | string | No | Color CSS válido; si falta o es inválido, se usa el valor base |

## Definición de Campo Personalizado

| Propiedad | Tipo | Obligatorio | Regla |
|-----------|------|-------------|-------|
| `key` | string | Sí | Identificador único; no puede chocar con un campo base |
| `label` | string | Sí | Texto visible en formularios y listas |
| `type` | string | Sí | `text`, `number`, `date` o `select` |
| `required` | boolean | No | Si es `true`, bloquea el guardado cuando está vacío |
| `options` | string[] | Solo `select` | Opciones seleccionables |
| `min` / `max` | number | No | Límites para `number` |

## Reglas de Configuración

1. Sin archivo o sin configuración se usan los valores base: Entidad/Documento, sin campos personalizados ni ciclo de vida (FR-024).
2. Una configuración inválida o conflictiva se informa claramente en la UI, sin fallar en silencio (FR-025).
3. Una clave de campo personalizado que choque con un campo base se rechaza e informa.
4. Un `type` desconocido se rechaza e informa.
5. Un `statusLifecycle` con estados/transiciones inválidas se rechaza e informa.
6. `theme.accentColor` inválido se ignora y se usa el color base (FR-038).
7. Las etiquetas visibles nunca se codifican en el código central; siempre provienen de esta configuración (FR-029).

## Extensibilidad Garantizada

| Requisito | Garantía |
|-----------|----------|
| XR-001 | Campos adicionales sin cambiar la estructura de almacenamiento base |
| XR-002 | Reetiquetado sin alterar navegación |
| XR-003 | Reglas de validación del módulo junto a las base |
| XR-004 | Identidad, marcas de tiempo, integridad referencial y cascada en la base |
| XR-005 | Nombre, logotipo derivado y color de acento solo por configuración |
