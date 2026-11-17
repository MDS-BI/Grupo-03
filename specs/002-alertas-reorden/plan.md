# Plan: Centro de alertas de reposición (HU1 MVP)

## Alcance
Implementar HU1 de `spec.md`: listar en el panel productos con `stock < punto_reorden`, mostrando código, nombre, categoría, stock, punto de reorden y faltante. Sin persistencia nueva ni backend.

## Diseño
- **Lógica derivada (`src/storage.js`)**: `getReorderAlerts(category?)`
  - Fuente: entidades (vía `searchEntities('', category)`), stock desde `stockBalance`.
  - Regla: incluir solo si `reorderPoint` es número finito y `stock < reorderPoint` (cubre `reorderPoint 0` con `stock 0` => no alerta; sin punto de reorden => excluido).
  - Campos: `entity_id, code, name, category, stock, reorderPoint, shortage`.
  - Orden: `shortage` desc, empate por `name` asc (locale `es`).
- **Consistencia KPI**: `getDashboardStats` calcula `critical` con `getReorderAlerts(category).length`.
- **UI (`src/components/dashboard.js`)**: nueva sección "Alertas de reposición" con tabla y estado vacío; respeta filtro de categoría del dashboard. KPI "Nivel crítico" sigue consistente con la lista (FR-008).

## Pruebas
- `tests/integration/reorder-alerts.test.js`: muestra solo bajo umbral, calcula faltante/orden, excluye sin punto de reorden, desaparece tras entrada que repone, estado vacío y filtro por categoría.
- Ajustar `tests/integration/dashboard.test.js` si la UI lo requiere.

## Verificación
`npm run lint && npm run test:run && npm run build`
