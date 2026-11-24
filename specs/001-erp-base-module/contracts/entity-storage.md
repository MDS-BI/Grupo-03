# Contrato de Almacenamiento (Entidades, Movimientos e Inventario)

**Feature**: `001-erp-base-module` | **Modelo**: [../data-model.md](../data-model.md) | **Fecha**: 2026-11-23

## Propósito

Definir la forma de datos y las operaciones de persistencia/reglas de dominio expuestas por `src/storage.js` (o capa equivalente), además del contrato de acceso en `src/auth.js` y la matriz de permisos en `src/roles.js`. Almacenamiento en `localStorage`, espacio de trabajo único. La UI no accede directamente a `localStorage`.

## Claves de almacenamiento (sugeridas)

| Clave | Contenido |
|-------|-----------|
| `erp.entities` | Arreglo JSON de entidades |
| `erp.movements` | Arreglo JSON de movimientos/documentos de inventario |
| `erp.counts` | Arreglo JSON de conteos físicos y detalles |
| `erp.replenishmentRequests` | Arreglo JSON de solicitudes de reposición |
| `erp.persons` | Arreglo JSON de etiquetas de PersonaLocal del selector |
| `erp.audit` | Arreglo JSON de registros de auditoría |
| `erp.auth.users` | Arreglo JSON de perfiles: `{ username, salt, hash, role }` |
| `erp.auth.session` | `{ username, role }` de la sesión activa (fuera de `STORAGE_KEYS`) |

(Los nombres exactos pueden ajustarse en implementación siempre que el contrato lógico se mantenga.)

## Acceso y roles

