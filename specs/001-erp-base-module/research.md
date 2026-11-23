# Investigación (Phase 0): Módulo Base ERP — Logística e Inventario

**Entrada**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-17

Este documento resuelve las decisiones técnicas y de dominio necesarias antes del diseño. No quedan marcadores `NEEDS CLARIFICATION`.

## Decisión 1: Vite + HTML/CSS/JavaScript vanilla
**Decisión**: Implementar la SPA con Vite como herramienta de desarrollo/build y JavaScript ES2022 sin framework de UI.
**Justificación**: Módulo base pequeño y didáctico; código legible, fácil de probar y sin acoplar módulos personalizados a un framework.
**Alternativas consideradas**: React/Vue (más dependencias/abstracción) y HTML estático sin bundler (peor DX/build).

## Decisión 2: Persistencia en `localStorage`
**Decisión**: Guardar entidades, movimientos, conteos y solicitudes en `localStorage` en un único espacio de trabajo.
**Justificación**: Sin backend/multiinquilino; suficiente para ≥ 500 registros. `storage.js` aísla acceso para futura evolución.
**Alternativas consideradas**: IndexedDB (complejidad asíncrona innecesaria) y backend (fuera de alcance).

## Decisión 3: Configuración como único punto de adaptación
**Decisión**: Nombre, etiquetas, campos personalizados, ciclo de vida y color de acento se definen en `src/module-config.js`; el núcleo no se edita.
**Justificación**: Cumple FR-023..FR-029 y XR-001..XR-005; fallback a valores base cuando falta configuración.
**Alternativas consideradas**: Variables de entorno o editar código por módulo (viola SC-008).

## Decisión 4: Modelo de inventario nativo y saldo derivado por movimientos
**Decisión**: El núcleo soporta nativamente Entidades y Movimientos de inventario (Entrada, Salida, Transferencia, Ajuste), además de Conteo Físico y Solicitud de Reposición. El saldo total y por ubicación se deriva/aplica mediante movimientos confirmados (nunca edición manual directa del stock).
**Justificación**: Alineado con las aclaraciones de 2026-11-17 (catálogo, movimientos, kardex, conteos e indicadores en alcance; integración Compras/Ventas —HU10— diferida) y con trazabilidad (HU4). La capa de almacenamiento aplica efectos de forma atómica al confirmar.
**Alternativas consideradas**: Limitar base a Entrada/Salida (contradice FR-043/FR-048) o editar stock a mano (rompe integridad).

## Decisión 5: Ubicación por movimiento y ubicación actual derivada
**Decisión**: La ubicación física se registra en documentos de Entrada (y origen/destino en Transferencias). La “ubicación actual” mostrada en el detalle del producto se deriva del documento de entrada o transferencia confirmado más reciente (FR-041).
**Justificación**: Preserva historial y evita duplicación/inconsistencia; la transferencia también cambia la ubicación vigente del producto.
**Alternativas consideradas**: Ubicación única en entidad o duplicada en entidad+documento.

## Decisión 6: Campos obligatorios, unicidad y costo opcional
**Decisión**: Crear entidad exige nombre, código (SKU), categoría, unidad y punto de reorden. El código es único globalmente (normalizado) y el guardado se bloquea ante duplicados. `costo_unitario` es opcional, se mantiene en la entidad y solo se muestra en panel/catálogo para valoración `Σ(stock × costo_unitario)`.
**Justificación**: Alinea FR-001/FR-045/HU1 y evita contradicción de KPI financiero con formularios de movimiento (aclaración 2026-11-10).
**Alternativas consideradas**: Código no único o costo en formularios de movimiento (rechazados por spec).

## Decisión 7: Eliminación, desactivación e inmutabilidad
**Decisión**: Eliminación física solo si la entidad no tiene documentos/movimientos asociados; si tiene historial, se bloquea y solo se permite desactivación conservando historial. Movimientos confirmados son inmutables y se corrigen mediante anulación con contramovimiento vinculado; solo borradores/no confirmados pueden editarse o cancelarse.
**Justificación**: Integridad referencial y trazabilidad/auditoría (FR-003, FR-008/FR-009/FR-018, HU4).
**Alternativas consideradas**: Borrado en cascada siempre o edición directa de confirmados (rompen historial).

## Decisión 8: Sin roles operativos; identidad local de persona
**Decisión**: Los roles son solo etiquetas descriptivas. No hay login, cuentas, permisos, selector de rol ni visibilidad de costos/contactos condicionada por rol (FR-047). La identidad se toma de un selector local de persona sin contraseña, y esa etiqueta se registra en la auditoría y en `aprobado_por` (FR-049).
**Justificación**: Aclaraciones de 2026-11-10 y 2026-11-17; evita una falsa sensación de seguridad y permite verificar que el aprobador de un ajuste no es quien contó (HU4#4).
**Alternativas consideradas**: Selector de rol con ocultación visual (retirado), autenticación/permisos reales o usuario implícito sin separación de funciones (todos rechazados).

## Decisión 9: Conteos, ajustes y solicitudes como registros nativos
**Decisión**: Modelar conteos físicos (ciegos, con diferencias) y solicitudes de reposición (con detalle y cantidad sugerida) como registros nativos vinculados a entidades/movimientos, con ajustes aprobados representados como movimientos de tipo Ajuste y referencias de trazabilidad.
**Justificación**: HU4/HU5 forman parte del alcance nativo; permite KPIs y kardex coherentes. La aprobación usa la persona local del selector (FR-049), distinta de quien contó.
**Alternativas consideradas**: Dejar a extensiones (contradice FR-046) o aprobar sin distinción de personas (contradice HU4#4).

## Decisión 10: Pruebas, renderizado seguro y accesibilidad
**Decisión**: Vitest + jsdom con pruebas unitarias e integración; escapar HTML/atributos al renderizar datos de usuario; controles nativos, labels, foco visible y `aria-current`; barra lateral contraíble.
**Justificación**: Cumple Constitución (II, III) y supuestos de seguridad/XSS de la spec.
**Alternativas consideradas**: Solo pruebas manuales o inserción directa de HTML no sanitizado.

## Decisión 11: Integración con Compras y Ventas (HU10) diferida
**Decisión**: No se implementa en esta versión la integración con Compras y Ventas: no hay `orden_compra_id`, `pedido_venta_id` ni `DemandaNoAtendida` operativos. El módulo queda preparado para añadirlos sin cambiar el núcleo.
**Justificación**: Decisión de alcance de 2026-11-17 (FR-046); HU10 es P3 y el módulo funciona sin ella.
**Alternativas consideradas**: Simular OC y pedidos con datos de ejemplo desde el inicio (añade superficie de prueba sin valor para HU1–HU5).
