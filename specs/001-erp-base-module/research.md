# Investigación (Phase 0): Módulo Base ERP — Logística e Inventario

**Entrada**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-16

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
**Justificación**: Alineado con aclaración 2026-11-16 (HU2–HU5 nativas) y con trazabilidad (HU4). La capa de almacenamiento aplica efectos de forma atómica al confirmar.
**Alternativas consideradas**: Limitar base a Entrada/Salida (contradice spec) o editar stock a mano (rompe integridad).

## Decisión 5: Ubicación por movimiento y ubicación actual derivada
**Decisión**: La ubicación física se registra en documentos de Entrada (y origen/destino en Transferencias). La “ubicación actual” mostrada en el detalle del producto se deriva del documento de entrada más reciente.
**Justificación**: Preserva historial y evita duplicación/inconsistencia (FR-041, aclaraciones previas).
**Alternativas consideradas**: Ubicación única en entidad o duplicada en entidad+documento.

## Decisión 6: Campos obligatorios, unicidad y costo opcional
**Decisión**: Crear entidad exige nombre, código (SKU), categoría, unidad y punto de reorden. El código es único globalmente (normalizado) y el guardado se bloquea ante duplicados. `costo_unitario` es opcional, se mantiene en la entidad y solo se muestra en panel/catálogo para valoración `Σ(stock × costo_unitario)`.
**Justificación**: Alinea FR-001/FR-045/HU1 y evita contradicción de KPI financiero con formularios de movimiento (aclaración 2026-11-10).
**Alternativas consideradas**: Código no único o costo en formularios de movimiento (rechazados por spec).

## Decisión 7: Eliminación, desactivación e inmutabilidad
**Decisión**: Eliminación física solo si la entidad no tiene documentos/movimientos asociados; si tiene historial, se bloquea y solo se permite desactivación conservando historial. Movimientos confirmados son inmutables y se corrigen mediante anulación con contramovimiento vinculado; solo borradores/no confirmados pueden editarse o cancelarse.
**Justificación**: Integridad referencial y trazabilidad/auditoría (FR-003, FR-008/FR-009/FR-018, HU4).
**Alternativas consideradas**: Borrado en cascada siempre o edición directa de confirmados (rompen historial).

## Decisión 8: Roles simulados sin autenticación
**Decisión**: Los roles son etiquetas/simulación de vista en UI local (p. ej. selector) en un único espacio de trabajo; no hay login, cuentas gestionables ni permisos/enforcement reales. La auditoría usa etiquetas locales de actor.
**Justificación**: Aclaración 2026-11-16 y supuestos del MVP con `localStorage`.
**Alternativas consideradas**: Autenticación/permisos reales o gestión local de perfiles con enforcement (fuera de alcance/complejidad innecesaria).

## Decisión 9: Conteos, ajustes y solicitudes como registros nativos
**Decisión**: Modelar conteos físicos (ciegos, con diferencias) y solicitudes de reposición (con detalle y cantidad sugerida) como registros nativos vinculados a entidades/movimientos, con ajustes aprobados representados como movimientos de tipo Ajuste y referencias de trazabilidad.
**Justificación**: HU4/HU5 forman parte del alcance nativo; permite KPIs y kardex coherentes.
**Alternativas consideradas**: Dejar a extensiones (contradice alcance aclarado).

## Decisión 10: Pruebas, renderizado seguro y accesibilidad
**Decisión**: Vitest + jsdom con pruebas unitarias e integración; escapar HTML/atributos al renderizar datos de usuario; controles nativos, labels, foco visible y `aria-current`; barra lateral contraíble.
**Justificación**: Cumple Constitución (II, III) y supuestos de seguridad/XSS de la spec.
**Alternativas consideradas**: Solo pruebas manuales o inserción directa de HTML no sanitizado.
