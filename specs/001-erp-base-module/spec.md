# Especificación de la Funcionalidad: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama de la funcionalidad**: 001-erp-base-module  
**Creada**: 2026-07-08  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Construir un módulo base de software de planificación de recursos empresariales (ERP) que pueda extenderse en módulos ERP personalizados. Debe proporcionar gestión de datos maestros (entidades) y documentos transaccionales vinculados con capacidades de crear/editar/eliminar/buscar."

## Propósito

Este proyecto sirve como módulo base reutilizable para construir módulos ERP personalizados. Establece los patrones comunes que todo módulo ERP necesita: gestionar registros de datos maestros (**Entidades**) y sus **Documentos** transaccionales asociados, con navegación, validación, persistencia y búsqueda ya implementadas, de modo que los módulos personalizados solo necesiten definir sus campos y reglas específicos del dominio.

## Clarifications

### Session 2026-11-03

- Q: ¿Las operaciones de inventario (saldo de stock, ubicaciones pasillo/estante/nivel y validación de existencias) deben formar parte del alcance funcional de este módulo base, o solo del módulo personalizado construido sobre él? → A: Forman parte del módulo base como comportamiento nativo; stock, ubicaciones y validación de existencias se implementan en el núcleo (Entidad=Producto, Documento=Movimiento de Inventario vía configuración).

### Session 2026-11-10

- Q: ¿El inicio de sesión y el acceso por roles forman parte del alcance del módulo base o los roles son solo etiquetas descriptivas en una demo de un único usuario? → A: Los roles son etiquetas descriptivas; no se implementa autenticación, inicio de sesión ni permisos, y se opera en un único espacio de trabajo local.
- Q: ¿Cómo debe calcularse el KPI de valoración total del stock si las historias de recepción y despacho prohíben campos de costo, precio o financieros en cualquier pantalla? → A: Se añade un `costo_unitario` opcional al maestro de producto; la valoración es la suma de (stock × costo_unitario) y solo se muestra en el panel y el catálogo, nunca como campo de entrada en los formularios de Entrada o Salida de Inventario.
- Q: ¿La ubicación física (pasillo, estante, nivel) se registra por movimiento de inventario o como una única ubicación actual en el producto? → A: Se registra en cada documento de Entrada de Inventario; el detalle del producto muestra la ubicación del documento de entrada más reciente (derivada, sin duplicar).
- Q: ¿La categoría es un campo obligatorio al crear una entidad o es opcional? → A: Es obligatoria, junto con nombre y código.
- Q: ¿Qué campos debe tener un Documento (movimiento de inventario) y debe soportar un rango de fechas inicial/final? → A: El Documento tiene vínculo a la entidad, tipo (Entrada/Salida), cantidad, marca de tiempo automática y notas opcionales; no admite rango de fechas.

### Session 2026-11-11

- Q: ¿Debe el código (SKU) de una entidad ser único en todo el sistema, bloqueando el guardado cuando ya existe otro registro con el mismo código? → A: Sí, el código es único globalmente: crear o editar una entidad con un código ya existente se bloquea con un mensaje de error descriptivo.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 – Catálogo maestro y control de acceso (Prioridad: P1)

Como Administrador, quiero registrar productos y proveedores con datos validados, y asignar un rol a cada usuario, para que todo el equipo trabaje sobre un catálogo único, sin duplicados, y cada persona vea solo la información que le corresponde.

**Por qué esta prioridad**: Todas las demás historias dependen de un producto bien definido y de saber quién está operando. Si el catálogo tiene duplicados, el stock se divide en registros distintos y los reportes quedan mal.

**Prueba Independiente**: Crear "Resma papel carta 75 g" (SKU `PAP-CAR-075`, categoría Papelería, unidad Paquete, punto de reorden 20, costo $3.200, proveedor "Distribuidora Sur"). Intentar crearlo de nuevo con el mismo SKU y comprobar que el sistema lo rechaza. Cambiar al rol Operador y verificar que el costo no aparece.

**Escenarios de Aceptación**:

