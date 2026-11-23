# Implementation Plan: Módulo Base ERP — Logística e Inventario

**Branch**: `001-erp-base-module` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-erp-base-module/spec.md`

## Summary

Construir un módulo base ERP frontend reutilizable para gestión de datos maestros (Entidades/Productos) y operaciones nativas de inventario (Entradas, Salidas, Transferencias, Ajustes, conteos físicos, anulaciones con contramovimiento y solicitudes de reposición), con saldo/ubicación por movimiento, validación de existencias, kardex, panel de KPIs y reetiquetado total desde configuración. El MVP se implementa como una SPA con Vite, HTML, CSS y JavaScript vanilla, persistencia en `localStorage` y pruebas con Vitest + jsdom.

Alcance aclarado (2026-11-17): entran en esta versión las historias de catálogo, movimientos, kardex, conteos, indicadores y terminología configurable; la integración con Compras y Ventas (HU10) queda diferida. Los roles son solo etiquetas descriptivas, sin autenticación, permisos, selector de rol ni visibilidad condicionada por rol; la identidad de la persona se toma de un selector local sin contraseña y se registra en auditoría y aprobaciones. La entidad requiere nombre, código (SKU), categoría, unidad y punto de reorden; la eliminación física solo es posible sin historial asociado (con historial se desactiva); los movimientos confirmados son inmutables y se corrigen por anulación con contramovimiento. La valoración usa `costo_unitario` opcional visible solo en panel/catálogo.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla), HTML5, CSS3; Node.js 18+ para tooling

**Primary Dependencies**: Vite 8.x (dev server/build), Vitest 4.x + jsdom (pruebas); sin framework de UI en runtime

**Storage**: `localStorage` del navegador (un único espacio de trabajo, sin backend)

**Testing**: Vitest con entorno jsdom; pruebas unitarias para almacenamiento/validación/configuración/stock y de integración para flujos de usuario

**Target Platform**: Navegadores modernos de escritorio y anchos reducidos (SPA)

**Project Type**: Aplicación web frontend de proyecto único (SPA)

**Performance Goals**: Listado y búsqueda correctos y responsivos con al menos 500 entidades (FR-032, SC-004); crear entidad y verla en la lista < 2 min (SC-001); búsqueda < 10 s (SC-002); navegación a gestión/búsqueda < 10 s (SC-005)

**Constraints**: Sin backend, sin autenticación ni permisos; sin selector de rol ni visibilidad por rol (FR-047); selector local de persona para auditoría y separación de funciones (FR-049); etiquetas visibles derivadas de `src/module-config.js`; renderizado seguro contra XSS; controles nativos accesibles; persistencia local; una sola pantalla visible a la vez; barra lateral contraíble; movimientos confirmados inmutables; eliminación solo sin historial

**Scale/Scope**: Un espacio de trabajo; ≥ 500 registros de entidad; 10 historias en alcance (US1–US9 y US11; US10 —Compras/Ventas— diferida); 3 pantallas (Panel, Gestión, Búsqueda); 49 requisitos funcionales + 5 requisitos de extensibilidad

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Gate | Cumplimiento |
|-----------|------|--------------|
| I. Code Quality & Maintainability | Código modular con responsabilidades separadas (almacenamiento, configuración, componentes, shell) y funciones pequeñas | PASS — la estructura propuesta aísla almacenamiento, configuración y UI; reglas de dominio e inmutabilidad en la capa de almacenamiento |
| II. Test-First & Verification | Pruebas unitarias e integración para comportamiento visible y lógica de negocio antes/junto a la implementación | PASS — Vitest + jsdom cubre validación, stock, unicidad, inmutabilidad/contramovimientos, configuración y flujos críticos |
| III. User Experience Consistency | Patrones consistentes de layout, terminología, validación, estados vacíos y accesibilidad; identidad local sin control de acceso por rol | PASS — tokens compartidos, etiquetas desde configuración, controles nativos accesibles, persona local para auditoría y sin visibilidad condicionada por rol |
| IV. Performance & Reliability | Presupuestos de rendimiento y comportamiento responsivo bajo uso esperado | PASS — objetivos medibles para 500 registros; operaciones locales y búsqueda sin trabajo bloqueante innecesario |

**Resultado**: Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-erp-base-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── entity-storage.md
│   ├── module-config.md
│   └── ui.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
index.html
src/
├── main.js              # Arranque, carga de configuración y montaje
├── app.js               # Enrutamiento de vistas, estado y coordinación
├── module-config.js     # Configuración del módulo (nombre, etiquetas, campos, tema)
├── storage.js           # Entidades, movimientos, conteos, solicitudes, stock y persistencia
├── styles.css           # Tokens de diseño, shell, formularios, listas y responsive
└── components/
    ├── shell.js         # Barra superior, logotipo SVG, barra lateral y módulo activo
    ├── person-selector.js # Persona local para auditoría y aprobaciones (FR-049)
    ├── dashboard.js     # Acciones rápidas, KPIs, alertas y solicitudes de reposición
    ├── entity-form.js   # Alta/edición/desactivación de entidades y campos personalizados
    ├── entity-list.js   # Listado, acciones y estados vacíos
    ├── document-form.js # Registro de movimientos (entrada/salida/transferencia/ajuste)
    ├── document-list.js # Kardex y listado de movimientos por entidad
    └── search-bar.js    # Entrada de búsqueda y filtros

tests/
├── unit/
│   ├── storage.test.js
│   ├── module-config.test.js
│   └── stock.test.js
└── integration/
    ├── dashboard.test.js
    ├── create-entity.test.js
    ├── edit-delete-entity.test.js
    ├── search-entities.test.js
    ├── inventory-movements.test.js
    ├── relabeling.test.js
    └── workspace-shell.test.js
```

