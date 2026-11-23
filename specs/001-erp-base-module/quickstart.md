# Quickstart: Validación del Módulo Base ERP — Logística e Inventario

**Feature**: `001-erp-base-module` | **Plan**: [plan.md](./plan.md) | **Modelo**: [data-model.md](./data-model.md) | **Fecha**: 2026-11-17

Guía para ejecutar y validar el módulo de extremo a extremo. Contratos en [contracts/](./contracts/).

## Prerrequisitos

- Node.js 18 o superior, npm, navegador moderno.

## Instalación y ejecución

```bash
npm install
npm run dev
```
Abrir la URL de Vite (por defecto `http://localhost:5173`).

## Pruebas automatizadas

```bash
npm run test:run
npm test        # watch
npm run build
npm run preview
```

## Escenarios de validación

### HU1 — Catálogo maestro, unicidad, eliminación/desactivación y auditoría
1. Seleccionar una persona en el selector local y crear producto con campos obligatorios: nombre, código/SKU, categoría, unidad y punto de reorden (y `costo_unitario` opcional si aplica).
2. **Esperado**: se guarda activo con stock 0 y queda un registro de auditoría con esa persona y la fecha.
3. Intentar crear/editar con SKU duplicado (ignorando mayúsculas/espacios) o con punto de reorden/costo negativo.
4. **Esperado**: guardado bloqueado con mensaje descriptivo.
5. Intentar eliminar un producto con movimientos/historial.
6. **Esperado**: eliminación bloqueada y solo se permite desactivación conservando historial. Si no tiene historial, la eliminación física es posible.
7. Revisar la interfaz en busca de un selector de rol o de una vista que oculte costos/contactos por rol.
8. **Esperado**: no existe selector de rol ni visibilidad condicionada por rol; la persona local solo identifica al actor y los costos/valorización se muestran solo en panel/catálogo (FR-044, FR-047, FR-049).

### HU2 — Recepción (entrada) y transferencia con ubicación
1. Registrar Entrada confirmada con cantidad y ubicación (pasillo-estante-nivel).
2. **Esperado**: stock total y por ubicación aumentan; se registra movimiento con fecha/hora y etiqueta de actor local.
3. Transferir cantidad entre ubicaciones.
4. **Esperado**: origen baja, destino sube, total sin cambio; si excede stock de origen, se bloquea.
5. Intentar guardar sin ubicación/cantidad válida o cancelar a mitad.
6. **Esperado**: bloqueo con mensaje o ningún cambio persistido.

### HU3 — Salida con validación de stock
1. Seleccionar producto con stock y registrar Salida.
2. **Esperado**: se muestra stock por ubicación y sugerencia (p. ej. FIFO); no permite exceder disponible.
3. Confirmar salida válida.
4. **Esperado**: stock disminuye exactamente; si queda ≤ punto de reorden se refleja alerta (HU5). Validación también al confirmar.

### HU4 — Kardex, inmutabilidad, conteo ciego y ajustes
1. Abrir kardex de un producto.
2. **Esperado**: movimientos cronológicos (tipo, documento, cantidad, saldo, ubicación, actor), filtrables por fecha/tipo.
3. Intentar editar/eliminar un movimiento confirmado.
4. **Esperado**: no permitido; corrección vía anulación con contramovimiento vinculado.
5. Realizar conteo físico.
6. **Esperado**: captura ciega (sin cantidad del sistema), diferencias al cerrar; ajuste con motivo obligatorio y aprobación con persona local distinta a la que contó; ajuste aprobado aparece como `AJUSTE`.

### HU5 — Panel, KPIs y solicitudes de reposición
1. Abrir Panel con datos.
2. **Esperado**: KPIs de productos activos, valoración `Σ(stock×unitCost)` (solo panel/catálogo), alertas y productos sin movimiento en 90 días.
3. Ver productos en alerta (stock ≤ punto de reorden).
4. **Esperado**: indicador rojo/amarillo y cantidad sugerida editable; generar solicitud de reposición agrupada por proveedor.
5. Aplicar/limpiar filtros.
6. **Esperado**: KPIs y tabla se recalculan; productos con < 30 días de historial muestran rotación "Datos insuficientes".

