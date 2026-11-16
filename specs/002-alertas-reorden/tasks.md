# Tareas: 002-alertas-reorden (HU1 MVP)

- [ ] T001 [P] [US1] Implementar `getReorderAlerts(category?)` derivado en `src/storage.js` (filtro `< punto_reorden`, excluye sin punto, orden faltante desc/nombre)
- [ ] T002 [US1] Usar `getReorderAlerts` para `critical` en `getDashboardStats` en `src/storage.js`
- [ ] T003 [US1] Agregar sección "Alertas de reposición" (tabla + estado vacío) en `src/components/dashboard.js`
- [ ] T004 [P] [US1] Añadir pruebas de integración HU1 en `tests/integration/reorder-alerts.test.js` y ajustar `tests/integration/dashboard.test.js` si aplica
- [ ] T005 [US1] Verificar con `npm run lint && npm run test:run && npm run build`
