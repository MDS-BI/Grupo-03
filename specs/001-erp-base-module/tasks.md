---
description: "Task list for feature implementation: Módulo Base ERP — Logística e Inventario"
---

# Tasks: Módulo Base ERP — Logística e Inventario

**Input**: Design documents from `/specs/001-erp-base-module/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because Constitution Principle II requires automated tests for user-visible behavior and business logic. Write tests before or alongside implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. HP6 (integración con Compras/Ventas) está diferida (FR-046) y no genera fase.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]`..`[US5]`) for story-phase tasks only
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure and tooling.

- [X] T001 Create project structure per implementation plan in `index.html`, `src/`, `src/components/`, `tests/unit/`, and `tests/integration/`
- [X] T002 Initialize Vite project with scripts (`dev`, `build`, `preview`, `test`, `test:run`) and dependencies in `package.json`
- [X] T003 [P] Configure Vitest + jsdom test environment in `vitest.config.mjs`
- [X] T004 [P] Configure linting and formatting tooling in `eslint.config.js` and `.prettierrc`
- [X] T005 [P] Create base HTML shell container and app entry mount in `index.html`
- [X] T006 [P] Create base design tokens, layout, form, table, and feedback styles in `src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement storage keys (`erp.entities`, `erp.movements`, `erp.counts`, `erp.replenishmentRequests`, `erp.persons`, `erp.audit`), load/save helpers, ID/timestamp utilities and safe `localStorage` access in `src/storage.js`
- [X] T008 Implement module configuration loading, defaults, validation and fallback behavior in `src/module-config.js`
- [X] T009 [P] Implement shared DOM utilities (safe text rendering, escaping, element and focus helpers) in `src/components/dom.js`
- [X] T010 [P] Implement workspace shell (top bar, derived SVG monogram, sidebar navigation, active state, responsive collapse) with NO role selector in `src/components/shell.js`
- [X] T011 [P] Implement local-person selector and `getPersons`/`savePersons` wiring for audit and approvals in `src/components/person-selector.js` and `src/app.js`
- [X] T012 Implement app bootstrap, view routing/state coordination (Dashboard/Manage/Search) and config/error surfacing in `src/main.js` and `src/app.js`
- [X] T013 [P] Create test setup/reset utilities for isolated `localStorage` state in `tests/setup.js` and wire them in `vitest.config.mjs`
- [X] T014 [P] Add foundational unit tests for config defaults/validation, storage primitives and person persistence in `tests/unit/module-config.test.js` and `tests/unit/storage.test.js`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Catálogo maestro (Priority: P1) 🎯 MVP

**Goal**: Gestionar entidades maestras con campos obligatorios, SKU único, eliminación/desactivación por historial y auditoría con persona local; sin roles operativos ni visibilidad por rol.

**Independent Test**: Crear una entidad válida (nombre, SKU, categoría, unidad, punto de reorden) con stock 0 y ver auditoría con la persona elegida; rechazar SKU duplicado y valores negativos; bloquear eliminación con historial y permitir solo desactivación; verificar que no existe selector de rol ni ocultación de costos/contactos (FR-047).

### Tests for User Story 1

- [X] T015 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, delete-vs-deactivate and audit recording in `tests/unit/storage.test.js`
- [X] T016 [P] [US1] Add integration test for entity create/edit flows, validation feedback and audit trail in `tests/integration/create-entity.test.js`
- [X] T017 [P] [US1] Add integration test for delete/deactivate behavior with and without history in `tests/integration/edit-delete-entity.test.js`

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement entity helpers, required-field validation, SKU uniqueness and audit writes in `src/storage.js`
- [X] T019 [P] [US1] Implement entity list/detail rendering with safe output, empty states and history-aware actions in `src/components/entity-list.js`
- [X] T020 [US1] Implement entity create/edit/deactivate form with custom fields and inline validation in `src/components/entity-form.js`
- [X] T021 [US1] Wire entity CRUD/deactivate flows, audit entries and current local person into app state/views in `src/app.js`
- [X] T022 [US1] Keep `costo_unitario` editable only in entity/catalog contexts with no role-based hiding in `src/components/entity-form.js`, `src/components/entity-list.js` and `src/app.js`

**Checkpoint**: US1 independently functional and testable.

---

## Phase 4: User Story 2 - Recepción con ubicación y transferencias (Priority: P1)

**Goal**: Registrar entradas con ubicación y transferencias entre ubicaciones como tercer tipo de documento, actualizando stock de forma atómica y preservando trazabilidad.

**Independent Test**: Confirmar entrada de 50 unidades en `A-03-2` y verificar stock total y por ubicación; transferir 10 a `B-01-1` y verificar total constante y ubicación actual derivada; bloquear transferencias que excedan el stock de origen y cancelar sin efectos.

### Tests for User Story 2

- [X] T023 [P] [US2] Add unit tests for `ENTRADA` and `TRANSFERENCIA` validation, stock effects and latest-location derivation in `tests/unit/stock.test.js`
- [X] T024 [P] [US2] Add integration test for entry registration, location capture, transfer flow and cancel-without-persist in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 2

- [X] T025 [P] [US2] Implement movement persistence for draft/confirmed states with `location`, `transfer`, `actorPerson` and `TRANSFERENCIA` type in `src/storage.js`
- [X] T026 [P] [US2] Implement movement form UI for `ENTRADA` and `TRANSFERENCIA` including draft/cancel behavior in `src/components/document-form.js`
- [X] T027 [US2] Implement movement/kardex list rendering for entity movements in `src/components/document-list.js`
- [X] T028 [US2] Integrate entry/transfer confirmation, atomic stock updates, latest location from entrada o transferencia (FR-041) and cancel handling in `src/app.js` and `src/storage.js`

**Checkpoint**: US2 independently functional (with foundational + US1 entity data available).

---

## Phase 5: User Story 3 - Despacho con validación de stock (Priority: P1)

**Goal**: Registrar salidas con validación de existencias (también al confirmar), motivo y reglas que impiden stock negativo.

**Independent Test**: Bloquear salida mayor al disponible con mensaje y confirmación deshabilitada; confirmar salida válida descontando el stock exacto; exigir observación cuando el motivo es Merma; reflejar la condición de alerta por punto de reorden.

### Tests for User Story 3

- [X] T029 [P] [US3] Add unit tests for `SALIDA` stock validation, insufficient-stock rejection and reorder-threshold signals in `tests/unit/stock.test.js`
- [X] T030 [P] [US3] Add integration test for outbound flow, insufficient-stock blocking, merma-note rule and valid confirmation in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 3

- [X] T031 [P] [US3] Extend movement model with `SALIDA` reasons, merma note requirement and confirm-time stock checks in `src/storage.js`
- [X] T032 [US3] Extend movement form UI for `SALIDA` with available stock/location info, reason/notes and disabled confirm on invalid input in `src/components/document-form.js`
- [X] T033 [US3] Integrate outbound confirmation and low-stock alert signaling for downstream dashboard use in `src/app.js` and `src/storage.js`

**Checkpoint**: US3 independently functional for outbound scenarios.

---

## Phase 6: User Story 4 - Kardex, conteo físico y ajustes (Priority: P1)

**Goal**: Proveer trazabilidad completa, inmutabilidad de confirmados con anulación/contramovimiento, conteos ciegos y ajustes aprobados por persona distinta a la que contó.

**Independent Test**: Ver kardex cronológico filtrable con persona local; impedir edición/eliminación directa de confirmados y corregir por anulación con contramovimiento; cerrar conteo ciego con diferencias y aprobar ajuste con motivo y persona local distinta.

### Tests for User Story 4

- [X] T034 [P] [US4] Add unit tests for confirmed-movement immutability, void/contramovement linkage and adjustment application in `tests/unit/stock.test.js` and `tests/unit/storage.test.js`
- [X] T035 [P] [US4] Add integration test for kardex filters, void flow, blind count closure and approved adjustment recording in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 4

- [X] T036 [P] [US4] Implement void/contramovement operations and immutable confirmed-movement guards in `src/storage.js`
- [X] T037 [P] [US4] Implement count/adjustment structures with `actorPerson`, `approvedByPerson` and the distinct-person rule in `src/storage.js`
- [X] T038 [US4] Implement kardex UI with chronological list, date/type filters, saldo, ubicación y persona local in `src/components/document-list.js`
- [X] T039 [US4] Implement count/adjustment flows and void controls with clear immutability feedback in `src/components/document-form.js` and `src/app.js`

**Checkpoint**: US4 independently functional for traceability and controlled corrections.

---

## Phase 7: User Story 5 - Panel de inventario y alertas de reposición (Priority: P2)

**Goal**: Mostrar KPIs y alertas de reposición accionables, con filtros reutilizables y generación de solicitudes agrupadas por proveedor.

**Independent Test**: Ver KPIs (activos, valoración `Σ(stock × costo_unitario)`, alertas, sin movimiento en 90 días) recalculados por filtros; listar alertas con cantidad sugerida editable; generar solicitud agrupada por proveedor; mostrar "Datos insuficientes" con menos de 30 días de historial.

### Tests for User Story 5

- [X] T040 [P] [US5] Add unit tests for dashboard KPI calculations, alert classification and replenishment suggestion logic in `tests/unit/storage.test.js`
- [X] T041 [P] [US5] Add integration test for dashboard rendering, filters/clear behavior and replenishment request generation in `tests/integration/dashboard.test.js`

### Implementation for User Story 5

- [X] T042 [P] [US5] Implement dashboard stats, alert/replenishment queries and request persistence in `src/storage.js`
- [X] T043 [US5] Implement dashboard UI with quick actions, KPI cards, alert table, filters, clear filters and insufficient-data labels in `src/components/dashboard.js`
- [X] T044 [US5] Integrate replenishment creation/grouping flow and dashboard refresh on navigation in `src/app.js`
- [X] T045 [US5] Implement/extend search screen access paths (sidebar and dashboard quick action) with safe rendering and empty states in `src/components/search-bar.js` and `src/app.js`

**Checkpoint**: US5 independently functional using persisted inventory data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, consistency, accessibility, performance and validation across stories.

- [X] T046 [P] Apply consistent config-driven relabeling and safe fallbacks across all screens in `src/module-config.js`, `src/components/shell.js`, `src/components/dashboard.js`, `src/components/entity-form.js`, `src/components/document-form.js`, `src/components/document-list.js` and `src/components/search-bar.js`
- [X] T047 [P] Verify XSS-safe rendering and escaping for all user-provided data in `src/components/` and `src/components/dom.js`
- [X] T048 [P] Verify accessibility and responsive behavior (labels, focus, keyboard nav, `aria-current`, collapsed sidebar) in `src/components/` and `src/styles.css`
- [X] T049 [P] Validate list/search performance with at least 500 entities and optimize hot paths in `src/storage.js` and `src/app.js`
- [X] T050 [P] Verify no role selector or role-based visibility remains and that local person/audit/approval behavior is consistent in `src/components/shell.js`, `src/components/person-selector.js`, `src/app.js` and `src/storage.js`
- [X] T051 Run quickstart validation scenarios and record results in `specs/001-erp-base-module/quickstart.md`
- [X] T052 [P] Update developer documentation for setup, configuration and extension points in `README.md` (if present) or `specs/001-erp-base-module/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phases 3–7 (User Stories)**: Depend on Phase 2 completion
  - Recommended priority order: **US1 → US2 → US3 → US4 → US5**
  - US5 depends functionally on reliable inventory data from US1–US4 but must remain independently testable with seeded fixtures