1. **Dado** que se completan los campos obligatorios (SKU, nombre, categoría, unidad, punto de reorden), **cuando** se guarda, **entonces** el producto queda activo con stock 0.
2. **Dado** que el SKU ya existe (sin importar mayúsculas o espacios), o el punto de reorden o el costo es negativo, **cuando** se intenta guardar, **entonces** el sistema bloquea el guardado e indica el error.
3. **Dado** un producto con movimientos, **cuando** se intenta eliminarlo, **entonces** solo se permite desactivarlo (se conserva su historial).
4. **Dado** un usuario con rol Operador, **entonces** no ve costos, valorización ni contactos de proveedores en ninguna pantalla.
5. **Dado** cualquier creación, edición o desactivación, **entonces** queda registrada en la auditoría con el usuario y la fecha.

**Datos involucrados**: `Producto`, `Categoria`, `Proveedor`, `Usuario`, `Rol`, `Auditoria`.

**Decisión de diseño**: El SKU se normaliza antes de validar que sea único. Los productos se desactivan, nunca se borran. En el MVP (solo frontend), el rol se elige con un selector simulado; en producción debe validarse en el backend. Las etiquetas del módulo ("Producto", "Movimiento de Inventario") se definen en la configuración del template (detalle en `plan.md`).

---

### Historia de Usuario 2 – Recepción con ubicación en bodega (Prioridad: P1)

Como Operador de Bodega, quiero registrar las entradas de mercadería indicando el proveedor, el documento de respaldo, la cantidad y la ubicación (pasillo-estante-nivel), y mover stock entre ubicaciones, para que el stock quede disponible de inmediato y cualquiera pueda encontrar el producto.

**Por qué esta prioridad**: Es la puerta de entrada del inventario. Un error aquí se propaga a los despachos, las alertas y los reportes.

**Prueba Independiente**: Registrar 50 paquetes de `PAP-CAR-075` con la guía N° 4521 en `A-03-2`. Verificar que el stock total y el de `A-03-2` quedan en 50. Luego transferir 10 a `B-01-1` y verificar que el total sigue en 50.

**Escenarios de Aceptación**:

1. **Dado** un documento de entrada con una o más líneas (producto, cantidad, ubicación), **cuando** se confirma, **entonces** se genera `ENT-xxxxx` con fecha, hora y usuario, y el stock aumenta en cada ubicación.
2. **Dado** que falta la cantidad, la ubicación o el documento de respaldo, la cantidad es ≤ 0 o la ubicación no existe, **cuando** se intenta guardar, **entonces** el sistema lo impide e indica qué corregir.
3. **Dado** que el producto no existe, **cuando** el operador lo busca, **entonces** puede enviar una solicitud de alta al Administrador, pero no puede crearlo él mismo.
4. **Dado** una transferencia de `A-03-2` a `B-01-1`, **cuando** se confirma, **entonces** el origen baja, el destino sube y el stock total no cambia; si la cantidad supera el stock del origen, se bloquea.
5. **Dado** que el operador cancela a mitad del registro, **entonces** no se genera el documento ni cambia el stock.

**Datos involucrados**: `MovimientoInventario` (tipo `ENTRADA` / `TRANSFERENCIA`), `DetalleMovimiento`, `Ubicacion`, `StockUbicacion`.

**Decisión de diseño**: El stock se guarda por ubicación y nunca se edita a mano: siempre es el resultado de los movimientos.

---

### Historia de Usuario 3 - Despacho con validación de stock (Prioridad: P1)

Como Operador de Despacho, quiero registrar salidas viendo el stock disponible por ubicación y la ubicación sugerida para retirar, para despachar rápido, sin dejar el inventario en negativo y usando primero lo que entró antes.

**Por qué esta prioridad**: Sin validar las salidas aparecen stocks negativos, y el inventario deja de ser confiable para planificar entregas.

**Prueba Independiente**: Con 50 unidades en A-03-2, intentar despachar 60: el sistema bloquea la acción. Despachar 30: el stock baja a 20 y se genera `SAL-000045`.

**Escenarios de Aceptación**:

1. **Dado** que el operador selecciona un producto, **cuando** se carga la línea, **entonces** ve el stock disponible por ubicación y el sistema sugiere la ubicación con la entrada más antigua (FIFO).
2. **Dado** que la cantidad supera el stock de la ubicación elegida, **cuando** la ingresa, **entonces** aparece "Stock insuficiente en A-03-2: disponible 50" y el botón Guardar se deshabilita.
3. **Dado** que se elige un motivo de salida (Venta, Consumo interno, Merma, Devolución a proveedor), **cuando** el motivo es Merma, **entonces** el sistema exige una observación.
4. **Dado** que la salida es válida, **cuando** se confirma, **entonces** se genera el documento `SAL-xxxxx` y el stock disminuye exactamente en la cantidad despachada.
5. **Dado** que la salida deja el producto bajo su punto de reorden, **cuando** se guarda, **entonces** se informa al operador y se genera una alerta (ver HU5).
6. **Dado** que el operador cancela a mitad del registro, **entonces** no cambia nada.

