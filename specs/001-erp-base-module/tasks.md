---
description: "Task list for feature implementation: Módulo Base ERP — Logística e Inventario"
---

# Tasks: Módulo Base ERP — Logística e Inventario

**Input**: Design documents from `/specs/001-erp-base-module/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because Constitution Principle II requires automated tests for user-visible behavior and business logic. Write tests before or alongside implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. The plan of 2026-11-17 keeps HU1–HU5 as native scope, folds transfer into the inventory model, retracts role-based permissions (FR-047) and defers the Compras/Ventas integration (FR-046). This list maps every spec story to a phase: US1–US9 and US11 are actionable; US10 is deferred and generates no phase.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]`..`[US11]`) for story-phase tasks only
- Every task includes an exact file path
- `[X]` = already implemented and covered by passing tests (82 tests green at generation time); `[ ]` = pending

## Story Traceability

| Spec story | Phase | Priority | Status |
|------------|-------|----------|--------|
| US1 Catálogo maestro | Phase 3 | P1 | Implemented; provider/RUT pending |
| US2 Recepción con ubicación | Phase 4 | P1 | Implemented; doc_respaldo/solicitud de alta pending |
| US3 Despacho con validación | Phase 5 | P1 | Implemented; FIFO suggestion pending |
| US4 Kardex e historial | Phase 6 | P1 | Implemented; period opening balance pending |
| US5 Panel y alertas de reposición | Phase 7 | P2 | Implemented |
| US6 Conteo físico y ajuste | Phase 8 | P2 | Implemented |
| US7 Panel de indicadores | Phase 9 | P2 | Partially implemented; coverage/period filter pending |
| US8 Transferencia entre ubicaciones | Phase 10 | P2 | Implemented |
| US9 Roles, datos sensibles y auditoría | Phase 11 | P3 | Roles retracted; audit view pending |
| US10 Integración Compras/Ventas | Deferred | P3 | Out of scope (FR-046) |
| US11 Terminología configurable | Phase 13 | P3 | Implemented |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure and tooling.