- **Phase 8 (Polish)**: Depends on completion of the desired user stories

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories
- **US2 (P1)**: Starts after Foundational; uses entities from US1 flows/data
- **US3 (P1)**: Starts after Foundational; extends the movement/stock domain from US2
- **US4 (P1)**: Starts after Foundational; builds on the movement history/confirmation model
- **US5 (P2)**: Starts after Foundational; consumes stock/movement/alert data for KPIs and replenishment
- **HU6 (P3)**: Diferida (FR-046); no genera tareas en esta versión

### Within Each User Story

- Write/prepare tests for the story and verify failure where applicable before implementation completes
- Domain/storage rules before UI wiring
- UI components before final app integration
- Validate the story independently at its checkpoint before moving on

### Parallel Opportunities

- Setup: `T003`, `T004`, `T005`, `T006` can run in parallel
- Foundational: `T009`, `T010`, `T011`, `T013`, `T014` can run in parallel after core storage/config exist
- US1: `T015`, `T016`, `T017`, `T018`, `T019` can run in parallel; `T020` follows the form/data contracts
- US2: `T023`, `T024`, `T025`, `T026` can run in parallel
- US3: `T029`, `T030`, `T031` can run in parallel
- US4: `T034`, `T035`, `T036`, `T037` can run in parallel
- US5: `T040`, `T041`, `T042` can run in parallel
- Polish: `T046`, `T047`, `T048`, `T049`, `T050`, `T052` can run in parallel

