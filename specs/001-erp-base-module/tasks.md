# Tasks: Módulo Base ERP — Logística e Inventario

**Input**: Design documents from `/specs/001-erp-base-module/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included (Constitution Principle II requires automated tests for user-visible behavior and business logic). Write tests before or alongside implementation and verify they fail/pass as appropriate for the flow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (`[US1]`..`[US5]`) for story-phase tasks only
- All tasks include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure and tooling.

- [X] T001 Create project structure and folders per implementation plan in `index.html`, `src/`, `src/components/`, `tests/unit/`, and `tests/integration/`
- [X] T002 Initialize Vite project, scripts (`dev`, `build`, `preview`, `test`, `test:run`), and dependencies in `package.json`
- [X] T003 [P] Configure Vitest + jsdom test environment in `vitest.config.mjs`
- [X] T004 [P] Configure linting/formatting tooling in `.eslintrc.cjs` (or `eslint.config.js`) and `.prettierrc` (if used)
- [X] T005 [P] Create base HTML shell container and app entry mount in `index.html`
- [X] T006 [P] Create base design tokens, layout, form, table, and feedback styles in `src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement storage keys, load/save helpers, ID/timestamp utilities, and safe localStorage access in `src/storage.js`
- [X] T008 Implement module configuration loading, defaults, validation, and fallback behavior in `src/module-config.js`
- [X] T009 [P] Implement shared DOM utilities (safe text/HTML escaping, element helpers, validation/focus helpers) in `src/components/dom.js` (or `src/utils/dom.js`)
- [X] T010 [P] Implement workspace shell component (top bar, derived SVG monogram, sidebar navigation, active state, responsive collapse, simulated role selector placeholder UI) in `src/components/shell.js`
- [X] T011 Implement app bootstrap, view routing/state coordination (Dashboard/Manage/Search), and config/error surfacing in `src/main.js` and `src/app.js`
- [X] T012 [P] Create test setup/reset utilities for isolated localStorage state in `tests/setup.js` (and wire in `vitest.config.mjs` if needed)
- [X] T013 [P] Add foundational unit tests for config defaults/validation and storage primitives in `tests/unit/module-config.test.js` and `tests/unit/storage.test.js`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Catálogo maestro y simulación de rol (Priority: P1) 🎯 MVP

**Goal**: Gestionar entidades maestras con campos obligatorios, unicidad de SKU, reglas de eliminación/desactivación por historial, y simulación visual de rol sin autenticación.

**Independent Test**: Crear una entidad válida (nombre, SKU, categoría, unidad, punto de reorden) con stock 0; rechazar SKU duplicado/costos o puntos negativos; bloquear eliminación si hay historial y permitir solo desactivación; cambiar rol simulado a Operador y ocultar costos/valoración/contactos en la vista.

### Tests for User Story 1

- [ ] T014 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, and delete-vs-deactivate rules in `tests/unit/storage.test.js`
- [ ] T015 [P] [US1] Add integration test for entity create/edit flows and validation feedback in `tests/integration/create-entity.test.js`
- [ ] T016 [P] [US1] Add integration test for delete/deactivate behavior with and without history in `tests/integration/edit-delete-entity.test.js`

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement entity data model helpers, required-field validation, SKU uniqueness checks, and audit label capture hooks in `src/storage.js`
- [ ] T018 [P] [US1] Implement entity list/detail rendering with safe output, empty states, and history-aware actions in `src/components/entity-list.js`
- [ ] T019 [US1] Implement entity create/edit/deactivate form with custom fields support and inline validation in `src/components/entity-form.js`
- [ ] T020 [US1] Wire entity CRUD/deactivate flows, role-simulated visibility rules, and audit label recording into app state/views in `src/app.js` and `src/components/shell.js`
- [ ] T021 [US1] Ensure `costo_unitario` is editable only in entity/catalog contexts and hidden for simulated Operador view in `src/components/entity-form.js`, `src/components/entity-list.js`, and `src/app.js`

**Checkpoint**: US1 independently functional and testable.

---

## Phase 4: User Story 2 - Recepción con ubicación y transferencias (Priority: P1)

**Goal**: Registrar entradas con ubicación y transferencias entre ubicaciones, actualizando stock de forma atómica y preservando trazabilidad.

**Independent Test**: Confirmar entrada de 50 unidades en ubicación A-03-2 y verificar stock total/ubicación; transferir 10 a B-01-1 y verificar total constante; bloquear transferencias que excedan stock de origen y cancelar sin efectos.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add unit tests for movement validation and stock/location effects for `ENTRADA` and `TRANSFERENCIA` in `tests/unit/stock.test.js`
- [ ] T023 [P] [US2] Add integration test for entry registration, location capture, transfer flow, and cancel-without-persist in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 2