**Datos involucrados**: `MovimientoInventario` (tipo = SALIDA, motivo, destino), `DetalleMovimiento`, `StockUbicacion`.

**Decisión de diseño**: La validación se hace contra el stock de la ubicación, no solo contra el total, porque físicamente se retira de un lugar concreto.
---

### Historia de Usuario 4 – Kardex, conteo físico y ajustes (Prioridad: P1)

Como Jefe de Bodega, quiero consultar el historial completo de movimientos de cada producto, y corregir las diferencias detectadas en un conteo físico mediante ajustes aprobados, para explicar cualquier diferencia de stock, saber quién hizo qué y mantener el inventario fiel a la realidad.

**Por qué esta prioridad**: Sin trazabilidad no se puede auditar ni corregir. Sin un ajuste controlado, la gente "arregla" el stock por fuera del sistema.

**Prueba Independiente**: Abrir el kardex de `PAP-CAR-075` y ver `ENT +50`, `SAL −30`, con su saldo. Registrar un conteo de 18 cuando el sistema dice 20, aprobar un ajuste de `−2` con el motivo "Daño" y ver el ajuste en el kardex.

**Escenarios de Aceptación**:

1. **Dado** un producto, **cuando** se abre su kardex, **entonces** se listan sus movimientos en orden cronológico (tipo, documento, cantidad, saldo, ubicación y usuario), filtrables por fecha y tipo.
2. **Dado** un documento confirmado, **entonces** no se puede editar; para corregirlo se anula, lo que genera un contramovimiento enlazado al original con su motivo.
3. **Dado** un conteo físico, **entonces** quien cuenta no ve la cantidad del sistema (conteo ciego); al cerrar el conteo se muestra la diferencia por producto.
4. **Dado** una diferencia, **cuando** se genera el ajuste, **entonces** el motivo es obligatorio y el ajuste no puede aprobarlo la misma persona que contó.
5. **Dado** un ajuste aprobado, **entonces** el stock se corrige y aparece en el kardex como `AJUSTE`.

**Datos involucrados**: `MovimientoInventario` (tipo `AJUSTE`, estado, `anula_a_id`, `aprobado_por`), `ConteoFisico`, `DetalleConteo`.

**Decisión de diseño**: Los documentos son inmutables y se corrigen con contramovimientos, el mismo principio de la contabilidad, así que el saldo siempre se puede reconstruir.

---

### Historia de Usuario 5 – Panel de inventario y alertas de reposición (Prioridad: P2)

Como Analista de Inventario, quiero un panel con los KPIs del inventario y la lista de productos bajo su punto de reorden con una cantidad sugerida a pedir, para reponer a tiempo, evitar quiebres y detectar capital inmovilizado.

**Por qué esta prioridad**: Convierte al módulo de un registro pasivo en una herramienta de decisión. Depende de que HU1–HU4 generen datos confiables.

**Prueba Independiente**: Con `PAP-CAR-075` en 15 unidades (punto de reorden 20), el producto aparece en alerta con una cantidad sugerida. Filtrar por "Papelería" y verificar que los KPIs se recalculan; "Limpiar filtros" vuelve a los valores globales.

**Escenarios de Aceptación**:

1. **Dado** que el Analista entra al panel, **entonces** ve: N° de productos activos, valor del inventario (costo promedio ponderado), N° de productos en alerta y productos sin movimiento en 90 días.
2. **Dado** un producto con stock ≤ su punto de reorden, **entonces** aparece en alerta (rojo si tiene stock 0, amarillo si está bajo el punto de reorden) con la cantidad sugerida `stock_maximo − stock_actual`, que el Analista puede editar.
3. **Dado** que el Analista selecciona productos en alerta, **cuando** presiona "Generar solicitud", **entonces** se crea una solicitud de reposición agrupada por proveedor (en el futuro se enviará al módulo de Compras).
4. **Dado** un filtro de categoría o fecha, **entonces** todos los KPIs y la tabla se recalculan, y el filtro activo queda visible.
5. **Dado** un producto con menos de 30 días de historial, **entonces** su rotación se muestra como "Datos insuficientes" en vez de un número engañoso.

