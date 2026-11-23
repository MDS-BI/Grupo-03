# Contrato de Interfaz de Usuario

**Feature**: `001-erp-base-module` | **Spec**: [../spec.md](../spec.md) | **Fecha**: 2026-11-17

## Propósito

Definir pantallas, navegación y comportamiento observable de la SPA. Las etiquetas provienen de [module-config.md](./module-config.md). No hay roles operativos: la identidad se elige en un selector local de persona solo para auditoría y aprobaciones (FR-049). La integración con Compras y Ventas (HU10) queda fuera de este contrato (FR-046).

## Marco persistente (workspace shell)

- Barra superior con logotipo monograma SVG derivado de `moduleName` y nombre del módulo.
- Selector de **persona local** disponible en el marco; su etiqueta se usa en auditoría, movimientos y aprobaciones. No es un rol, no da permisos y no oculta costos ni contactos (FR-047/FR-049).
- Barra lateral con botones de módulo: Panel, Entidades, Documentos y Buscar; el activo se resalta (`aria-current`).
- En anchos reducidos la barra lateral se contrae a iconos manteniéndose operable.
- El marco permanece visible en todas las pantallas.

## Pantallas

### 1. Panel (Dashboard)
| Elemento | Comportamiento |
|----------|----------------|
| Acciones rápidas | Al menos: nueva entidad, nuevo documento/movimiento, abrir gestión y buscar registros |
| Nueva entidad / nuevo movimiento | Abre Gestión con formulario vacío enfocado |
| KPIs | N° entidades activas, valoración total `Σ(stock×unitCost)` (solo panel/catálogo), N° en alerta, productos sin movimiento en 90 días |
| Alertas de reposición | Productos con stock ≤ punto de reorden (rojo si 0, amarillo si bajo punto) con cantidad sugerida editable |
| Solicitud de reposición | Genera solicitud agrupada por proveedor a partir de selección |
| Filtros | Recalculan KPIs y tabla; filtro activo visible; limpiar filtros restaura vista global |
| Actualización | Se refresca al mostrar el panel |

### 2. Gestión (Entidades y Movimientos)
| Elemento | Comportamiento |
|----------|----------------|
| Formulario de entidad | Crear/editar nombre, código (SKU), categoría, unidad, punto de reorden, descripción, fecha objetivo, `costo_unitario` opcional y campos personalizados; desactivar entidad con historial |
| Eliminación de entidad | Si no tiene historial: permite eliminar. Si tiene historial: bloquea eliminación y ofrece solo desactivación (conserva historial) |
| Formulario de movimiento | Registrar borrador/confirmación de Entrada, Salida, Transferencia y Ajuste según reglas; ubicación en entradas; origen/destino en transferencias; motivo cuando aplique |
| Inmutabilidad | Movimientos confirmados no se editan ni eliminan; se corrigen por anulación con contramovimiento. Borradores pueden editarse/cancelarse |
| Conteos físicos | Conteo ciego, cierre con diferencias y ajustes con motivo obligatorio; la aprobación exige persona local distinta de quien contó (FR-049) |
| Kardex/historial | Consulta cronológica por entidad con filtros (fecha/tipo), saldo, ubicación y persona local responsable; accesible desde gestión/detalle |
| Auditoría | Creación, edición y desactivación de entidades quedan registradas con persona local y fecha (HU1#4) |
| Lista de entidades | No se muestra como listado principal en esta pantalla (FR-016); gestión se enfoca en formularios/acciones |
| Validación | Bloquea guardados inválidos con mensajes descriptivos (campos obligatorios, SKU duplicado, stock insuficiente, etc.) |

### 3. Búsqueda
| Elemento | Comportamiento |
|----------|----------------|
| Búsqueda | Por nombre, código, categoría, descripción, fecha objetivo y campos personalizados |
| Filtros | P. ej. categoría; resultados claros |
| Estado vacío | Mensaje claro cuando no hay coincidencias |
| Resultados | Lectura/detalle; edición en Gestión |
| Acceso | Desde barra lateral y acción rápida del panel |

## Navegación y Estado

- Una sola pantalla visible a la vez; navegación interna sin recarga completa.
- Botón atrás del navegador con comportamiento predecible; enlaces profundos/recarga renderizan la pantalla solicitada.
- Datos intactos al navegar (FR-022, SC-007).
- Salir de formularios con cambios sin guardar requiere confirmación.

## Etiquetado e identidad local

- Todas las etiquetas visibles derivan de `labels` (FR-029); fallback a términos base (FR-024).
- No existe selector de rol ni ocultación de costos/contactos por rol (FR-047): la visibilidad de costos y valorización se rige por FR-044 (panel y catálogo).
- El selector de persona local solo identifica al responsable de movimientos, conteos, aprobaciones y auditoría (FR-049).

## Estados de retroalimentación

| Estado | Requisito |
|--------|-----------|
| Validación | Mensaje descriptivo por campo; foco en primer error |
| Vacío | Mensaje claro con acción sugerida |
| Carga | Indicador no bloqueante |
| Error de configuración | Aviso visible sin romper la app (FR-025) |
| Stock insuficiente | Alerta y guardado/confirmación bloqueados según corresponda (FR-042) |
| Inmutabilidad | Indicación clara de que un movimiento confirmado solo puede anularse |

## Accesibilidad y seguridad

- Controles nativos con `<label>`, teclado completo, foco visible.
- Contraste suficiente y texto alternativo en logotipo.
- Todo dato de usuario escapado antes de insertarse en el DOM (prevención XSS); sin `innerHTML` con datos sin sanitizar.

## Rendimiento observable

- Listados y búsqueda usables con ≥ 500 entidades (FR-032); sin bloqueos perceptibles en interacción/navegación.
