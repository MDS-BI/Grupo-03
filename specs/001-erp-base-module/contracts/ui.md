# Contrato de Interfaz de Usuario

**Feature**: `001-erp-base-module` | **Spec**: [spec.md](../spec.md) | **Fecha**: 2026-11-10

## Propósito

Definir las pantallas, la navegación y el comportamiento observable que la SPA debe cumplir. Las etiquetas mostradas provienen de [module-config.md](./module-config.md); los textos de ejemplo usan los valores base.

## Marco persistente (workspace shell)

- Barra superior con logotipo monograma SVG derivado de `moduleName` y el nombre del módulo (FR-036).
- Barra lateral con botones de módulo: Panel, Entidades, Documentos y Buscar (FR-012).
- El módulo activo se resalta visualmente con `aria-current` (FR-037).
- La barra lateral se contrae a una columna de iconos en anchos reducidos, manteniéndose operable (FR-039).
- El marco permanece visible en todas las pantallas; solo cambia la región de contenido.

## Pantallas

### 1. Panel (Dashboard)

| Elemento | Comportamiento |
|----------|----------------|
| Acciones rápidas | Al menos: nueva entidad, nuevo documento, abrir gestión de entidades y buscar registros (FR-033) |
| Acción "nueva entidad" | Abre Gestión con el formulario de entidad vacío y enfocado (FR-034) |
| Acción "nuevo documento" | Abre Gestión con el formulario de documento vacío y enfocado (FR-034) |
| Tarjetas de estadísticas | Total de entidades, total de documentos, valoración del stock y productos en nivel crítico (FR-035, US5) |
| Filtro por categoría | Recalcula las tarjetas dinámicamente; "limpiar filtros" vuelve a valores globales (US5) |
| Actualización | Las estadísticas se refrescan cada vez que se muestra el panel |

### 2. Gestión (Entidades y Documentos)

| Elemento | Comportamiento |
|----------|----------------|
| Formulario de entidad | Crear/editar nombre, código, categoría, descripción, fecha objetivo, unidad de medida, punto de reorden, costo unitario y campos personalizados |
| Formulario de documento | Crear/editar tipo (Entrada/Salida), cantidad, notas y, en Entrada, pasillo/estante/nivel |
| Lista de entidades | **No** se muestra en la pantalla de gestión (FR-016) |
| Acciones | Crear, editar y eliminar entidades y documentos (FR-017, FR-018) |
| Validación | Bloquea guardados inválidos y muestra mensajes descriptivos junto al campo (FR-006) |
| Eliminación de entidad | Advierte y elimina en cascada sus documentos (FR-009) |

### 3. Búsqueda

| Elemento | Comportamiento |
|----------|----------------|
| Entrada de búsqueda | Filtra por nombre, código, categoría, descripción y fecha objetivo (FR-020) |
| Filtro de categoría | Restringe resultados a la categoría seleccionada |
| Estado vacío | Mensaje claro cuando no hay coincidencias (FR-005) |
| Resultados | Solo lectura; la edición permanece en Gestión |
| Acceso | Desde la barra lateral y desde la acción rápida del panel (FR-021) |

## Navegación y Estado

- Solo se muestra una pantalla a la vez.
- La navegación interna no recarga la página; el botón atrás del navegador se comporta de forma predecible.
- Los datos de entidades y documentos permanecen intactos al navegar (FR-022, SC-007).
- Un enlace profundo o recarga en Gestión/Búsqueda debe renderizar la pantalla solicitada sin pasar por el panel.
- Salir de un formulario con cambios sin guardar requiere confirmación.

## Etiquetado desde configuración

- Todos los textos visibles (botones, títulos, pestañas, etiquetas de formulario, mensajes y estados vacíos) se derivan de `labels` (FR-029).
- Si no hay configuración, se muestran los términos base Entidad/Documento (FR-024).
- El logotipo y el nombre del módulo reflejan `moduleName`.

## Estados de retroalimentación

| Estado | Requisito |
|--------|-----------|
| Validación | Mensaje descriptivo por campo; el foco se mueve al primer error |
| Vacío | Mensaje claro con acción sugerida (crear/buscar) |
| Carga | Indicador no bloqueante al leer `localStorage` |
| Error de configuración | Aviso visible que explica el problema sin romper la app (FR-025) |
| Stock insuficiente | Alerta visible y botón de guardado deshabilitado en Salida (FR-042) |

## Accesibilidad y seguridad

- Controles nativos con `<label>` asociado; navegación completa por teclado; foco visible.
- Contraste suficiente y texto alternativo en el logotipo.
- Todo dato introducido por el usuario se escapa antes de insertarse en el DOM para prevenir XSS.
- No se usan `innerHTML` con datos de usuario sin sanitizar.

## Rendimiento observable

- Listados y búsqueda responden con ≥ 500 entidades sin pérdida de funcionalidad (FR-032).
- La interacción con el panel y la navegación no debe bloquear el hilo principal de forma perceptible.