**Datos involucrados**: `SolicitudReposicion`, `DetalleSolicitud`, y lectura de `Producto`, `StockUbicacion` y `MovimientoInventario`.

---

### Historia de Usuario 6 – Integración con Compras y Ventas (Prioridad: P3)

Como Operador de Bodega, quiero que las órdenes de compra del módulo de Compras y los pedidos del módulo de Ventas aparezcan en Inventario como recepciones y despachos pendientes, para no digitar dos veces la misma información y cerrar el ciclo entre lo que se pide, lo que llega y lo que sale.

**Por qué esta prioridad**: El objetivo del trabajo es un módulo ERP que se conecte con los demás módulos del template. Esta historia une la solicitud de reposición (HU5) con la recepción (HU2) y el pedido de venta con el despacho (HU3). Es P3 porque el módulo funciona sin ella.

**Prueba Independiente**: La solicitud de reposición de `PAP-CAR-075` (HU5) se envía a Compras, que emite la `OC-0098` por 50 paquetes. En Inventario, `OC-0098` aparece en "Recepciones pendientes". Al recibir 30, la OC queda "Parcial" con 20 pendientes. Luego, un pedido de Ventas por 10 aparece en "Despachos pendientes" y, al despacharlo, pasa a "Despachado".

**Escenarios de Aceptación**:

1. **Dado** una solicitud de reposición generada en HU5, **cuando** el Analista la envía, **entonces** queda disponible para Compras con el estado "Enviada".
2. **Dado** una orden de compra emitida por Compras, **cuando** el operador registra la recepción, **entonces** puede seleccionar la OC y las líneas (producto, cantidad pedida, proveedor) se cargan automáticamente.
3. **Dado** que se recibe menos de lo pedido, **entonces** la OC queda "Parcial" con el saldo pendiente; si se intenta recibir más de lo pedido, el sistema pide confirmación al Jefe de Bodega.
4. **Dado** un pedido de Ventas, **entonces** aparece en "Despachos pendientes" con su prioridad y fecha comprometida, y al despacharlo (HU3) su estado cambia a "Despachado" o "Parcial".
5. **Dado** que no hay stock suficiente para un pedido, **entonces** se registra como demanda no atendida (dato que se usa en la sección de sesgos).

**Datos involucrados**: `OrdenCompra` y `PedidoVenta` (vienen de los otros módulos), claves foráneas `orden_compra_id` y `pedido_venta_id` en `MovimientoInventario`, y `DemandaNoAtendida` (`producto_id`, `pedido_venta_id`, `cantidad`, `fecha`).

**Decisión de diseño**: Inventario no crea ni edita OC ni pedidos, solo los lee y actualiza su estado de recepción o despacho. Así cada módulo es dueño de sus datos. En el MVP (solo frontend) las OC y los pedidos se simulan con datos de ejemplo.

---
### Historia de Usuario 7 - Panel de indicadores de inventario (Prioridad: P2)

Como Analista de Inventario, quiero un panel con los KPIs principales, filtrable por categoría y período, para detectar quiebres, sobrestock y capital inmovilizado.

**Por qué esta prioridad**: Permite consolidar la visibilidad operativa y financiera del almacén para detectar anomalías de stock y apoyar la toma de decisiones, una vez que el flujo básico de movimientos ya está operativo.

**Prueba Independiente**: Abrir el panel, ver los KPIs globales, filtrar por "Papelería" y comprobar que todos los KPIs y la tabla se recalculan solo con esa categoría. "Limpiar filtros" vuelve a los valores globales.

**Escenarios de Aceptación**:

1. **Dado** que el Analista entra al panel, **cuando** visualiza los indicadores principales, **entonces** ve al menos: N° de productos activos, valor total del inventario (∑ stock × costo), N° de productos en alerta, y productos sin movimiento en 90 días.
2. **Dado** que hay historial suficiente, **cuando** se consultan los indicadores detallados, **entonces** se muestra la rotación y los días de cobertura (stock / consumo diario promedio) por producto.
3. **Dado** que un producto tiene menos de 30 días de historial, **cuando** se evalúa su rotación, **entonces** se muestra como "Datos insuficientes" en vez de un número engañoso.
4. **Dado** un filtro de categoría o fecha, **cuando** se aplica, **entonces** todas las tarjetas y la tabla se recalculan, y el filtro activo queda visible.
5. **Dado** un usuario con rol Operador, **cuando** intenta entrar al panel, **entonces** ve solo los KPIs de cantidades, sin valores en $.

