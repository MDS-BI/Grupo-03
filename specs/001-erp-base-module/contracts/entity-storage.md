# Contrato de Almacenamiento de Entidades y Documentos

**Feature**: `001-erp-base-module` | **Modelo**: [data-model.md](../data-model.md) | **Fecha**: 2026-11-10

## Propósito

Definir la forma de los datos y las operaciones de persistencia que `src/storage.js` expone a la UI. El almacenamiento usa `localStorage` del navegador en un único espacio de trabajo.

## Claves de almacenamiento

| Clave | Contenido |
|-------|-----------|
| `erp.entities` | Arreglo JSON de entidades |
| `erp.documents` | Arreglo JSON de documentos |

## Forma de una Entidad

```json
{
  "entity_id": "ent_01H...",
  "name": "Caja de tornillos 5 mm",
  "code": "TOR-005",
  "category": "Ferretería",
  "description": "Tornillos de acero",
  "targetDate": "2026-12-31",
  "unitOfMeasure": "Cajas",
  "reorderPoint": 20,
  "unitCost": 1500,
  "stockBalance": 100,
  "customFields": {
    "sku": "TOR-005",
    "punto_reorden": 20,
    "unidad_medida": "Cajas"
  },
  "createdAt": "2026-11-10T12:00:00.000Z",
  "updatedAt": "2026-11-10T12:00:00.000Z"
}
```

Reglas:
- `entity_id`, `createdAt` y `updatedAt` los genera la capa de almacenamiento.
- `name`, `code` y `category` son obligatorios y no vacíos.
- `stockBalance` inicia en `0` y nunca puede ser negativo.
- `reorderPoint` y `unitCost`, si existen, son números ≥ 0.
- `targetDate`, si existe, es una fecha de calendario válida (`YYYY-MM-DD`).
- Los campos personalizados se validan según [module-config.md](./module-config.md).

## Forma de un Documento

```json
{
  "document_id": "doc_01H...",
  "entity_id": "ent_01H...",
  "type": "ENTRADA",
  "quantity": 100,
  "aisle": "A",
  "shelf": "3",
  "level": "2",
  "notes": "Recepción de proveedor",
  "status": "Completado",
  "createdAt": "2026-11-10T12:05:00.000Z"
}
```

Reglas:
- `document_id` y `createdAt` los genera la capa de almacenamiento.
- `entity_id` debe existir; si no, se rechaza el guardado.
- `type` es `ENTRADA` o `SALIDA`.
- `quantity` es un entero > 0.
- `ENTRADA` exige `aisle`, `shelf` y `level` no vacíos.
- `SALIDA` no usa campos de ubicación.
- No existen `startDate` ni `endDate`.
- Una `SALIDA` con `quantity > stockBalance` se rechaza.

## Operaciones de Entidades

| Operación | Firma | Contrato |
|-----------|-------|----------|
| `loadEntities()` | `() => Entity[]` | Devuelve todas las entidades; arreglo vacío si no hay datos o el JSON es inválido |
| `saveEntities(entities)` | `(Entity[]) => void` | Persiste la lista completa preservando el orden |
| `addEntity(input)` | `(EntityInput) => Entity` | Genera identidad y marcas de tiempo; valida; persiste |
| `updateEntity(entityId, updates)` | `(string, Partial<Entity>) => Entity` | Actualiza y refresca `updatedAt`; valida |
| `deleteEntity(entityId)` | `(string) => void` | Elimina la entidad y sus documentos en cascada |

## Operaciones de Documentos

| Operación | Firma | Contrato |
|-----------|-------|----------|
| `loadDocuments()` | `() => Document[]` | Devuelve todos los documentos |
| `saveDocuments(documents)` | `(Document[]) => void` | Persiste la lista completa |
| `addDocument(input)` | `(DocumentInput) => Document` | Valida, genera identidad/tiempo y aplica el efecto de stock |
| `updateDocument(documentId, updates)` | `(string, Partial<Document>) => Document` | Valida y ajusta el stock por la diferencia |
| `deleteDocument(documentId)` | `(string) => void` | Elimina y revierte el efecto de stock |
| `deleteDocumentsForEntity(entityId)` | `(string) => void` | Elimina todos los documentos de una entidad |

## Operaciones de Consulta

| Operación | Firma | Contrato |
|-----------|-------|----------|
| `searchEntities(term, category?)` | `(string, string?) => Entity[]` | Busca por nombre, código, categoría, descripción y campos personalizados; vacío devuelve todo |
| `getLatestLocation(entityId)` | `(string) => Location \| null` | Deriva la ubicación del documento `ENTRADA` más reciente |
| `getDashboardStats(category?)` | `(string?) => Stats` | Devuelve conteo, valoración y críticos, opcionalmente filtrados por categoría |

## Validación

- Una entidad sin `name`, `code` o `category` se rechaza antes de persistir.
- Un campo personalizado obligatorio vacío o con tipo inválido se rechaza.
- Un documento sin `entity_id` válido se rechaza.
- Un documento `ENTRADA` sin ubicación completa se rechaza.
- Una `SALIDA` con cantidad superior al stock se rechaza.
- Un `status` fuera del ciclo configurado se rechaza.
- Eliminar una entidad elimina todos sus documentos.
- Las operaciones preservan el orden de la lista salvo que el llamador lo cambie explícitamente.

## Extensibilidad

- Los campos adicionales de módulos personalizados se persisten junto a los campos base sin manejo especial.
- Las firmas anteriores son estables para que los módulos personalizados construyan sobre ellas sin modificar el núcleo.
- La UI nunca accede directamente a `localStorage`; siempre usa estas operaciones.
