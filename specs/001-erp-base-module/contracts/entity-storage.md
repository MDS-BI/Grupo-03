# Contrato de Almacenamiento (Entidades, Movimientos e Inventario)

**Feature**: `001-erp-base-module` | **Modelo**: [../data-model.md](../data-model.md) | **Fecha**: 2026-11-16

## Propósito

Definir la forma de datos y las operaciones de persistencia/reglas de dominio expuestas por `src/storage.js` (o capa equivalente). Almacenamiento en `localStorage`, espacio de trabajo único. La UI no accede directamente a `localStorage`.

## Claves de almacenamiento (sugeridas)

| Clave | Contenido |
|-------|-----------|
| `erp.entities` | Arreglo JSON de entidades |
| `erp.movements` | Arreglo JSON de movimientos/documentos de inventario |
| `erp.counts` | Arreglo JSON de conteos físicos y detalles |
| `erp.replenishmentRequests` | Arreglo JSON de solicitudes de reposición |

(Los nombres exactos pueden ajustarse en implementación siempre que el contrato lógico se mantenga.)

## Entidad

Campos base obligatorios: `name`, `code` (SKU, único global normalizado), `category`, `unit`, `reorderPoint` (≥ 0). Campos base adicionales: `entity_id`, `status` (`active`/`inactive`), `description?`, `targetDate?`, `unitCost?` (≥ 0), `stockBalance` (≥ 0, inicia 0), `customFields`, `createdAt`, `updatedAt`.

Reglas: unicidad de `code`; `stockBalance` solo cambia por movimientos confirmados; sin historial asociado puede eliminarse físicamente, con historial solo desactivación.

## Movimiento (Documento de inventario)

Campos: `movement_id`, `entity_id`, `type` (`ENTRADA`|`SALIDA`|`TRANSFERENCIA`|`AJUSTE`), `state` (`draft`|`confirmed`|`voided`), `quantity` (> 0), `location` (entrada: `aisle`,`shelf`,`level`), `transfer` (origen/destino), `reason?`, `notes?`, `voidsMovementId?`, `actorLabel?`, `createdAt`, `confirmedAt?`.

Reglas: entrada requiere ubicación completa; salida/transferencia validan stock disponible (al confirmar); transferencia mueve entre ubicaciones sin cambiar total; ajuste con motivo y trazabilidad de aprobación cuando aplique; confirmados inmutables, corrección por anulación con contramovimiento; sin rango de fechas inicial/final.

## Conteos y Solicitudes

- **Conteo físico**: captura ciega (sin mostrar cantidad sistema), cierre con diferencias por entidad, ajustes derivados aprobados con actor distinto al conteo.
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
| `voidMovement(id, reason, actorLabel)` | Anula movimiento confirmado generando contramovimiento vinculado que revierte el efecto |

### Consultas y dominio
| Operación | Contrato |
|-----------|----------|
| `searchEntities(term, category?)` | Busca por nombre, código, categoría, descripción y campos personalizados |
| `getLatestEntryLocation(entityId)` | Ubicación derivada de la entrada confirmada más reciente |
| `getKardex(entityId, filters?)` | Movimientos cronológicos con saldo/ubicación/actor, filtrables por fecha y tipo |
| `getDashboardStats(filters?)` | Conteos, valoración `Σ(stock×unitCost)`, alertas por punto de reorden, productos sin movimiento 90 días |
| `getReplenishmentSuggestions(filters?)` | Entidades en alerta con cantidad sugerida |

### Conteos y reposición
Operaciones para crear/cerrar conteos ciegos, registrar diferencias, generar ajustes aprobados y crear solicitudes de reposición con detalle.

## Validación y errores

- Errores descriptivos para: campos obligatorios faltantes, `code` duplicado, `reorderPoint`/`unitCost` inválidos, entidad inexistente, cantidad ≤ 0, ubicación incompleta en entrada, stock insuficiente en salida/transferencia, intento de editar/eliminar confirmado, intento de eliminar entidad con historial.
- La UI debe presentar retroalimentación clara y consistente (FR-006).

## Extensibilidad

- Campos personalizados persistidos junto a campos base.
- Firmas/contratos estables para módulos personalizados; la base garantiza identidad, marcas de tiempo e integridad referencial.