- [ ] T024 [P] [US2] Implement movement persistence/model for draft/confirmed states and location/transfer fields in `src/storage.js`
- [ ] T025 [P] [US2] Implement movement form UI for `ENTRADA` and `TRANSFERENCIA` (including draft/cancel behavior) in `src/components/document-form.js`
- [ ] T026 [US2] Implement movement/kardex list rendering for entity movements in `src/components/document-list.js`
- [ ] T027 [US2] Integrate entry/transfer confirmation, atomic stock updates, latest-entry location derivation, and cancel handling in `src/app.js` and `src/storage.js`

**Checkpoint**: US2 independently functional (with foundational + US1 entity data available).

---

## Phase 5: User Story 3 - Despacho con validación de stock (Priority: P1)

**Goal**: Registrar salidas con validación de existencias (incluida al confirmar), motivo y reglas de negocio sin permitir stock negativo.

**Independent Test**: Bloquear salida mayor al disponible con mensaje y confirmación deshabilitada; confirmar salida válida descontando stock exacto; exigir observación cuando motivo es Merma; reflejar condición de alerta por punto de reorden.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add unit tests for `SALIDA` stock validation, insufficient-stock rejection, and reorder-threshold signals in `tests/unit/stock.test.js`
- [ ] T029 [P] [US3] Add integration test for outbound flow, insufficient stock blocking, merma-note rule, and valid confirmation in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 3

- [ ] T030 [P] [US3] Extend movement model/validation for `SALIDA` reasons, merma note requirement, and confirm-time stock checks in `src/storage.js`
- [ ] T031 [US3] Extend movement form UI for `SALIDA` (available stock/location info, reason/notes, disabled confirm on invalid) in `src/components/document-form.js`
- [ ] T032 [US3] Integrate outbound confirmation flow and low-stock alert signaling for downstream dashboard use in `src/app.js` and `src/storage.js`

**Checkpoint**: US3 independently functional for outbound scenarios.

---

## Phase 6: User Story 4 - Kardex, conteo físico y ajustes (Priority: P1)

**Goal**: Proveer trazabilidad completa (kardex), inmutabilidad de confirmados con anulación/contramovimiento, conteos físicos ciegos y ajustes aprobados.

**Independent Test**: Ver kardex cronológico filtrable; impedir edición/eliminación directa de confirmados y corregir por anulación con contramovimiento; cerrar conteo ciego con diferencias y aprobar ajuste con motivo y actor distinto al conteo.

### Tests for User Story 4

- [ ] T033 [P] [US4] Add unit tests for confirmed-movement immutability, void/contramovement linkage, and adjustment application in `tests/unit/stock.test.js` and `tests/unit/storage.test.js`
- [ ] T034 [P] [US4] Add integration test for kardex view/filters, void flow, blind count closure, and approved adjustment recording in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 4

- [ ] T035 [P] [US4] Implement void/contramovement operations and immutable confirmed-movement guards in `src/storage.js`
- [ ] T036 [P] [US4] Implement physical count and adjustment data structures/operations (blind capture, differences, approval actor labels) in `src/storage.js`
- [ ] T037 [US4] Implement kardex UI (chronological list, filters by date/type, actor/location/saldo display) in `src/components/document-list.js`
- [ ] T038 [US4] Implement count/adjustment UI flows and void-action controls with clear immutability feedback in `src/components/document-form.js` and `src/app.js`

**Checkpoint**: US4 independently functional for traceability and controlled corrections.

---

## Phase 7: User Story 5 - Panel de inventario y alertas de reposición (Priority: P2)

**Goal**: Mostrar KPIs y alertas de reposición accionables, con filtros y generación de solicitudes de reposición.

**Independent Test**: Ver KPIs (activos, valoración, alertas, sin movimiento 90 días) recalculados por filtros; listar productos en alerta con cantidad sugerida editable; generar solicitud de reposición agrupada por proveedor; mostrar "Datos insuficientes" cuando aplique.

### Tests for User Story 5

- [ ] T039 [P] [US5] Add unit tests for dashboard KPI calculations, alert classification, and replenishment suggestion logic in `tests/unit/storage.test.js`
- [ ] T040 [P] [US5] Add integration test for dashboard rendering, filters/clear behavior, and replenishment request generation in `tests/integration/dashboard.test.js`

### Implementation for User Story 5