- [X] T001 Create project structure per implementation plan in `index.html`, `src/`, `src/components/`, `tests/unit/` and `tests/integration/`
- [X] T002 Initialize Vite project with `dev`, `build`, `preview`, `test`, `test:run`, `lint`, `format` and `format:check` scripts in `package.json`
- [X] T003 [P] Configure Vitest + jsdom environment and setup file in `vitest.config.mjs`
- [X] T004 [P] Configure ESLint and Prettier in `eslint.config.js`, `.prettierrc` and `.prettierignore`
- [X] T005 [P] Create base HTML shell and application mount point in `index.html`
- [X] T006 [P] Create design tokens, workspace layout, form, table and feedback styles in `src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story implementation.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement storage keys (`erp.entities`, `erp.movements` with legacy `erp.documents` migration, `erp.counts`, `erp.replenishmentRequests`, `erp.persons`, `erp.audit`), load/save helpers, id/timestamp utilities and safe `localStorage` access in `src/storage.js`
- [X] T008 Implement module configuration loading, defaults, validation, fallback and error reporting in `src/module-config.js`
- [X] T009 [P] Implement shared DOM utilities (safe node creation, text rendering, clearing and focus helpers) in `src/components/dom.js`
- [X] T010 [P] Implement workspace shell (top bar, derived SVG monogram, sidebar navigation, active state, responsive collapse) with no role selector in `src/components/shell.js`
- [X] T011 [P] Implement local-person selector and `getPersons`/`savePersons`/`addPerson` wiring for audit and approvals in `src/components/person-selector.js` and `src/app.js`
- [X] T012 Implement app bootstrap, view routing/state coordination (Panel, Gestión, Búsqueda) and configuration error surfacing in `src/main.js` and `src/app.js`
- [X] T013 [P] Create test setup/reset utilities for isolated `localStorage` state in `tests/setup.js`, `tests/helpers.js` and `vitest.config.mjs`
- [X] T014 [P] Add foundational unit tests for configuration defaults/validation, storage primitives and person persistence in `tests/unit/module-config.test.js` and `tests/unit/storage.test.js`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Catálogo maestro de productos y proveedores (Priority: P1) - MVP

**Goal**: Gestionar entidades maestras con campos obligatorios, SKU único normalizado, eliminación/desactivación según historial y auditoría con persona local.

**Independent Test**: Crear el producto "Resma papel carta 75 g" (`PAP-CAR-075`, categoría Papelería, unidad Paquete, punto de reorden 20, costo $3.200) y verlo en el listado con stock 0 y auditoría; rechazar el SKU duplicado y valores negativos; bloquear la eliminación con historial y permitir solo la desactivación.

### Tests for User Story 1

- [X] T015 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, delete-vs-deactivate and audit recording in `tests/unit/storage.test.js`
- [X] T016 [P] [US1] Add integration test for entity create/edit flows, validation feedback and audit trail in `tests/integration/create-entity.test.js`
- [X] T017 [P] [US1] Add integration test for delete/deactivate behavior with and without history in `tests/integration/edit-delete-entity.test.js`
- [ ] T018 [P] [US1] Add unit tests for provider master data and Chilean RUT format/check-digit validation in `tests/unit/storage.test.js`

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement entity helpers, required-field validation, SKU uniqueness, initial stock and audit writes in `src/storage.js`
- [X] T020 [P] [US1] Implement entity list/detail rendering with safe output, empty states and history-aware actions in `src/components/entity-list.js`
- [X] T021 [US1] Implement entity create/edit/deactivate form with custom fields and inline validation in `src/components/entity-form.js`
- [X] T022 [US1] Wire entity CRUD/deactivate flows, audit entries and the current local person into app state/views in `src/app.js`
- [X] T023 [US1] Keep `costo_unitario` editable only in entity/catalog contexts and render valuation only in panel/catalog in `src/components/entity-form.js` and `src/components/entity-list.js`
- [ ] T024 [US1] Implement `Proveedor` master record (`rut`, `razon_social`, `contacto`) with RUT validation and product linkage in `src/storage.js` and `src/components/entity-form.js`

**Checkpoint**: US1 independently functional and testable.

---

## Phase 4: User Story 2 - Recepción con ubicación en bodega (Priority: P1)

**Goal**: Registrar entradas indicando producto, cantidad y ubicación (pasillo-estante-nivel), actualizando el stock de forma atómica y permitiendo cancelar sin efectos.

**Independent Test**: Registrar una entrada de 50 paquetes de `PAP-CAR-075` en la ubicación `A-03-2`; verificar que el stock total pasa de 0 a 50 y que `A-03-2` muestra 50; cancelar a mitad del ingreso y comprobar que no se genera documento ni cambia el stock.

### Tests for User Story 2

- [X] T025 [P] [US2] Add unit tests for `ENTRADA` validation, location requirements, stock effects and latest-location derivation in `tests/unit/stock.test.js`
- [X] T026 [P] [US2] Add integration test for entry registration, location capture and cancel-without-persist in `tests/integration/inventory-movements.test.js`
- [ ] T027 [P] [US2] Add unit tests for backing-document and provider validation on entry in `tests/unit/stock.test.js`

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement movement persistence for `ENTRADA` draft/confirmed states with `location`, `actorPerson` and timestamps in `src/storage.js`
- [X] T029 [P] [US2] Implement entry form UI with product search, quantity and aisle/shelf/level location in `src/components/document-form.js`
- [X] T030 [US2] Implement movement list rendering for entity movements in `src/components/document-list.js`
- [X] T031 [US2] Integrate entry confirmation, atomic stock updates, latest-location derivation (FR-041) and cancel handling in `src/app.js` and `src/storage.js`
- [ ] T032 [US2] Add backing-document (`doc_respaldo`) and provider fields to the entry form and persistence in `src/components/document-form.js` and `src/storage.js`
- [ ] T033 [US2] Implement the "solicitud de alta" flow so an operator can request creation of a missing product without creating it in `src/components/document-form.js` and `src/storage.js`

**Checkpoint**: US2 independently functional (with foundational + US1 entity data available).

---

## Phase 5: User Story 3 - Despacho con validación de stock (Priority: P1)

**Goal**: Registrar salidas con validación de existencias, motivo obligatorio cuando aplica y bloqueo de stock negativo.

**Independent Test**: Con 50 unidades en `A-03-2`, intentar despachar 60 y comprobar el bloqueo; despachar 30 y verificar que el stock baja a 20 y se genera `SAL-000045`; seleccionar Merma y comprobar que se exige observación.

### Tests for User Story 3

- [X] T034 [P] [US3] Add unit tests for `SALIDA` stock validation, insufficient-stock rejection and reorder-threshold signals in `tests/unit/stock.test.js`
- [X] T035 [P] [US3] Add integration test for outbound flow, insufficient-stock blocking, merma-note rule and valid confirmation in `tests/integration/inventory-movements.test.js`
- [ ] T036 [P] [US3] Add unit tests for FIFO location suggestion based on the oldest confirmed entry in `tests/unit/stock.test.js`

### Implementation for User Story 3

- [X] T037 [P] [US3] Extend the movement model with `SALIDA` reasons, merma note requirement and confirm-time stock checks in `src/storage.js`
- [X] T038 [US3] Extend the movement form UI for `SALIDA` with available stock/location info, reason/notes and disabled confirm on invalid input in `src/components/document-form.js`
- [X] T039 [US3] Integrate outbound confirmation and low-stock alert signaling for downstream dashboard use in `src/app.js` and `src/storage.js`
- [ ] T040 [US3] Implement FIFO location suggestion (oldest confirmed entry) in the movement form and storage query in `src/storage.js` and `src/components/document-form.js`

**Checkpoint**: US3 independently functional for outbound scenarios.

---

## Phase 6: User Story 4 - Kardex e historial de movimientos (Priority: P1)

**Goal**: Proveer trazabilidad completa del producto con kardex cronológico filtrable, inmutabilidad de documentos confirmados y corrección mediante anulación con contramovimiento enlazado.

**Independent Test**: Abrir el kardex de `PAP-CAR-075` y ver `ENT-000123 +50` (saldo 50) y `SAL-000045 -30` (saldo 20); filtrar por fecha/tipo y comprobar el recálculo; anular un documento y verificar el contramovimiento enlazado; intentar editar un confirmado y comprobar el bloqueo.

### Tests for User Story 4

- [X] T041 [P] [US4] Add unit tests for chronological kardex ordering, accumulated balance and date/type filters in `tests/unit/storage.test.js`
- [X] T042 [P] [US4] Add unit tests for confirmed-document immutability, void rejection and countermovement linkage with reason and stock reversal in `tests/unit/stock.test.js`
- [X] T043 [P] [US4] Add integration test for `PAP-CAR-075` kardex rows, filter recalculation, void flow and blocked edit in `tests/integration/inventory-movements.test.js`
- [ ] T044 [P] [US4] Add unit tests for period opening balance calculation in `tests/unit/storage.test.js`

### Implementation for User Story 4

- [X] T045 [US4] Implement deterministic kardex ordering and accumulated balance calculation in `src/storage.js`
- [X] T046 [US4] Enforce immutability of confirmed documents and complete linked void/countermovement behavior with motive in `src/storage.js`
- [X] T047 [US4] Render kardex with document, type, quantity, balance, location and person columns plus date/type filters and void feedback in `src/components/document-list.js` and `src/app.js`
- [ ] T048 [US4] Calculate and display the period opening balance when date/type filters are applied in `src/storage.js` and `src/components/document-list.js`

**Checkpoint**: US4 independently functional for traceability and controlled corrections.

---

## Phase 7: User Story 5 - Panel de inventario y alertas de reposición (Priority: P2)

**Goal**: Mostrar KPIs y alertas de reposición accionables, con filtro por categoría y generación de solicitudes agrupadas por proveedor.

**Independent Test**: Ver KPIs recalculados por categoría; listar alertas con cantidad sugerida editable; generar una solicitud agrupada por proveedor; comprobar que "Limpiar filtros" restaura la vista global.

### Tests for User Story 5

- [X] T049 [P] [US5] Add unit tests for dashboard KPI calculations, alert classification and replenishment suggestion logic in `tests/unit/storage.test.js`
- [X] T050 [P] [US5] Add integration test for dashboard rendering, category filters/clear behavior and replenishment request generation in `tests/integration/dashboard.test.js`

### Implementation for User Story 5

- [X] T051 [P] [US5] Implement dashboard stats, alert/replenishment queries and request persistence in `src/storage.js`
- [X] T052 [US5] Implement dashboard UI with quick actions, KPI cards, alert table, category filters, clear filters and empty states in `src/components/dashboard.js`
- [X] T053 [US5] Integrate replenishment creation/grouping by provider and dashboard refresh on navigation in `src/app.js`
- [X] T054 [US5] Implement search screen access paths (sidebar and dashboard quick action) with safe rendering and empty states in `src/components/search-bar.js` and `src/app.js`
- [X] T055 [US5] Recalculate dashboard metrics and the alert table when a category filter is applied in `src/components/dashboard.js` and `src/storage.js`

**Checkpoint**: US5 independently functional using persisted inventory data.

---

## Phase 8: User Story 6 - Conteo físico y ajuste de inventario (Priority: P2)

**Goal**: Registrar conteos ciegos por ubicación, calcular diferencias y aprobar ajustes con motivo y separación de funciones.

**Independent Test**: Con 15 unidades en `A-03-2`, contar 13 sin ver el stock del sistema, cerrar el conteo, generar un ajuste pendiente y aprobarlo con otra persona y motivo "Daño por humedad"; verificar stock 13 y el `AJUSTE` en el kardex.

### Tests for User Story 6

- [X] T056 [P] [US6] Add unit tests for blind count capture, difference calculation and adjustment approval separation of duties in `tests/unit/storage.test.js`
- [X] T057 [P] [US6] Add integration test for physical count flow, adjustment approval and `AJUSTE` kardex entry in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 6

- [X] T058 [P] [US6] Implement physical count persistence (open/closed states, details and system quantity captured at close) in `src/storage.js`
- [X] T059 [US6] Implement blind count UI (hidden system quantities) and close-count difference display in `src/app.js`
- [X] T060 [US6] Implement adjustment approval with mandatory reason and an approver different from the counter in `src/storage.js` and `src/app.js`
- [X] T061 [US6] Register approved adjustments as `AJUSTE` movements and show them in the kardex in `src/storage.js` and `src/components/document-list.js`

**Checkpoint**: US6 independently functional for controlled stock corrections.

---

## Phase 9: User Story 7 - Panel de indicadores de inventario (Priority: P2)

**Goal**: Consolidar KPIs de cantidades y valorización, rotación, cobertura y filtros por categoría y período.

**Independent Test**: Abrir el panel y ver los KPIs globales; filtrar por "Papelería" y comprobar que todos los KPIs y la tabla se recalculan; verificar "Datos insuficientes" con menos de 30 días de historial; aplicar un rango de fechas y comprobar el recálculo.

### Tests for User Story 7

- [X] T062 [P] [US7] Add unit tests for valuation, rotation label and insufficient-history handling in `tests/unit/storage.test.js`
- [X] T063 [P] [US7] Add integration test for panel KPIs and category filter recalculation in `tests/integration/dashboard.test.js`
- [ ] T064 [P] [US7] Add unit tests for days-of-coverage calculation and period filter in `tests/unit/storage.test.js`

### Implementation for User Story 7

- [X] T065 [P] [US7] Implement KPI calculations: active products, valuation `Σ(stock × unitCost)`, alerts and products without movement in 90 days in `src/storage.js`
- [X] T066 [US7] Implement rotation label and "Datos insuficientes" for products with less than 30 days of history in `src/storage.js` and `src/components/dashboard.js`
- [ ] T067 [US7] Implement days-of-coverage calculation (stock / average daily consumption) and display per product in `src/storage.js` and `src/components/dashboard.js`
- [ ] T068 [US7] Add a period (date range) filter that recalculates all KPI cards and the table, keeping the active filter visible in `src/components/dashboard.js` and `src/storage.js`

**Checkpoint**: US7 independently functional for consolidated indicators.

---

## Phase 10: User Story 8 - Transferencia entre ubicaciones (Priority: P2)

**Goal**: Mover stock entre ubicaciones sin generar una salida y una entrada falsas, conservando el total y la trazabilidad.

**Independent Test**: Transferir 10 unidades de `A-03-2` a `B-01-1` y comprobar que el origen baja 10, el destino sube 10 y el total no cambia; bloquear si la cantidad supera el origen o si origen = destino; verificar la `TRANSFERENCIA` en el kardex.

### Tests for User Story 8

- [X] T069 [P] [US8] Add unit tests for `TRANSFERENCIA` origin/destination validation, total-invariance and insufficient-origin rejection in `tests/unit/stock.test.js`
- [X] T070 [P] [US8] Add integration test for transfer flow, cancel-without-persist and kardex entry in `tests/integration/inventory-movements.test.js`

### Implementation for User Story 8

- [X] T071 [P] [US8] Implement `TRANSFERENCIA` persistence and atomic origin/destination stock effects in `src/storage.js`
- [X] T072 [US8] Implement transfer UI with origin and destination location selectors and same-location blocking in `src/components/document-form.js`
- [X] T073 [US8] Render `TRANSFERENCIA` in the kardex with origin and destination in `src/components/document-list.js` and `src/app.js`

**Checkpoint**: US8 independently functional for warehouse reordering.

---

## Phase 11: User Story 9 - Roles, datos sensibles y auditoría (Priority: P3)

**Goal**: Mantener auditoría completa con persona local y documentar que los roles son etiquetas descriptivas sin autenticación, permisos ni visibilidad condicionada (FR-047).

**Independent Test**: Revisar la auditoría tras crear, editar, desactivar y anular, comprobando persona, acción, fecha y detalle; verificar que no existe selector de rol ni ocultación de costos/contactos por rol; comprobar que la persona del selector local queda registrada en movimientos y aprobaciones.

### Tests for User Story 9

- [X] T074 [P] [US9] Add unit tests for audit payload construction (person, action, entity, timestamp and details) in `tests/unit/storage.test.js`
- [ ] T075 [P] [US9] Add integration test for audit trail recording and retrieval across entity and document operations in `tests/integration/security-persistence.test.js`

### Implementation for User Story 9

- [X] T076 [P] [US9] Implement audit recording for entity create/update/deactivate/delete operations in `src/storage.js`
- [X] T077 [P] [US9] Implement the local-person selector used for audit, movement actor and adjustment approval without granting permissions in `src/components/person-selector.js` and `src/app.js`
- [ ] T078 [US9] Document that roles are descriptive only (no login, permissions, role selector or role-based visibility) per FR-047 and remove contradictory role-simulation text in `README.md` and `specs/001-erp-base-module/quickstart.md`
- [ ] T079 [US9] Implement an audit log view with user/action/entity/date filters and before/after details in `src/components/audit-log.js`, `src/components/shell.js` and `src/app.js`
- [ ] T080 [US9] Extend audit records to document void and adjustment approval with before/after values in `src/storage.js`

**Checkpoint**: US9 independently functional for audit review and local identity.

---

## Phase 12: User Story 10 - Integración con Compras y Ventas (Priority: P3) - DEFERRED

**Status**: Deferred by plan/research (FR-046). No tasks are generated for this version. The integration points (`orden_compra_id`, `pedido_venta_id`, "Despachos pendientes" and "Solicitud enviada") must be added later without changing the core storage contract.

**Out of scope**: `SolicitudReposicion` state "Enviada", purchase-order preloading, partial reception and sales-order dispatch status.

---

## Phase 13: User Story 11 - Terminología configurable del módulo (Priority: P3)

**Goal**: Reetiquetar módulo, navegación, formularios, tablas y mensajes desde `src/module-config.js`, sin modificar el código de las pantallas.

**Independent Test**: Configurar "Logística e Inventario" y el mapeo Entidad → "Producto" y Documento → "Movimiento de Inventario"; verificar que botones, formularios, tablas y mensajes usan esos términos; retirar el mapeo y comprobar el fallback a los términos base.

### Tests for User Story 11

- [X] T081 [P] [US11] Add unit tests for configuration defaults, validation, custom fields and accent fallback in `tests/unit/module-config.test.js`
- [X] T082 [P] [US11] Add integration test for relabeling and custom-field rendering across screens in `tests/integration/relabeling.test.js`

### Implementation for User Story 11

- [X] T083 [P] [US11] Implement the `userConfig` contract with `moduleName`, `labels`, `customFields`, `statusLifecycle` and `theme.accentColor` in `src/module-config.js`
- [X] T084 [US11] Apply config-driven module name, monogram, accent color and navigation labels in `src/components/shell.js` and `src/app.js`
- [X] T085 [US11] Render custom fields in entity/document forms, lists and search with type-aware controls and validation in `src/components/entity-form.js`, `src/components/entity-list.js`, `src/components/search-bar.js` and `src/storage.js`
- [X] T086 [US11] Enforce configured `statusLifecycle` transitions on documents in `src/storage.js` and `src/components/document-form.js`
- [X] T087 [US11] Ensure safe fallback to base Entity/Document terminology when no mapping is provided in `src/module-config.js` and `src/components/shell.js`

**Checkpoint**: US11 independently functional for module adaptation.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, consistency, accessibility, performance and validation across stories.

- [X] T088 [P] Apply consistent config-driven relabeling and safe fallbacks across all screens in `src/components/shell.js`, `src/components/dashboard.js`, `src/components/entity-form.js`, `src/components/document-form.js`, `src/components/document-list.js` and `src/components/search-bar.js`
- [X] T089 [P] Verify XSS-safe rendering and escaping for all user-provided data in `src/components/` and `src/components/dom.js`
- [X] T090 [P] Verify accessibility and responsive behavior (labels, focus, keyboard navigation, `aria-current`, collapsed sidebar) in `src/components/` and `src/styles.css`
- [X] T091 [P] Validate list/search performance with at least 500 entities and optimize hot paths in `src/storage.js` and `src/app.js`
- [ ] T092 [P] Reconcile documentation with the no-role decision and the implemented scope in `README.md` and `specs/001-erp-base-module/quickstart.md`
- [X] T093 Run quickstart validation scenarios (HU1–HU5) and record results in `specs/001-erp-base-module/quickstart.md`
- [X] T094 [P] Update developer documentation for setup, configuration and extension points in `README.md` and `specs/001-erp-base-module/quickstart.md`
- [ ] T095 [P] Add the pending tests for provider RUT, `doc_respaldo`, FIFO, opening balance, coverage and audit view in `tests/unit/` and `tests/integration/`
- [ ] T096 Run `npm run lint`, `npm run format:check`, `npm run test:run` and `npm run build` after the pending tasks and record the results in `specs/001-erp-base-module/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phases 3–13 (User Stories)**: Depend on Phase 2 completion
  - Recommended priority order: **US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → US9 → US11**
  - US5 and US7 share the dashboard component but have independent test criteria (alerts/replenishment vs. valuation/rotation/coverage)
  - US6 depends functionally on stock/movements from US2–US3 but must remain independently testable with seeded fixtures
  - US8 depends functionally on the movement model from US2 but must remain independently testable
  - US9 depends functionally on entity/document/audit hooks but must remain independently testable with seeded fixtures