**Datos involucrados**: Lectura de `Producto`, `StockUbicacion` y `MovimientoInventario` (sin tablas nuevas).

**Decisión de diseño**: La valorización usa costo promedio ponderado, que se recalcula con cada entrada.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir a los usuarios crear un registro de entidad con al menos un nombre, un código y una categoría.
- **FR-002**: El sistema DEBE permitir a los usuarios editar los detalles de un registro de entidad existente.
- **FR-003**: El sistema DEBE permitir a los usuarios eliminar un registro de entidad existente.
- **FR-004**: El sistema DEBE permitir a los usuarios buscar registros de entidad por nombre, código, categoría u otras palabras clave descriptivas.
- **FR-005**: El sistema DEBE mostrar una lista clara de entidades e indicar cuándo ningún resultado coincide con una búsqueda.
- **FR-006**: El sistema DEBE presentar retroalimentación clara cuando falta información obligatoria o no se puede completar una acción.
- **FR-007**: El sistema DEBE mantener los datos de entidad consistentes tras operaciones de creación, edición y eliminación.
- **FR-008**: El sistema DEBE permitir a los usuarios añadir, editar y eliminar detalles de documentos de una entidad.
- **FR-009**: El sistema DEBE asociar cada documento exactamente a una entidad y eliminar los documentos asociados cuando la entidad se elimina.
- **FR-010**: El sistema DEBE mostrar un panel de inicio como vista inicial, con botones de acción rápida claramente etiquetados para las tareas ERP clave.
- **FR-011**: El sistema DEBE envolver cada pantalla en un marco de espacio de trabajo persistente compuesto por una barra superior con marca y una barra lateral de navegación de módulos.
- **FR-012**: La barra lateral DEBE proporcionar botones de módulo para Panel, Entidades, Documentos y Buscar, etiquetados desde la configuración del módulo.
- **FR-013**: El botón de módulo Entidades DEBE mostrar el contenido de gestión de entidades.
- **FR-014**: El botón de módulo Documentos DEBE mostrar el contenido de gestión de documentos en la pantalla de gestión.
- **FR-015**: El botón de módulo Panel DEBE devolver al usuario al panel de inicio.
- **FR-016**: La pantalla de gestión NO DEBE mostrar la lista de entidades.
- **FR-017**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar entidades.
- **FR-018**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar documentos.
- **FR-019**: El sistema DEBE navegar a una pantalla de búsqueda dedicada cuando se selecciona el botón Buscar en la barra lateral.
- **FR-020**: La pantalla de búsqueda DEBE permitir buscar entidades por nombre, código, categoría, descripción o fecha objetivo.
- **FR-021**: La pantalla de búsqueda DEBE ser accesible tanto desde la barra lateral como desde la acción rápida de buscar registros del panel.
- **FR-022**: El sistema DEBE mantener los datos de entidades y documentos intactos y consistentes durante la navegación entre pantallas.
- **FR-023**: El sistema DEBE cargar la configuración del módulo al arrancar y aplicarla en todas las pantallas.
- **FR-024**: El sistema DEBE retroceder a los valores predeterminados integrados (terminología Entidad/Documento, sin campos personalizados, sin ciclo de vida) cuando no se proporciona configuración.
- **FR-025**: El sistema DEBE informar claramente de una configuración inválida o conflictiva en lugar de fallar silenciosamente.
- **FR-026**: El sistema DEBE mostrar los campos personalizados declarados en los formularios de creación/edición con tipos de entrada que coincidan con sus tipos declarados.
- **FR-027**: El sistema DEBE validar los valores de campos personalizados, incluidos los obligatorios, antes de guardar, usando la misma experiencia de retroalimentación que la validación base.
- **FR-028**: El sistema DEBE incluir los valores de campos personalizados en los resultados de búsqueda y mostrarlos en listas y vistas de detalle.
- **FR-029**: El sistema DEBE derivar todas las etiquetas visibles para el usuario de la configuración del módulo en lugar de texto fijo en el código.
- **FR-030**: El sistema DEBE aplicar las transiciones de estado configuradas en los documentos independientemente de cómo se envíe un cambio.
- **FR-031**: El sistema DEBE mantener el estado del documento como texto libre cuando no hay ciclo de vida configurado.
- **FR-032**: El sistema DEBE mantener el renderizado de listas y la búsqueda ágiles y correctos para conjuntos de datos de al menos 500 registros de entidad.
- **FR-033**: El panel DEBE ofrecer al menos cuatro botones de acción rápida: nueva entidad, nuevo documento, abrir gestión de entidades y buscar registros.
- **FR-034**: Activar la acción rápida de nueva entidad o nuevo documento DEBE abrir el área de gestión correspondiente con un formulario vacío listo para introducir datos.
- **FR-035**: El panel DEBE mostrar tarjetas de estadísticas con el número de entidades y documentos almacenados, actualizadas cada vez que se muestra el panel.
- **FR-036**: La barra superior DEBE mostrar un logotipo derivado del nombre del módulo junto con el nombre del módulo configurado en cada pantalla.
- **FR-037**: La barra lateral DEBE resaltar visualmente el módulo activo en cada pantalla.
- **FR-038**: La configuración PUEDE definir un color de acento; el sistema DEBE aplicarlo consistentemente en todo el marco y retroceder de forma segura a los valores integrados cuando esté ausente o sea inválido.
- **FR-039**: En ventanas gráficas estrechas, la barra lateral DEBE contraerse a una columna de iconos manteniéndose operable.
- **FR-040**: El sistema DEBE mantener un saldo de stock disponible por entidad que se incrementa al registrar una Entrada de Inventario y disminuye al registrar una Salida de Inventario, exactamente en la cantidad indicada en el documento.
- **FR-041**: El sistema DEBE registrar la ubicación física (pasillo, estante, nivel) en cada documento de Entrada de Inventario y mostrar en el detalle del producto la ubicación del documento de entrada más reciente.
- **FR-042**: El sistema DEBE impedir registrar una Salida de Inventario cuya cantidad supere el stock disponible de la entidad, mostrando un mensaje de error descriptivo.
- **FR-043**: El sistema DEBE clasificar cada documento de inventario por tipo (Entrada o Salida) y aplicar el efecto correspondiente sobre el saldo de stock.
- **FR-044**: El sistema DEBE calcular la valoración total del stock como la suma de (saldo de stock × costo_unitario) por entidad, mostrarla únicamente en el panel y el catálogo, y no ofrecerla como campo de entrada en los formularios de Entrada o Salida de Inventario.
- **FR-045**: El sistema DEBE impedir crear o editar una entidad cuyo código coincida con el de otra entidad existente (excluyendo la propia entidad en edición), mostrando un mensaje de error descriptivo.