- [ ] T041 [P] [US5] Implement dashboard stats, alert/replenishment query helpers, and replenishment request persistence in `src/storage.js`
- [ ] T042 [US5] Implement dashboard UI (quick actions, KPI cards, alert table, filters, clear filters, insufficient-data labels) in `src/components/dashboard.js`
- [ ] T043 [US5] Integrate replenishment request creation/grouping flow and dashboard refresh on navigation in `src/app.js`
- [ ] T044 [US5] Implement/extend search screen behavior and access paths (sidebar and dashboard quick action) with safe rendering and empty states in `src/components/search-bar.js` and `src/app.js`

**Checkpoint**: US5 independently functional using persisted inventory data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, consistency, accessibility, performance, and validation across stories.

- [ ] T045 [P] Apply consistent config-driven relabeling and safe fallbacks across all screens/components in `src/module-config.js`, `src/components/shell.js`, `src/components/dashboard.js`, `src/components/entity-form.js`, `src/components/document-form.js`, `src/components/document-list.js`, and `src/components/search-bar.js`
- [ ] T046 [P] Audit and enforce XSS-safe rendering and input/output escaping for all user-provided data in `src/components/` and shared DOM utilities
- [ ] T047 [P] Verify accessibility and responsive behavior (labels, focus, keyboard nav, `aria-current`, collapsed sidebar) in `src/components/` and `src/styles.css`
- [ ] T048 [P] Validate performance for list/search operations with at least 500 entities and optimize hot paths in `src/storage.js` and `src/app.js`
- [ ] T049 Run and update quickstart validation scenarios and document results in `specs/001-erp-base-module/quickstart.md`
- [ ] T050 [P] Add or update developer documentation for setup, configuration, and module extension points in `README.md` (if present) or `specs/001-erp-base-module/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phases 3–7 (User Stories)**: Depend on Phase 2 completion
  - Recommended priority order: **US1 → US2 → US3 → US4 → US5**
  - US5 depends functionally on reliable inventory data from US1–US4 but should remain independently testable with seeded/fixture data
- **Phase 8 (Polish)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories
- **US2 (P1)**: Starts after Foundational; uses entities from US1 flows/data
- **US3 (P1)**: Starts after Foundational; extends movement/stock behavior from US2 domain
- **US4 (P1)**: Starts after Foundational; builds on movement history/confirmation model
- **US5 (P2)**: Starts after Foundational; consumes stock/movement/alert data for KPIs and replenishment

### Within Each User Story

- Write/prepare tests for the story and verify failure where applicable before implementation completes
- Domain/storage rules before UI wiring
- UI components before final app integration
- Validate story independently at its checkpoint before moving on

### Parallel Opportunities

- Setup: `T003`, `T004`, `T005`, `T006` can run in parallel
- Foundational: `T009`, `T010`, `T012`, `T013` can run in parallel after core dependencies
- US1: `T014`, `T015`, `T016`, `T017`, `T018` can run in parallel; `T019` follows form/data contracts
- US2: `T022`, `T023`, `T024`, `T025` can run in parallel
- US3: `T028`, `T029`, `T030` can run in parallel
- US4: `T033`, `T034`, `T035`, `T036` can run in parallel
- US5: `T039`, `T040`, `T041` can run in parallel
- Polish: `T045`, `T046`, `T047`, `T048`, `T050` can run in parallel

## Parallel Example: User Story 1

```text
- [ ] T014 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, and delete-vs-deactivate rules in tests/unit/storage.test.js
- [ ] T015 [P] [US1] Add integration test for entity create/edit flows and validation feedback in tests/integration/create-entity.test.js
- [ ] T016 [P] [US1] Add integration test for delete/deactivate behavior with and without history in tests/integration/edit-delete-entity.test.js
- [ ] T018 [P] [US1] Implement entity list/detail rendering with safe output, empty states, and history-aware actions in src/components/entity-list.js
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
5. Add US4 → validate traceability/counts/adjustments
6. Add US5 → validate KPIs/alerts/replenishment
7. Finish with Phase 8 polish and full quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1/US2 domain and storage-heavy tasks
   - Developer B: UI components for active story
   - Developer C: tests and integration wiring for active story
3. Merge by story checkpoints to preserve independent testability

## Notes

- `[P]` tasks must touch different files and have no dependency on incomplete work
- `[US#]` labels provide traceability from tasks to spec user stories
- Keep domain rules (uniqueness, stock effects, immutability, history preservation) centralized in `src/storage.js`
- Ensure `costo_unitario` is never an input in movement forms and role simulation remains visual-only (no real auth/permissions)
- Stop at each checkpoint to validate the story independently before proceeding