## Validación transversal

| Comprobación | Esperado |
|--------------|----------|
| Campos obligatorios entidad (nombre, SKU, categoría, unidad, punto de reorden) | Bloqueo y mensajes claros si faltan |
| SKU único global (normalizado) | Bloqueo en alta/edición duplicada |
| Eliminación con/sin historial | Sin historial: elimina; con historial: solo desactiva |
| Visibilidad por rol | No existe: sin selector de rol ni ocultación de costos/contactos (FR-047) |
| Persona local en auditoría | Toda creación/edición/desactivación registra persona y fecha (FR-049) |
| Aprobación de ajustes | Requiere persona distinta de la del conteo (HU4#4) |
| Movimientos confirmados | Inmutables; corrección por contramovimiento |
| Stock insuficiente (salida/transferencia) | Bloqueado con mensaje |
| Navegación entre pantallas y recarga | Datos intactos en `localStorage` |
| 500 entidades | Listado/búsqueda usables (FR-032) |
| Ventana estrecha | Barra lateral contraíble operable |
| Datos con HTML/scripts | Escapados, sin ejecución (XSS) |
| Configuración inválida | Aviso visible sin fallo silencioso; fallback seguro |

## Extender el módulo base

1. Editar solo `src/module-config.js` (nombre, etiquetas, campos, ciclo de vida, color de acento).
2. **Esperado**: cero modificaciones en código central (SC-008); reglas base de integridad se mantienen.

## Notas de alineación

- Los roles son etiquetas descriptivas: no hay login, permisos, selector de rol ni visibilidad por rol.
- La identidad se elige en un selector local de persona sin contraseña; se registra en auditoría y aprobaciones.
- `costo_unitario` no se ingresa en formularios de movimientos; solo se visualiza en panel/catálogo.
- Ubicación actual del producto: derivada del último documento de entrada o transferencia confirmado.
- La integración con Compras y Ventas (HU10) está fuera de esta versión.


## Resultados de validación (2026-11-22; tareas pendientes completadas)

- `npm run test:run`: **PASS** (13 archivos, 103 pruebas).
- `npm run build`: **PASS** (Vite 8.2.1; 18 módulos transformados; salida en `dist/`).
- `npm run lint`: **PASS** (ESLint sin errores ni advertencias).
- `npm run format:check`: **PASS** (Prettier: todos los archivos cumplen el estilo).
- HU1–HU5 cubiertas por pruebas unitarias/integración y flujos implementados (catálogo, entradas/transferencias/salidas, kardex/inmutabilidad/anulación, conteos/ajustes, panel/alertas/solicitudes de reposición).
- Nuevas coberturas verificadas: proveedor con RUT chileno y vínculo producto-proveedor, `doc_respaldo` y proveedor obligatorios en entradas, solicitud de alta sin crear el producto, sugerencia FIFO, saldo inicial de período en kardex, días de cobertura y filtro de período del panel, y vista de auditoría con filtros y valores antes/después.
- Corrección de fechas: los filtros por rango de fechas usan límites de día en UTC, evitando desfases en zonas horarias con offset negativo (p. ej. `America/Santiago`).
- Clarificaciones aplicadas y verificadas: sin selector de rol ni visibilidad por rol; `TRANSFERENCIA` como tercer tipo de documento con ubicación derivada; persona local para auditoría/aprobaciones con `actorPerson`/`approvedByPerson`; entidades con historial se desactivan conservando documentos; clave canónica `erp.movements` con migración desde `erp.documents`.
- Búsqueda: filtrado por término y categoría con estados vacíos seguros; renderizado sin `innerHTML` con datos de usuario.
- Seguridad XSS: componentes usan creación de nodos/`textContent`; se eliminó el uso de inserción HTML sin sanitizar en utilidades compartidas.
- Accesibilidad/responsivo: navegación con `aria-current`, controles con etiquetas, retroalimentación con `role`/`aria-live` donde aplica, barra lateral colapsable por ancho reducido.
- Rendimiento (500 entidades): búsqueda/listado operan en memoria sobre `localStorage` con filtrado lineal simple; validado con suite automatizada existente (sin bloqueos observables en pruebas de integración de UI).