### Requisitos de Extensibilidad *(obligaciones del módulo base)*

Los módulos personalizados construidos sobre esta base DEBEN poder:

- **XR-001**: Extender los registros de entidad y documento con campos adicionales específicos del dominio sin cambiar la estructura de almacenamiento base.
- **XR-002**: Reetiquetar pantallas, pestañas, formularios y listas con terminología específica del módulo sin alterar el comportamiento de navegación.
- **XR-003**: Añadir reglas de validación específicas del módulo junto a las reglas de validación base.
- **XR-004**: Apoyarse en el módulo base para generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, y eliminación en cascada.
- **XR-005**: Remarcar el espacio de trabajo —nombre del módulo, logotipo derivado y color de acento— únicamente mediante configuración.

### Entidades Clave *(incluir si la funcionalidad implica datos)*

- **Entidad**: Un registro de datos maestros gestionado por el módulo, que incluye su nombre, un código de negocio único en todo el sistema, una categoría de clasificación obligatoria, detalles descriptivos, una fecha objetivo opcional, un entity_id autogenerado, un saldo de stock disponible y, cuando aplica, unidad de medida, punto de reorden y un costo_unitario opcional para la valoración del stock. La ubicación física no se almacena en la entidad: se deriva del documento de entrada más reciente. Los módulos personalizados definen qué representa una Entidad en el mundo real (p. ej., cliente, producto, activo).
- **Documento**: Detalles transaccionales adjuntos a una entidad, vinculados a ella por el entity_id de la entidad, clasificados por tipo (Entrada o Salida de Inventario), con la cantidad que afecta el saldo de stock, una marca de tiempo automática y notas opcionales. Los documentos de Entrada registran además la ubicación física (pasillo, estante, nivel). Los documentos no admiten rango de fechas inicial/final. Los módulos personalizados definen qué representa un Documento (p. ej., pedido, factura, contrato).
- **ModuleConfig**: El objeto de adaptación cargado al arrancar que define el nombre del módulo, las etiquetas de terminología, las definiciones de campos personalizados y el ciclo de vida de estados de documentos. Consulte data-model.md para su forma completa.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Los usuarios pueden crear una nueva entidad y verla en la lista en menos de 2 minutos.
- **SC-002**: Los usuarios pueden encontrar una entidad existente mediante la búsqueda en menos de 10 segundos tras introducir un término relevante.
- **SC-003**: Al menos el 90% de los usuarios de prueba pueden completar tareas de crear, editar, eliminar y buscar sin ayuda.
- **SC-004**: El sistema sigue siendo utilizable para un conjunto de datos de al menos 500 registros de entidad sin pérdida de funcionalidad central.
- **SC-005**: Un usuario puede alcanzar las pantallas de gestión y búsqueda desde el panel o la barra lateral en menos de 10 segundos en el primer uso.
- **SC-006**: Toda la funcionalidad existente de gestión de entidades y documentos sigue operativa tras el rediseño del marco ERP y el panel (sin regresiones).
- **SC-007**: Los usuarios pueden navegar entre las pantallas de panel, gestión y búsqueda sin perder ninguna entidad ni documento almacenado.
- **SC-008**: Un desarrollador puede producir un módulo adaptado usando solo el archivo de configuración, con cero modificaciones en archivos fuente centrales.
- **SC-009**: Cada pantalla presenta el mismo marco con marca, y los usuarios pueden identificar en qué módulo están de un vistazo.
- **SC-010**: Las estadísticas de registros mostradas en el panel siempre coinciden con el número de entidades y documentos almacenados.