- `registerUser({ username, password, role })`: valida usuario no vacío/único, contraseña ≥ 4 y `role` perteneciente al catálogo; persiste `{ username, salt, hash, role }`.
- `signIn({ username, password })`: valida credenciales y que el `role` del perfil siga existiendo; guarda `{ username, role }` en `erp.auth.session`.
- `getCurrentUser()` / `getCurrentRole()`: reconstruyen la sesión; sin sesión no se renderiza el módulo.
- `hasPermission(role, permission)`: consulta la matriz de `src/roles.js`; `admin` siempre devuelve permitido.
- Roles válidos: `admin`, `recepcion`, `despacho`, `bodega`, `analista` (ver matriz en [../data-model.md](../data-model.md#27-rol-y-rol_permiso-catálogo-y-matriz-de-acceso)).
- El rol es de presentación: no cifra datos ni reemplaza la autorización de backend (FR-056).

## Entidad

Campos base obligatorios: `name`, `code` (SKU, único global normalizado), `category`, `unit`, `reorderPoint` (≥ 0). Campos base adicionales: `entity_id`, `status` (`active`/`inactive`), `description?`, `targetDate?`, `unitCost?` (≥ 0), `stockBalance` (≥ 0, inicia 0), `customFields`, `createdAt`, `updatedAt`.

Reglas: unicidad de `code`; `stockBalance` solo cambia por movimientos confirmados; sin historial asociado puede eliminarse físicamente, con historial solo desactivación; toda creación/edición/desactivación escribe un registro en `erp.audit` con la persona local activa y la fecha (HU1#4, FR-049).

## Movimiento (Documento de inventario)

Campos: `movement_id`, `entity_id`, `type` (`ENTRADA`|`SALIDA`|`TRANSFERENCIA`|`AJUSTE`), `state` (`draft`|`confirmed`|`voided`), `quantity` (> 0), `location` (entrada: `aisle`,`shelf`,`level`), `transfer` (origen/destino), `reason?`, `notes?`, `voidsMovementId?`, `actorPerson` (persona local), `approvedByPerson?` (solo ajustes), `createdAt`, `confirmedAt?`.

Reglas: entrada requiere ubicación completa; salida/transferencia validan stock disponible (al confirmar); transferencia mueve entre ubicaciones sin cambiar total; ajuste con motivo y `approvedByPerson` distinto de la persona del conteo (HU4#4); confirmados inmutables, corrección por anulación con contramovimiento; sin rango de fechas inicial/final. La ubicación actual del producto se deriva de la entrada o transferencia confirmada más reciente (FR-041).

## Conteos y Solicitudes

- **Conteo físico**: captura ciega (sin mostrar cantidad sistema), cierre con diferencias por entidad, ajustes derivados aprobados con persona local distinta a la del conteo (FR-049).
- **Solicitud de reposición**: líneas por entidad con cantidad sugerida editable, estado de solicitud y soporte de agrupación por proveedor.

## Operaciones (contrato lógico)

### Entidades
| Operación | Contrato |
|-----------|----------|
| `loadEntities` / `saveEntities` | Carga/persiste lista completa |
| `addEntity(input)` | Valida obligatorios y unicidad de `code`, genera ids/fechas, `status=active`, `stockBalance=0` |
| `updateEntity(id, updates)` | Valida y actualiza (incluye `unitCost` opcional y custom fields); respeta unicidad de `code` excluyendo la propia entidad |
| `deleteEntity(id)` | Si no hay historial asociado: elimina físicamente. Si hay historial: rechaza eliminación física y/o expone desactivación |
| `deactivateEntity(id)` | Marca `inactive` conservando historial |

### Movimientos
| Operación | Contrato |
|-----------|----------|
| `loadMovements` / `saveMovements` | Carga/persiste lista |
| `addMovement(input)` | Crea borrador o confirma según flujo; al confirmar valida y aplica efecto de stock de forma atómica |
| `confirmMovement(id)` | Valida reglas de tipo/stock/ubicación y aplica stock; pasa a inmutable |
| `updateDraftMovement(id, updates)` | Solo permitido si no está confirmado |
| `cancelDraftMovement(id)` | Cancela/elimina borrador sin afectar stock |
| `voidMovement(id, reason, person)` | Anula movimiento confirmado generando contramovimiento vinculado que revierte el efecto |

### Consultas y dominio
| Operación | Contrato |
|-----------|----------|
| `searchEntities(term, category?)` | Busca por nombre, código, categoría, descripción y campos personalizados |
| `getLatestLocation(entityId)` | Ubicación derivada del movimiento de entrada o transferencia confirmado más reciente (FR-041) |
| `getKardex(entityId, filters?)` | Movimientos cronológicos con saldo/ubicación/persona local, filtrables por fecha y tipo |
| `getDashboardStats(filters?)` | Conteos, valoración `Σ(stock×unitCost)`, alertas por punto de reorden, productos sin movimiento 90 días |
| `getReplenishmentSuggestions(filters?)` | Entidades en alerta con cantidad sugerida |
| `getPersons()` / `savePersons(list)` | Lista de etiquetas del selector local de persona (FR-049) |
| `getAuditTrail(filters?)` | Registros de auditoría por entidad/acción/persona/fecha (HU1#4) |

### Conteos y reposición
Operaciones para crear/cerrar conteos ciegos, registrar diferencias, generar ajustes aprobados y crear solicitudes de reposición con detalle.

## Validación y errores

- Errores descriptivos para: campos obligatorios faltantes, `code` duplicado, `reorderPoint`/`unitCost` inválidos, entidad inexistente, cantidad ≤ 0, ubicación incompleta en entrada, stock insuficiente en salida/transferencia, intento de editar/eliminar confirmado, intento de eliminar entidad con historial, ajuste sin `approvedByPerson` o con la misma persona que contó, registro sin `role`, rol desconocido y acción/vista solicitada sin permiso.
- La UI debe presentar retroalimentación clara y consistente (FR-006).

## Extensibilidad

- Campos personalizados persistidos junto a campos base.
- Firmas/contratos estables para módulos personalizados; la base garantiza identidad, marcas de tiempo e integridad referencial.
