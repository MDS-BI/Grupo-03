# Quickstart: Validación del Módulo Base ERP — Logística e Inventario

**Feature**: `001-erp-base-module` | **Plan**: [plan.md](./plan.md) | **Modelo**: [data-model.md](./data-model.md) | **Fecha**: 2026-11-10

Guía para ejecutar y validar el módulo de extremo a extremo. Los detalles de datos y contratos están en [data-model.md](./data-model.md) y [contracts/](./contracts/); no se duplican aquí.

## Prerrequisitos

- Node.js 18 o superior.
- npm.
- Navegador moderno.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir la URL que muestra Vite (por defecto `http://localhost:5173`).

## Pruebas automatizadas

```bash
npm run test:run
```

Modo watch durante desarrollo:

```bash
npm test
```

Build de producción:

```bash
npm run build
npm run preview
```

## Escenarios de validación

Cada escenario corresponde a una historia de usuario de [spec.md](./spec.md).

### US1 — Parametrización y datos maestros

1. Abrir Gestión → formulario de entidad.
2. Crear un producto con `name`, `code`, `category` y los campos personalizados obligatorios (`sku`, `punto_reorden`).
3. **Esperado**: se guarda, aparece disponible para movimientos y se valida un campo obligatorio vacío con mensaje descriptivo.
4. Editar `src/module-config.js` (nombre/etiquetas/campos) y recargar.
5. **Esperado**: la UI adopta los nuevos términos y campos sin romper registros existentes.

### US2/US3 — Recepción y entradas

1. Crear un producto nuevo.
2. Registrar un documento de tipo `ENTRADA` con cantidad `100` y ubicación Pasillo `A`, Estante `3`, Nivel `2`.
3. **Esperado**: el stock del producto pasa a `100` y el detalle muestra la ubicación de esa entrada.
4. Intentar guardar una entrada sin cantidad o sin ubicación.
5. **Esperado**: se bloquea con mensaje de campos faltantes.
6. Cancelar/volver a mitad de una entrada.
7. **Esperado**: no se guarda nada y el stock no cambia.

### US4 — Salidas y despachos

1. Registrar una `SALIDA` con cantidad mayor al stock disponible.
2. **Esperado**: alerta de inventario insuficiente y botón de guardado deshabilitado.
3. Ajustar a una cantidad válida y guardar.
4. **Esperado**: el stock disminuye exactamente en la cantidad despachada.

### US5 — Panel analítico

1. Abrir el Panel con datos cargados.
2. **Esperado**: tarjetas de total de entidades, valoración del stock y productos en nivel crítico.
3. Seleccionar una categoría en el filtro.
4. **Esperado**: la tabla y las tarjetas se recalculan solo para esa categoría.
5. Pulsar "limpiar filtros".
6. **Esperado**: vuelven los valores globales.
7. Reducir el stock de un producto bajo su `punto_reorden` y volver al panel.
8. **Esperado**: aumenta el indicador de productos críticos y aparece alerta visual.

### US6 — Reetiquetado desde configuración

1. Configurar `Entidad → Producto` y `Documento → Movimiento de Inventario`.
2. Recorrer Panel, Gestión y Búsqueda.
3. **Esperado**: botones, tablas, formularios, mensajes y estados vacíos usan los términos configurados; la navegación y persistencia no cambian.
4. Quitar los mapeos y recargar.
5. **Esperado**: se usan los términos base del módulo ERP.

## Validación transversal

| Comprobación | Esperado |
|--------------|----------|
| Campos obligatorios vacíos | Errores visibles y guardado bloqueado |
| Fecha objetivo inválida | Rechazo con explicación |
| Búsqueda sin coincidencias | Estado vacío claro |
| Eliminar entidad con documentos | Cascada sin registros huérfanos |
| Navegar entre pantallas | Datos intactos |
| Recargar la página | Datos persisten en `localStorage` |
| 500 entidades | Listado y búsqueda siguen siendo usables |
| Ventana estrecha | Barra lateral contraída a iconos, operable |
| Datos con HTML/scripts | Se muestran escapados, sin ejecución |
| Salida mayor al stock | Bloqueada con mensaje |
| Costo unitario | Visible en panel/catálogo; ausente como entrada en movimientos |

## Extender el módulo base

1. Editar solo `src/module-config.js`: nombre, etiquetas, campos personalizados, ciclo de vida y color de acento.
2. **Esperado**: cero modificaciones en `src/storage.js`, `src/app.js` o componentes centrales (SC-008).
3. Sin configuración, la aplicación funciona con Entidad/Documento y sin campos ni ciclo de vida.

Contratos de referencia:
- [contracts/entity-storage.md](./contracts/entity-storage.md)
- [contracts/module-config.md](./contracts/module-config.md)
- [contracts/ui.md](./contracts/ui.md)

## Resultados de validación (2026-11-10)

| Comando | Resultado |
|---------|-----------|
| `npm run test:run` | 10 archivos, 58 pruebas aprobadas |
| `npm run lint` | Sin errores ni advertencias |
| `npm run build` | Build de producción correcto (Vite 8.2.1) |

Cobertura de escenarios:

| Escenario | Evidencia |
|-----------|-----------|
| US1 — datos maestros y campos personalizados | `tests/unit/storage.test.js`, `tests/integration/create-entity.test.js`, `tests/integration/edit-delete-entity.test.js` |
| US2/US3 — entradas, ubicación y cancelación | `tests/unit/stock.test.js`, `tests/integration/inventory-movements.test.js` |
| US4 — salidas y stock insuficiente | `tests/unit/stock.test.js`, `tests/integration/inventory-movements.test.js` |
| US5 — panel, KPIs, filtros y búsqueda | `tests/unit/storage.test.js`, `tests/integration/dashboard.test.js`, `tests/integration/workspace-shell.test.js` |
| US6 — reetiquetado y ciclo de vida | `tests/unit/module-config.test.js`, `tests/integration/relabeling.test.js` |
| Transversal — escapado, persistencia y 500 entidades | `tests/integration/security-persistence.test.js` |
| Enlaces profundos y navegación | `tests/integration/workspace-shell.test.js` |