**Structure Decision**: Proyecto único frontend sin backend. `storage.js` concentra persistencia y reglas de dominio (unicidad de SKU, stock por ubicación/total derivado, inmutabilidad de confirmados, contramovimientos, conteos y solicitudes). `module-config.js` es el único punto de adaptación. La UI consume contratos sin duplicar reglas de negocio.

## Phase 0: Research

Salida: [research.md](./research.md). Resuelve decisiones tecnológicas y de dominio alineadas con las clarificaciones vigentes.

## Phase 1: Design & Contracts

Salidas:
- [data-model.md](./data-model.md): entidades, movimientos, conteos, solicitudes, validaciones y transiciones.
- [contracts/entity-storage.md](./contracts/entity-storage.md): forma de datos y operaciones de persistencia.
- [contracts/module-config.md](./contracts/module-config.md): contrato de configuración y extensibilidad.
- [contracts/ui.md](./contracts/ui.md): pantallas, navegación, etiquetas y comportamiento esperado.
- [quickstart.md](./quickstart.md): escenarios de validación ejecutables.

## Post-Design Constitution Check

| Principio | Re-evaluación tras diseño | Resultado |
|-----------|---------------------------|-----------|
| I. Code Quality & Maintainability | Contratos separados por responsabilidad; reglas de stock/inmutabilidad centralizadas; extensibilidad por configuración | PASS |
| II. Test-First & Verification | Contratos definen validaciones y efectos verificables (unicidad, stock, contramovimientos, conteos); quickstart mapea historias a pruebas | PASS |
| III. User Experience Consistency | Contrato UI fija navegación, estados, mensajes y selector local de persona sin permisos por rol | PASS |
| IV. Performance & Reliability | Modelo local apto para 500 registros; recálculo de KPIs y stock por operaciones explícitas | PASS |

**Resultado post-diseño**: Sin violaciones. Se puede proceder a `/speckit.tasks`.

## Análisis de escalabilidad y desarrollo futuro

### Estado actual del MVP

El MVP es una SPA sin backend: la persistencia es `localStorage` (`erp.entities`, `erp.movements`, `erp.counts`, `erp.replenishmentRequests`, `erp.persons`, `erp.audit`) y todo el cálculo ocurre en memoria. La meta explícita es mantener listado y búsqueda correctos con **al menos 500 entidades** (FR-032, SC-004), objetivo verificado con la suite automatizada. La capa `src/storage.js` concentra las reglas de dominio, de modo que el cambio de persistencia no obliga a reescribir la interfaz.

### Límites conocidos

