# Implementation Plan: Módulo Base ERP — Logística e Inventario

**Branch**: `001-erp-base-module` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-erp-base-module/spec.md`

## Summary

Construir un módulo base ERP frontend reutilizable para gestión de datos maestros (Entidades/Productos) y operaciones nativas de inventario (Entradas, Salidas, Transferencias, Ajustes, conteos físicos, anulaciones con contramovimiento y solicitudes de reposición), con saldo/ubicación por movimiento, validación de existencias, kardex, panel de KPIs y reetiquetado total desde configuración. El MVP se implementa como una SPA con Vite, HTML, CSS y JavaScript vanilla, persistencia en `localStorage` y pruebas con Vitest + jsdom.

Alcance aclarado (2026-11-16): los roles son solo etiquetas/simulación de vista en un único espacio de trabajo local (sin autenticación, gestión de usuarios ni permisos reales); la entidad requiere nombre, código (SKU), categoría, unidad y punto de reorden; la eliminación física solo es posible sin historial asociado (con historial se desactiva); los movimientos confirmados son inmutables y se corrigen por anulación con contramovimiento. La valoración usa `costo_unitario` opcional visible solo en panel/catálogo.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla), HTML5, CSS3; Node.js 18+ para tooling

**Primary Dependencies**: Vite 8.x (dev server/build), Vitest 4.x + jsdom (pruebas); sin framework de UI en runtime

**Storage**: `localStorage` del navegador (un único espacio de trabajo, sin backend)

**Testing**: Vitest con entorno jsdom; pruebas unitarias para almacenamiento/validación/configuración/stock y de integración para flujos de usuario

**Target Platform**: Navegadores modernos de escritorio y anchos reducidos (SPA)

**Project Type**: Aplicación web frontend de proyecto único (SPA)

**Performance Goals**: Listado y búsqueda correctos y responsivos con al menos 500 entidades (FR-032, SC-004); crear entidad y verla en la lista < 2 min (SC-001); búsqueda < 10 s (SC-002); navegación a gestión/búsqueda < 10 s (SC-005)

**Constraints**: Sin backend, sin autenticación ni permisos (rol simulado solo visual); etiquetas visibles derivadas de `src/module-config.js`; renderizado seguro contra XSS; controles nativos accesibles; persistencia local; una sola pantalla visible a la vez; barra lateral contraíble; movimientos confirmados inmutables; eliminación solo sin historial

**Scale/Scope**: Un espacio de trabajo; ≥ 500 registros de entidad; 5 historias de usuario; 3 pantallas (Panel, Gestión, Búsqueda); 45 requisitos funcionales + 5 requisitos de extensibilidad

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Gate | Cumplimiento |
|-----------|------|--------------|
| I. Code Quality & Maintainability | Código modular con responsabilidades separadas (almacenamiento, configuración, componentes, shell) y funciones pequeñas | PASS — la estructura propuesta aísla almacenamiento, configuración y UI; reglas de dominio e inmutabilidad en la capa de almacenamiento |
| II. Test-First & Verification | Pruebas unitarias e integración para comportamiento visible y lógica de negocio antes/junto a la implementación | PASS — Vitest + jsdom cubre validación, stock, unicidad, inmutabilidad/contramovimientos, configuración y flujos críticos |
| III. User Experience Consistency | Patrones consistentes de layout, terminología, validación, estados vacíos y accesibilidad; simulación de rol solo visual | PASS — tokens compartidos, etiquetas desde configuración, controles nativos accesibles y ocultación visual explícita sin control de acceso |
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
| III. User Experience Consistency | Contrato UI fija navegación, estados, mensajes y simulación visual de rol sin permisos reales | PASS |
| IV. Performance & Reliability | Modelo local apto para 500 registros; recálculo de KPIs y stock por operaciones explícitas | PASS |

**Resultado post-diseño**: Sin violaciones. Se puede proceder a `/speckit.tasks`.

## Complexity Tracking

> Sin violaciones constitucionales; sección no aplica.
