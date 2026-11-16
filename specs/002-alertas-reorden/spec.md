# Especificación de la Funcionalidad: Centro de alertas de reposición

**Rama de la funcionalidad**: 002-alertas-reorden

**Creada**: 2026-11-16

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Quiero ver en un solo lugar qué productos están bajo su punto de reorden, con detalle de la brecha de stock y la opción de exportar la lista para gestionar la compra."

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Ver alertas de reposición en el panel (Prioridad: P1) MVP

Como jefe de bodega, quiero ver una lista de productos cuyo stock está por debajo de su punto de reorden, para saber qué reponer primero.

**Por qué esta prioridad**: es el valor central del incremento; sin la lista no hay nada que gestionar.

**Prueba independiente**: crear productos con distintos stock/punto de reorden y verificar que solo aparecen los que están bajo el umbral, ordenados por urgencia.

**Escenarios de aceptación**:

1. **Dado** un producto con stock 3 y punto de reorden 10, **cuando** abro el panel, **entonces** el producto aparece en la lista de alertas indicando stock actual, punto de reorden y cantidad faltante.
2. **Dado** un producto con stock igual o mayor a su punto de reorden, **cuando** abro el panel, **entonces** no aparece en la lista de alertas.
3. **Dado** un nuevo movimiento de Entrada que lleva el stock sobre el punto de reorden, **cuando** vuelvo al panel, **entonces** el producto desaparece de las alertas.

---

### Historia de Usuario 2 - Priorizar y filtrar alertas (Prioridad: P2)

Como jefe de bodega, quiero ordenar las alertas por mayor faltante y filtrar por categoría, para planificar la compra semanal.

**Por qué esta prioridad**: mejora la toma de decisiones una vez que la lista existe.

**Prueba independiente**: con varias alertas de distintas categorías, verificar el orden por faltante descendente y que el filtro de categoría reduzca la lista correctamente.

**Escenarios de aceptación**:

1. **Dado** varias alertas, **cuando** abro la vista, **entonces** aparecen ordenadas por faltante de stock descendente.
2. **Dado** el filtro por categoría activo, **cuando** selecciono "Lácteos", **entonces** solo se muestran alertas de esa categoría.

---

### Historia de Usuario 3 - Exportar alertas a CSV (Prioridad: P3)

Como jefe de bodega, quiero exportar la lista de alertas a CSV, para compartirla con compras o adjuntarla a la solicitud.

**Por qué esta prioridad**: es una conveniencia; la lista en pantalla ya entrega el valor principal.

**Prueba independiente**: descargar el CSV y verificar columnas (código, nombre, categoría, stock actual, punto de reorden, faltante) y que respete el filtro activo.

**Escenarios de aceptación**:

1. **Dado** al menos una alerta, **cuando** pulso "Exportar CSV", **entonces** se descarga un archivo con una fila por alerta y encabezados en español.
2. **Dado** una alerta con punto de reorden 0, **cuando** exporto, **entonces** la fila incluye el faltante correcto o queda fuera si no aplica.

### Casos borde

- ¿Qué pasa si un producto no tiene punto de reorden configurado (null)? No debe generar alerta.
- ¿Qué pasa si el punto de reorden es 0? Stock 0 debe alertar (0 < 0 es falso; se requiere regla explícita).
- ¿Qué pasa si se elimina un producto con alerta activa? La alerta desaparece del listado.
- ¿Qué pasa si dos productos tienen el mismo faltante? Orden secundario estable por nombre.
- ¿Qué pasa si no hay alertas? Se muestra un estado vacío con mensaje claro.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE listar los productos cuyo stock actual sea estrictamente menor que su punto de reorden.
- **FR-002**: Cada alerta DEBE mostrar código, nombre, categoría, stock actual, punto de reorden y faltante (punto de reorden − stock).
- **FR-003**: Las alertas DEBEN recalcularse a partir del stock derivado de los movimientos (Entradas − Salidas), sin almacenar valores duplicados.
- **FR-004**: Los productos sin punto de reorden configurado NO DEBEN generar alertas.
- **FR-005**: La vista DEBE ordenar las alertas por faltante descendente con desempate por nombre.
- **FR-006**: DEBE existir un filtro por categoría que restrinja el listado mostrado.
- **FR-007**: DEBE existir una acción "Exportar CSV" que genere un archivo con las alertas visibles (incluyendo el filtro activo).
- **FR-008**: El panel DEBE seguir mostrando el KPI de "ítems bajo punto de reorden" de forma consistente con la lista de alertas.

### Entidades Clave

- **Producto (Entidad)**: ya existe; aporta `código`, `nombre`, `categoría`, `punto_reorden` y `stock` derivado.
- **Alerta de reposición**: concepto derivado (no persistido) que combina producto y faltante calculado.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un usuario identifica los 3 productos más urgentes de reponer en menos de 10 segundos desde el panel.
- **SC-002**: El 100% de los productos bajo el punto de reorden aparece en la lista tras recargar la aplicación.
- **SC-003**: La exportación CSV abre correctamente en Excel/Google Sheets con acentos y separador admitido.
- **SC-004**: La vista se mantiene usable con 500 productos y 50 alertas simultáneas sin degradación perceptible.

## Suposiciones

- Se reutiliza el almacenamiento local (`localStorage`) y la configuración existente del módulo; no se agrega backend.
- El punto de reorden ya está disponible como campo personalizado del producto.
- El CSV usa codificación UTF-8 con BOM para compatibilidad con Excel en Windows.
- No se incluye notificación por correo ni integración con proveedores en esta iteración.