| Límite | Consecuencia | Mitigación en el MVP |
|---|---|---|
| `localStorage` por navegador | Un solo espacio de trabajo, sin multiusuario real ni sincronización | Selector local de persona para auditoría; se documenta que en producción requiere backend |
| `stockBalance` como saldo total | No hay saldo por ubicación consultable | La ubicación se guarda por movimiento y se deriva del último confirmado (FR-041); la sugerencia FIFO usa la entrada más antigua |
| Historial corto | La rotación y cobertura pueden engañar | Etiqueta «Datos insuficientes» con menos de 30 días |
| Cálculo síncrono de KPIs | Con volúmenes muy altos puede degradar la UI | Filtrado lineal simple validado hasta 500 registros; se recomienda índices y agregación al migrar a backend |
| Costos visibles en panel/catálogo | Riesgo de exposición de información sensible | `unitCost` solo se muestra en panel/catálogo, nunca se ingresa en formularios de movimiento (FR-044) |

### Evolución futura (orden sugerido)

1. **Persistencia y concurrencia.** Sustituir `localStorage` por una API con base de datos relacional; las tablas `ENTIDAD`, `MOVIMIENTO`, `PROVEEDOR`, `CONTEO_FISICO`, `AUDITORIA` ya están modeladas en `data-model.md`.
2. **Saldo por ubicación.** Crear la tabla `StockUbicacion` y derivar el saldo por pasillo/estante/nivel con vistas materializadas, conservando los movimientos como fuente de verdad.
3. **Integración con Compras y Ventas (US10).** Añadir `orden_compra_id` y `pedido_venta_id` sin cambiar el contrato central de almacenamiento.
4. **Identidad y permisos reales.** Autenticar en backend y aplicar control de acceso por rol validado en servidor; hoy los roles son solo etiquetas descriptivas (FR-047).
5. **Auditoría inmutable y observabilidad.** Registros solo de inserción, trazas de las operaciones de stock y panel de errores.

## Potenciales usuarios y mitigación de sesgos

### Usuarios del sistema

| Perfil | Necesidad principal | Funcionalidad que lo atiende |
|---|---|---|
| Administrador del módulo | Catálogo confiable y auditoría | Alta/edición con SKU único, desactivación con historial, vista de auditoría |
| Operador de recepción | Registrar entradas con ubicación | Entradas con documento de respaldo, proveedor y pasillo-estante-nivel |
| Operador de despacho | Despachar sin stock negativo | Validación al confirmar y sugerencia FIFO |
| Jefe de bodega | Explicar diferencias de stock | Kardex cronológico, anulación con contramovimiento, conteos ciegos y ajustes aprobados |
| Analista de inventario | Apoyar decisiones | KPIs, alertas de reposición, filtros por categoría/período y rotación/cobertura |

En el MVP **no hay selector de rol**: estos perfiles son los usuarios potenciales descritos en las historias; la identidad real se elige en un selector local de persona que solo se usa para auditoría y aprobaciones.

### Sesgos asociados a los datos y su uso

| Sesgo / riesgo | Cómo se manifestaría | Mitigación implementada o prevista |
|---|---|---|
| Duplicidad de registros | El mismo producto se cuenta dos veces y el stock se fragmenta | Normalización de SKU (mayúsculas, sin espacios) y unicidad global bloqueante (FR-045) |
| Sesgo de anclaje en conteos | Quien cuenta ve el saldo del sistema y lo copia | Conteo ciego: la cantidad del sistema se oculta durante la captura |
| Sesgo de confirmación al corregir | Se edita o borra el movimiento equivocado | Documentos confirmados inmutables; corrección con contramovimiento vinculado y motivo |
| Sesgo de disponibilidad en KPIs | Se decide con menos de 30 días de historial | Rotación mostrada como «Datos insuficientes» |
| Sesgo de autoridad | Quien cuenta aprueba su propio ajuste | Aprobación obligatoria por persona local distinta (separación de funciones) |
| Sesgo de valoración | El costo se ingresa al recibir y sesga la valoración | `unitCost` opcional en el maestro y visible solo en panel/catálogo (FR-044) |
| Sesgo de presentación | Los filtros activos no se hacen visibles | Filtro de categoría/período mostrado en pantalla y recálculo explícito de KPIs |

## Complexity Tracking

> Sin violaciones constitucionales; sección no aplica.