## Parallel Example: User Story 1

```text
- [X] T015 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, delete-vs-deactivate and audit recording in tests/unit/storage.test.js
- [X] T016 [P] [US1] Add integration test for entity create/edit flows, validation feedback and audit trail in tests/integration/create-entity.test.js
- [X] T017 [P] [US1] Add integration test for delete/deactivate behavior with and without history in tests/integration/edit-delete-entity.test.js
- [X] T019 [P] [US1] Implement entity list/detail rendering with safe output, empty states and history-aware actions in src/components/entity-list.js
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. **Stop and validate** US1 independently (quickstart HU1)
5. Demo/deploy-ready MVP slice

### Incremental Delivery

1. Setup + Foundational → base ready
2. Add US1 → validate independently (MVP)
3. Add US2 → validate entries/transfers
4. Add US3 → validate outbound controls
5. Add US4 → validate traceability, counts and adjustments
6. Add US5 → validate KPIs, alerts and replenishment
7. Finish with Phase 8 polish and full quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: storage/domain-heavy tasks for the active story
   - Developer B: UI components for the active story
   - Developer C: tests and integration wiring for the active story
3. Merge by story checkpoints to preserve independent testability

## Notes

- `[P]` tasks must touch different files and have no dependency on incomplete work
- `[US#]` labels provide traceability from tasks to spec user stories
- Keep domain rules (uniqueness, stock effects, immutability, history preservation, audit) centralized in `src/storage.js`
- `costo_unitario` must never be an input in movement forms; visibility is not role-dependent (FR-044, FR-047)
- Identity comes from the local person selector, not from roles (FR-049)
- Stop at each checkpoint to validate the story independently before proceeding
