# Implementation Plan: Módulo Base ERP — Logística e Inventario

**Branch**: `001-erp-base-module` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-erp-base-module/spec.md`

## Summary

Construir un módulo base ERP frontend reutilizable para gestión de datos maestros (Entidades/Productos) y documentos transaccionales (Movimientos de Inventario), con saldo de stock, ubicaciones físicas, validación de existencias, búsqueda, panel de KPIs y reetiquetado total desde configuración. El MVP se implementa como una aplicación de página única con Vite, HTML, CSS y JavaScript vanilla, persistencia en `localStorage` y pruebas unitarias/integración con Vitest. El alcance excluye autenticación y permisos: los roles son etiquetas descriptivas de las historias. La valoración de stock usa un `costo_unitario` opcional mostrado solo en panel/catálogo y nunca como entrada en formularios de movimiento.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla), HTML5, CSS3; Node.js 18+ para tooling

**Primary Dependencies**: Vite 8.x (dev server/build), Vitest 4.x + jsdom (pruebas); sin framework de UI en runtime

**Storage**: `localStorage` del navegador (un único espacio de trabajo, sin backend)

**Testing**: Vitest con entorno jsdom; pruebas unitarias para almacenamiento/validación/configuración y de integración para flujos de usuario

**Target Platform**: Navegadores modernos de escritorio y anchos reducidos (aplicación web de página única)

**Project Type**: Aplicación web frontend de proyecto único (SPA)

**Performance Goals**: Listado y búsqueda correctos y responsivos con al menos 500 entidades (FR-032, SC-004); crear entidad y verla en la lista < 2 min (SC-001); búsqueda < 10 s (SC-002); navegación a gestión/búsqueda < 10 s (SC-005)

**Constraints**: Sin backend, sin autenticación ni permisos; etiquetas visibles derivadas de `src/module-config.js`; renderizado seguro contra XSS; controles nativos accesibles; persistencia local; una sola pantalla visible a la vez; barra lateral contraíble

**Scale/Scope**: Un espacio de trabajo; ≥ 500 registros de entidad; 6 historias de usuario; 3 pantallas (Panel, Gestión, Búsqueda); 44 requisitos funcionales + 5 requisitos de extensibilidad

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Gate | Cumplimiento |
|-----------|------|--------------|
| I. Code Quality & Maintainability | Código modular con responsabilidades separadas (almacenamiento, configuración, componentes, shell) y funciones pequeñas | PASS — la estructura propuesta aísla almacenamiento, configuración y UI; el contrato de extensibilidad queda documentado |
| II. Test-First & Verification | Pruebas unitarias e integración para comportamiento visible y lógica de negocio antes/junto a la implementación | PASS — Vitest + jsdom cubre validación, stock, búsqueda, configuración y flujos críticos; cada historia define prueba independiente |
| III. User Experience Consistency | Patrones consistentes de layout, terminología, validación, estados vacíos y accesibilidad | PASS — tokens de diseño compartidos, etiquetas desde configuración y controles nativos accesibles |
| IV. Performance & Reliability | Presupuestos de rendimiento y comportamiento responsivo bajo uso esperado | PASS — objetivos medibles para 500 registros; renderizado y búsqueda sin trabajo bloqueante innecesario |

**Resultado**: Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-erp-base-module/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones y alternativas
├── data-model.md        # Fase 1: modelo de datos y validaciones
├── quickstart.md        # Fase 1: guía de validación end-to-end
├── contracts/           # Fase 1: contratos de almacenamiento, configuración y UI
│   ├── entity-storage.md
│   ├── module-config.md
│   └── ui.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # Generado por /speckit.tasks (no por /speckit.plan)
```

### Source Code (repository root)

```text
index.html
src/
├── main.js              # Arranque, carga de configuración y montaje
├── app.js               # Enrutamiento de vistas, estado y coordinación
├── module-config.js     # Configuración del módulo (nombre, etiquetas, campos, tema)
├── storage.js           # Entidades, documentos, stock, validación y persistencia
├── styles.css           # Tokens de diseño, shell, formularios, listas y responsive
└── components/
    ├── shell.js         # Barra superior, logotipo SVG, barra lateral y módulo activo
    ├── dashboard.js     # Acciones rápidas y tarjetas KPI
    ├── entity-form.js   # Alta/edición de entidades y campos personalizados
    ├── entity-list.js   # Listado, acciones y estados vacíos
    ├── document-form.js # Alta/edición de movimientos y ubicación
    ├── document-list.js # Listado de movimientos por entidad
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

**Structure Decision**: Proyecto único frontend. Se usa la estructura de proyecto único del template porque no hay backend ni aplicación móvil. `storage.js` concentra persistencia y reglas de dominio; `module-config.js` es el único punto de adaptación por módulo; los componentes de UI consumen ambos sin lógica de dominio duplicada.

## Phase 0: Research

Salida: [research.md](./research.md). Resuelve las decisiones tecnológicas y de dominio sin `NEEDS CLARIFICATION`.

## Phase 1: Design & Contracts

Salidas:
- [data-model.md](./data-model.md): entidades, campos, relaciones, validaciones y transiciones de estado.
- [contracts/entity-storage.md](./contracts/entity-storage.md): forma de datos y operaciones de persistencia.
- [contracts/module-config.md](./contracts/module-config.md): contrato de configuración y extensibilidad.
- [contracts/ui.md](./contracts/ui.md): pantallas, navegación, etiquetas y comportamiento esperado.
- [quickstart.md](./quickstart.md): escenarios de validación ejecutables.

## Post-Design Constitution Check

| Principio | Re-evaluación tras diseño | Resultado |
|-----------|---------------------------|-----------|
| I. Code Quality & Maintainability | Contratos separados por responsabilidad; UI sin reglas de stock embebidas | PASS |
| II. Test-First & Verification | Los contratos definen validaciones y efectos verificables; quickstart mapea cada historia a pruebas | PASS |
| III. User Experience Consistency | Contrato UI fija navegación, estados y etiquetas configurables | PASS |
| IV. Performance & Reliability | Modelo plano y búsqueda sobre arreglos locales aptos para 500 registros | PASS |

**Resultado post-diseño**: Sin violaciones. Se puede proceder a `/speckit.tasks`.

## Complexity Tracking

> Sin violaciones constitucionales; sección no aplica.