## Suposiciones

- El módulo base gestiona datos para un único espacio de trabajo en lugar de una base de datos multiinquilino compartida.
- Los roles mencionados en las historias (Administrador, Operador de Recepción, Operador de Despacho, Analista) son etiquetas descriptivas; el módulo base no implementa autenticación, inicio de sesión ni permisos.
- La valoración del stock usa un `costo_unitario` opcional por producto y se muestra solo en el panel y el catálogo; los formularios de Entrada y Salida de Inventario no incluyen campos de costo.
- La adaptación a un módulo específico se realiza mediante un archivo de configuración del módulo en lugar de editando archivos fuente centrales.
- Cada entidad incluye información básica suficiente para identificación y seguimiento; los módulos personalizados aportan los campos específicos del dominio.
- La versión inicial se centra en la gestión central de datos maestros y documentos en lugar de capacidades ERP avanzadas como flujos de aprobación, períodos de contabilización o informes.
- La búsqueda se realiza sobre los registros de entidad almacenados.
- La pantalla de gestión consolida los formularios de añadir/editar entidad y añadir/editar documento en una sola pantalla de gestión.
- La navegación entre áreas ocurre mediante una barra lateral persistente; la pantalla de gestión aloja ambos paneles de gestión y no muestra la lista de entidades.
- El logotipo se genera como un monograma SVG en línea derivado del nombre del módulo; no se requieren recursos de imagen externos.
- Se puede configurar un color de acento opcional para la marca; el resto de la paleta base permanece fija.
- Solo se muestra una pantalla a la vez; no hay diseño lado a lado del contenido de gestión y búsqueda.
- La navegación entre pantallas se maneja dentro de la aplicación (p. ej., cambio de vistas), y el botón atrás del navegador debe comportarse de forma predecible.
- Los datos siguen persistiéndose en el localStorage del navegador y no se ven afectados por la navegación entre pantallas.
- La pantalla de búsqueda se centra en encontrar y ver entidades; la edición permanece en la pantalla de gestión.
- El contenido del usuario introducido por el usuario (nombres, descripciones, notas de documentos) DEBE sanitizarse antes de renderizarse en el DOM para prevenir ataques de inyección de scripts (XSS). El módulo base DEBE escapar HTML y atributos de eventos al mostrar datos de localStorage.