- **Phase 14 (Polish)**: Depends on the desired user stories being complete
- **US10 (Deferred)**: No tasks; out of scope

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories
- **US2 (P1)**: Starts after Foundational; uses entities from US1 flows/data
- **US3 (P1)**: Starts after Foundational; extends the movement/stock domain from US2
- **US4 (P1)**: Starts after Foundational; builds on the movement history/confirmation model from US2–US3
- **US5 (P2)**: Starts after Foundational; consumes stock/movement/alert data for KPIs and replenishment
- **US6 (P2)**: Starts after Foundational; consumes stock and movement history for counts and adjustments
- **US7 (P2)**: Starts after Foundational; consumes stock, cost and movement history for indicators
- **US8 (P2)**: Starts after Foundational; uses the movement model and location balances
- **US9 (P3)**: Starts after Foundational; consumes entity/document/audit data and the local-person selector
- **US11 (P3)**: Starts after Foundational; consumes configuration across all screens

### Within Each User Story

- Write/prepare tests for the story and verify failure where applicable before implementation completes
- Domain/storage rules before UI wiring
- UI components before final app integration
- Validate the story independently at its checkpoint before moving on

### Parallel Opportunities

- Setup: `T003`, `T004`, `T005` and `T006` can run in parallel
- Foundational: `T009`, `T010`, `T011`, `T013` and `T014` can run in parallel after core storage/config exist
- US1: `T015`, `T016`, `T017`, `T018`, `T019` and `T020` can run in parallel; `T021` follows the form/data contracts; `T024` follows `T019`
- US2: `T025`, `T026`, `T027`, `T028` and `T029` can run in parallel; `T032` and `T033` follow `T028`
- US3: `T034`, `T035`, `T036` and `T037` can run in parallel; `T040` follows `T037`
- US4: `T041`, `T042`, `T043` and `T044` can run in parallel; `T045` and `T046` touch `src/storage.js` and must run sequentially; `T047` follows both; `T048` follows `T045`
- US5: `T049`, `T050` and `T051` can run in parallel; `T052` follows `T051`
- US6: `T056`, `T057` and `T058` can run in parallel; `T059` and `T060` follow `T058`
- US7: `T062`, `T063`, `T064` and `T065` can run in parallel; `T067` and `T068` follow `T065`
- US8: `T069`, `T070` and `T071` can run in parallel; `T072` follows `T071`
- US9: `T074`, `T075`, `T076`, `T077` and `T079` can run in parallel; `T080` follows `T076`
- US11: `T081`, `T082`, `T083` and `T087` can run in parallel; `T084` and `T085` follow `T083`
- Polish: `T088`, `T089`, `T090`, `T091`, `T092`, `T094` and `T095` can run in parallel; `T096` runs after all pending tasks complete

## Parallel Example: User Story 1

```text
- [X] T015 [P] [US1] Add unit tests for entity validation, SKU normalization/uniqueness, delete-vs-deactivate and audit recording in `tests/unit/storage.test.js`
- [X] T016 [P] [US1] Add integration test for entity create/edit flows, validation feedback and audit trail in `tests/integration/create-entity.test.js`
- [X] T017 [P] [US1] Add integration test for delete/deactivate behavior with and without history in `tests/integration/edit-delete-entity.test.js`
- [X] T020 [P] [US1] Implement entity list/detail rendering with safe output, empty states and history-aware actions in `src/components/entity-list.js`
```

## Parallel Example: User Story 4

```text
- [X] T041 [P] [US4] Add unit tests for chronological kardex ordering, accumulated balance and date/type filters in `tests/unit/storage.test.js`
- [X] T042 [P] [US4] Add unit tests for confirmed-document immutability, void rejection and countermovement linkage with reason and stock reversal in `tests/unit/stock.test.js`
- [X] T043 [P] [US4] Add integration test for PAP-CAR-075 kardex rows, filter recalculation, void flow and blocked edit in `tests/integration/inventory-movements.test.js`
- [ ] T044 [P] [US4] Add unit tests for period opening balance calculation in `tests/unit/storage.test.js`
```

## Parallel Example: User Story 8

```text
- [X] T069 [P] [US8] Add unit tests for TRANSFERENCIA origin/destination validation, total-invariance and insufficient-origin rejection in `tests/unit/stock.test.js`
- [X] T070 [P] [US8] Add integration test for transfer flow, cancel-without-persist and kardex entry in `tests/integration/inventory-movements.test.js`
- [X] T071 [P] [US8] Implement TRANSFERENCIA persistence and atomic origin/destination stock effects in `src/storage.js`
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. Stop and validate US1 independently (quickstart HU1)
5. Demo/deploy-ready MVP slice

### Incremental Delivery

1. Setup + Foundational → base ready
2. Add US1 → validate catalog, uniqueness, deletion/deactivation and audit (MVP)
3. Add US2 → validate entries and location capture
4. Add US3 → validate outbound controls and low-stock signals
5. Add US4 → validate kardex, immutability and void corrections
6. Add US5 → validate KPIs, alerts and replenishment requests
7. Add US6 → validate blind counts and approved adjustments
8. Add US7 → validate consolidated indicators and period filters
9. Add US8 → validate transfers without changing total stock
10. Add US9 → validate audit review and the no-role decision
11. Add US11 → validate config-driven relabeling and custom fields
12. Finish with Phase 14 polish and full quickstart validation

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
- `costo_unitario` must never be an input in movement forms; costs and valuation are shown only in the panel and catalog (FR-044)
- There is no role selector, login or role-based visibility (FR-047); the local-person selector only identifies the actor in audit records, movements and approvals (FR-049)
- US10 (Compras/Ventas) is deferred (FR-046) and must not add `orden_compra_id`/`pedido_venta_id` in this version
- Stop at each checkpoint to validate the story independently before proceeding
