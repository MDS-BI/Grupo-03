# Especificación de la Funcionalidad: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama de la funcionalidad**: 001-erp-base-module  
**Creada**: 2026-07-08  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Construir un módulo base de software de planificación de recursos empresariales (ERP) que pueda extenderse en módulos ERP personalizados. Debe proporcionar gestión de datos maestros (entidades) y documentos transaccionales vinculados con capacidades de crear/editar/eliminar/buscar."

## Propósito

Este proyecto sirve como módulo base reutilizable para construir módulos ERP personalizados. Establece los patrones comunes que todo módulo ERP necesita: gestionar registros de datos maestros (**Entidades**) y sus **Documentos** transaccionales asociados, con navegación, validación, persistencia y búsqueda ya implementadas, de modo que los módulos personalizados solo necesiten definir sus campos y reglas específicos del dominio.

## Problema y solución propuesta

### Problema

La operación de bodega se gestiona hoy con planillas y registros dispersos, lo que genera tres problemas concretos:

1. **Duplicidad de maestros.** Productos equivalentes se registran con distinta grafía (p. ej. «Resma Carta» y «RESMA carta 75g»), dividiendo el stock entre varios registros y haciendo que los reportes sean incorrectos.
2. **Pérdida de trazabilidad y confianza en el stock.** Las entradas y salidas no quedan vinculadas a un documento ni a un responsable; ante una diferencia no es posible reconstruir el saldo ni saber quién hizo qué.
3. **Decisiones sesgadas.** Los conteos se hacen viendo el saldo del sistema (sesgo de anclaje), los indicadores se calculan con historiales muy cortos (sesgo de disponibilidad) y los datos sensibles (costos, contactos de proveedores) se muestran sin distinción en una demo compartida.

Además, la plantilla base del curso es genérica (Entidad/Documento) y no habla el lenguaje de bodega, por lo que cada módulo tendría que modificar el núcleo para adaptarlo.

### Solución propuesta

Un MVP **solo frontend** del módulo **Logística e Inventario (SCM)** construido con Spec Driven Development sobre la plantilla:

- **Catálogo maestro** con SKU normalizado y único, categoría, unidad, punto de reorden y costo opcional; los productos con historial se desactivan en vez de borrarse.
- **Movimientos nativos** de Entrada, Salida, Transferencia y Ajuste, con ubicación por documento, validación de stock y sugerencia FIFO.
- **Kardex inmutable** con contramovimientos vinculados para corregir errores sin destruir el historial.
- **Conteos ciegos** con aprobación por una persona distinta de quien contó, y **auditoría** de todas las operaciones.
- **Panel de KPIs** con alertas de reposición, filtros por categoría/período y rotación marcada como «Datos insuficientes» cuando el historial es menor a 30 días.
- **Adaptación declarativa** desde `src/module-config.js`: nombre, etiquetas, campos, ciclo de vida y color de acento, sin tocar el código central.

La solución se materializa en el repositorio con el mock-up funcional, los archivos `.md` de Spec Kit (`spec`, `plan`, `data-model`, `tasks`), el MER en Mermaid y su imagen, y las instrucciones de ejecución. Cubre los RA1, RA3 y RA4 del instructivo.

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

### Session 2026-11-23

- Q: ¿Los roles siguen siendo etiquetas descriptivas sin permisos o pasan a controlar el acceso a la interfaz? → A: Pasan a controlar el acceso. **Esta respuesta sustituye la de 2026-11-10.** El registro exige indicar obligatoriamente el cargo/rol, el ingreso habilita únicamente la interfaz con las funciones disponibles para ese cargo y el rol Administrador accede a todas las funciones (FR-050–FR-056). Se mantiene la limitación de que, sin backend, es una barrera de presentación en el navegador y no sustituye la autorización en servidor.
- Q: ¿Qué cargos/roles existen y de dónde se toman? → A: El catálogo se toma de los perfiles ya documentados en el repositorio: Administrador del módulo, Operador de Recepción, Operador de Despacho, Jefe de Bodega y Analista de Inventario.
- Q: ¿El rol se puede cambiar sin volver a ingresar? → A: No. El rol se fija en el perfil al registrarse y se carga en la sesión al ingresar; cambiarlo exige cerrar sesión e ingresar con un perfil de ese rol. No hay selector de rol dentro del espacio de trabajo.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 – Catálogo maestro de productos y proveedores (Prioridad: P1)

Como Administrador del módulo, quiero registrar productos con SKU único, categoría, unidad de medida, punto de reorden, costo unitario y proveedor principal, para que todo el equipo opere sobre un catálogo único, sin duplicados ni datos incompletos.

**Por qué esta prioridad**: Todas las demás historias referencian un producto. Un catálogo con duplicados (p. ej. "Resma Carta" y "RESMA carta 75g") hace que el stock se divida en registros distintos y los reportes queden mal.

**Prueba Independiente**: Crear el producto "Resma papel carta 75 g" (SKU `PAP-CAR-075`, categoría Papelería, unidad Paquete, punto de reorden 20, costo $3.200, proveedor "Distribuidora Sur"). Verificar que aparece en el listado. Intentar crearlo de nuevo con el mismo SKU y comprobar que el sistema lo rechaza.

**Escenarios de Aceptación**:

1. **Dado** que el Administrador completa todos los campos obligatorios, **cuando** guarda, **entonces** el producto queda activo con stock 0 y aparece en el listado.
2. **Dado** que ya existe el SKU `PAP-CAR-075`, **cuando** se intenta crear otro producto con el mismo SKU (sin importar mayúsculas o espacios), **entonces** el sistema bloquea el guardado y muestra "El SKU ya existe: Resma papel carta 75 g".
3. **Dado** que el punto de reorden o el costo es negativo o no numérico, **cuando** se intenta guardar, **entonces** el sistema marca el campo en rojo e indica el valor esperado.
4. **Dado** un producto que tiene movimientos, **cuando** el Administrador intenta eliminarlo, **entonces** el sistema no lo borra y ofrece desactivarlo (deja de aparecer en entradas y salidas, pero conserva su historial).
5. **Dado** que se registra un proveedor, **cuando** se ingresa un RUT con formato o dígito verificador inválido, **entonces** el sistema rechaza el registro.

**Datos involucrados**: `Producto` (id, sku, nombre, categoria_id, unidad_medida, punto_reorden, costo_unitario, proveedor_id, activo), `Categoria`, `Proveedor` (rut, razon_social, contacto).

**Decisión de diseño**: El SKU se normaliza (mayúsculas, sin espacios) antes de validar que sea único. Los productos no se eliminan, se desactivan, para no romper la trazabilidad.

---

### Historia de Usuario 2 – Recepción con ubicación en bodega (Prioridad: P1)

Como operador de recepción, quiero registrar una entrada indicando el proveedor, el documento de respaldo, los productos, las cantidades y la ubicación (pasillo-estante-nivel) donde los guardo, para que el stock quede disponible de inmediato y cualquiera pueda encontrar el producto en bodega.

**Por qué esta prioridad**: Es la puerta de entrada del inventario. Un error aquí se propaga a los despachos, las alertas y los reportes.

**Prueba Independiente**: Con el rol Operador de Recepción, registrar una entrada de 50 paquetes de  `PAP-CAR-075` con la guía de despacho N° 4521 de 'Distribuida Sur' en la ubicación `A-03-2`. Verificar que el stock total pasa de 0 a 50, que `A-03-2`muestre 50 y que no aparece ningún campo de costo en la pantalla.

**Escenarios de Aceptación**:

1. **Dado** que el operador busca un producto por SKU o nombre, **cuando** lo selecciona, **entonces** se muestra el stock total actual como referencia y la ubicación derivada del último movimiento confirmado (FR-041).
2. **Dado** que un documento de entrada tiene varias líneas (producto, cantidad, ubicación), **cuando** el operador confirma, **entonces** se genera un documento correlativo (ENT-000123), fecha, hora y usuario, y el stock de cada producto aumenta en su ubicación.
3. **Dado** que la ubicación ingresada no existe en el maestro de ubicaciones, **cuando** se intenta guardar, **entonces** el sistema no lo permite y sugiere ubicaciones válidas.
4. **Dado** que el mismo producto ya está en otra ubicación, **cuando** se recibe en una nueva, **entonces** la ubicación vigente pasa a ser la del documento más reciente y el stock total aumenta en la cantidad indicada (el desglose por ubicación queda como evolución futura documentada en `plan.md`).
5. **Dado**  que falta la cantidad, la ubicación o el documento de respaldo, o la cantidad es ≤ 0, **cuando** se intenta guardar, **entonces** el sistema indica qué falta y no modifica el stock.
6.**Dado** que el producto no existe en el catálogo, **cuando** el operador lo busca, **entonces** puede enviar una solicitud de alta al Administrador, pero no puede crearlo él mismo.
7.**Dado** que el operador está a mitad del ingreso, **cuando** cancela, **entonces** no se genera el documento ni cambia el stock.

**Datos involucrados**: `MOVIMIENTO` (tipo = ENTRADA, `entity_id`, `actorPerson`, `providerId`, `doc_respaldo`, `location` con pasillo/estante/nivel, `quantity`, marcas de tiempo) y `ENTIDAD` (`stockBalance`). En el MVP la ubicación se guarda dentro del movimiento y no existe una tabla `StockUbicacion` separada.

**Decisión de diseño**: El stock no se edita a mano: siempre es el resultado de los movimientos confirmados. El costo unitario se toma del catálogo y solo se visualiza en panel/catálogo (FR-044); no se ingresa en los formularios de Entrada o Salida.

---

### Historia de Usuario 3 - Despacho con validación de stock (Prioridad: P1)

Como Operador de Despacho, quiero registrar salidas viendo el stock disponible total y la ubicación sugerida para retirar (la entrada confirmada más antigua), para despachar rápido, sin dejar el inventario en negativo y usando primero lo que entró antes.

**Por qué esta prioridad**: Sin validar las salidas aparecen stocks negativos, y el inventario deja de ser confiable para planificar entregas.

**Prueba Independiente**: Con 50 unidades en A-03-2, intentar despachar 60: el sistema bloquea la acción. Despachar 30: el stock baja a 20 y se genera `SAL-000045`.

**Escenarios de Aceptación**:

1. **Dado** que el operador selecciona un producto, **cuando** se carga la línea, **entonces** ve el stock disponible total y el sistema sugiere la ubicación de la entrada confirmada más antigua (FIFO).
2. **Dado** que la cantidad supera el stock total disponible, **cuando** la ingresa, **entonces** aparece "Stock insuficiente: disponible 50" y el botón Guardar se deshabilita.
3. **Dado** que se elige un motivo de salida (Venta, Consumo interno, Merma, Devolución a proveedor), **cuando** el motivo es Merma, **entonces** el sistema exige una observación.
4. **Dado** que la salida es válida, **cuando** se confirma, **entonces** se genera el documento `SAL-xxxxx` y el stock disminuye exactamente en la cantidad despachada.
5. **Dado** que la salida deja el producto bajo su punto de reorden, **cuando** se guarda, **entonces** se informa al operador y se genera una alerta (ver HU5).
6. **Dado** que el operador cancela a mitad del registro, **entonces** no cambia nada.

**Datos involucrados**: `MOVIMIENTO` (tipo = SALIDA, `reason`, `quantity`, `actorPerson`) y `ENTIDAD` (`stockBalance`). La sugerencia de ubicación se deriva de los movimientos de Entrada confirmados; no hay una tabla `StockUbicacion` en el MVP.

**Decisión de diseño**: La validación se hace contra el stock total disponible al confirmar, y la sugerencia FIFO indica la ubicación de retiro. El control de stock por ubicación se registra como evolución futura en `plan.md`, para no introducir una tabla adicional en el MVP.
---

### Historia de Usuario 4 – Kardex e historial de movimientos (Prioridad: P1)

Como Jefe de Bodega, quiero consultar el kardex de un producto (todas sus entradas, salidas y ajustes con fecha, usuario, documento y saldo resultante), para explicar cualquier diferencia de stock y saber quién hizo qué.

**Por qué esta prioridad**: Es la trazabilidad mínima de cualquier sistema de inventario. Sin kardex no se puede auditar ni corregir un error.

**Prueba Independiente**: Después de HU2 y HU3, abrir el kardex de `PAP-CAR-075` y ver: `ENT-000123 +50` (saldo 50), `SAL-000045 −30` (saldo 20).

**Escenarios de Aceptación**:

1. **Dado** un producto con movimientos, **cuando** se abre su kardex, **entonces** se listan en orden cronológico con tipo, documento, cantidad, saldo acumulado, ubicación y persona local responsable.
2. **Dado** que se filtra por rango de fechas o tipo de movimiento, **entonces** la lista y el saldo inicial del período se recalculan.
3. **Dado** un documento con un error, **cuando** el Jefe de Bodega lo anula, **entonces** no se borra: se crea un contramovimiento que revierte el stock y queda enlazado al original con su motivo.
4. **Dado** cualquier documento confirmado, **cuando** un usuario intenta editarlo, **entonces** el sistema no lo permite (los documentos son inmutables).

**Datos involucrados**: `MOVIMIENTO` (tipo, `numero`, fecha, `actorPerson`, `doc_respaldo`, estado, `voidsMovementId`, motivo, `location`, `quantity`) y `ENTIDAD` (`entity_id`, `stockBalance`). El saldo del período se reconstruye desde el historial.

**Decisión de diseño**: Los documentos son inmutables y se corrigen con contramovimientos, el mismo principio de la contabilidad, así que el saldo siempre se puede reconstruir.

---

### Historia de Usuario 5 – Panel de inventario y alertas de reposición (Prioridad: P2)

Historia de Usuario 5 — Categorización y Dashboard de Métricas (Prioridad: P1)

 Estudiante asignado: Estudiante 5

 Rol: Analista

 Tipo de registro: Entidades (Métricas / Resumen)

 Como Analista de Inventario, quiero consultar un dashboard con métricas resumidas y filtrar los productos por categoría, para conocer el estado del stock, detectar productos que requieren reposición y apoyar la toma de decisiones logísticas.

 Por qué esta prioridad

 El dashboard permite revisar rápidamente el estado general del inventario sin consultar cada producto por separado. La categorización facilita comparar los productos y las alertas de stock ayudan a identificar oportunamente cuáles necesitan reposición.

 Prueba Independiente

 Ingresar al Panel como Analista y verificar que se muestren métricas de inventario, como el stock disponible y los productos bajo el punto de reorden. Seleccionar una categoría y confirmar que el resumen se actualice según los productos asociados. Comprobar que no se muestren costos ni otros datos financieros.

 Escenarios de Aceptación

 Dado que el Analista abre el dashboard, cuando se carga la información, entonces el sistema muestra el stock disponible y la cantidad de productos bajo el punto de reorden.

 Dado que existen productos asociados a distintas categorías, cuando el Analista selecciona una categoría, entonces el sistema filtra los productos y actualiza las métricas correspondientes.

 Dado que un producto tiene stock menor o igual a su punto de reorden, cuando el Analista consulta el dashboard, entonces el producto aparece identificado como crítico o pendiente de reposición.

 Dado que no existen productos o movimientos registrados, cuando el Analista abre el dashboard, entonces el sistema muestra valores en cero o un mensaje informativo, sin generar errores.

 Dado que el Analista consulta el dashboard, entonces el sistema muestra información operativa y no presenta costos, precios ni otros datos financieros.

---

### Historia de Usuario 6 – Conteo físico y ajuste de inventario (Prioridad: P2)

Como Jefe de Bodega, quiero registrar un conteo físico por ubicación, ver las diferencias con el sistema y aprobar los ajustes con un motivo, para corregir el inventario sin permitir que cualquiera modifique el stock libremente.

**Por qué esta prioridad**: Toda bodega puede presentar diferencias por mermas, daños o errores de registro. Esta historia permite corregirlas mediante un proceso controlado y trazable, una vez que las entradas, salidas y el kardex están operativos.

**Prueba Independiente**: Con un stock de 15 unidades de `PAP-CAR-075` en `A-03-2`, registrar un conteo físico de 13 unidades sin mostrar previamente la cantidad del sistema. Al cerrar el conteo, verificar que aparece una diferencia de −2 y generar un ajuste en estado "Pendiente". Una persona distinta de quien realizó el conteo lo aprueba con el motivo "Daño por humedad". Comprobar que el stock queda en 13 y que el ajuste aparece en el kardex.

**Escenarios de Aceptación**:

1. **Dado** que se inicia un conteo físico de una ubicación, **cuando** se muestran los productos esperados, **entonces** el sistema oculta las cantidades registradas para permitir un conteo ciego y evitar sesgar a quien cuenta.
2. **Dado** que se ingresan las cantidades contadas, **cuando** se cierra el conteo, **entonces** el sistema muestra la diferencia por producto en cantidad y porcentaje; la valorización se consulta en panel/catálogo y el rol no cambia qué datos se muestran (FR-044, FR-052).
3. **Dado** que existe una diferencia entre el conteo y el sistema, **cuando** se genera un ajuste, **entonces** el motivo es obligatorio —Merma, Error de registro, Daño, Robo u Otro— y el ajuste queda pendiente de aprobación, sin modificar todavía el stock.
4. **Dado** que quien realizó el conteo intenta aprobar su propio ajuste, **cuando** solicita la aprobación, **entonces** el sistema bloquea la acción e indica que debe aprobarlo otra persona.
5. **Dado** un ajuste pendiente con motivo registrado, **cuando** una persona local distinta de quien contó lo aprueba, **entonces** el stock total se corrige según la diferencia y se registra un movimiento de tipo `AJUSTE` en el kardex.

**Datos involucrados**: `CONTEO_FISICO` (`count_id`, `state`, `actorPerson`, fechas), `DETALLE_CONTEO` (`entity_id`, `countedQty`, `systemQtyAtClose`) y `MOVIMIENTO` (tipo `AJUSTE`, `approvedByPerson`, `reason`, `quantity`). La corrección aplica sobre `ENTIDAD.stockBalance`; no hay tabla `StockUbicacion` en el MVP.

**Decisión de diseño**: El conteo no modifica directamente las existencias. Las diferencias se corrigen mediante movimientos de ajuste aprobados y vinculados al conteo original. Se conserva la identidad de quien contó y de quien aprobó para asegurar la separación de funciones y la trazabilidad.

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
5. **Dado** un Analista de Inventario, **cuando** entra al panel, **entonces** ve los KPIs de cantidades y la valorización en modo lectura (FR-044); el rol filtra las acciones disponibles (FR-052) y la persona local identifica al responsable en auditoría y aprobaciones.

**Datos involucrados**: Lectura de `ENTIDAD` (Producto) y `MOVIMIENTO` (sin tablas nuevas). El saldo por ubicación se documenta como evolución futura en `plan.md`.

**Decisión de diseño**: La valorización usa costo promedio ponderado, que se recalcula con cada entrada.

### Historia de Usuario 8 - Transferencia entre ubicaciones (Prioridad: P2)

Como Operador de Recepción o de Despacho, quiero mover stock de una ubicación a otra dentro de la bodega, para reordenar la bodega sin hacer una salida y una entrada falsas.

**Escenarios de Aceptación**:

1. **Dado** que se transfieren 10 unidades de A-03-2 a B-01-1, **cuando** se confirma, **entonces**  el origen baja 10, el destino sube 10 y el stock total no cambia.
2. **Dado** que la cantidad supera el stock del origen, o el origen es igual al destino,**entonces** el sistema bloquea la operación.
3. **Dado** una transferencia, **entonces** aparece en el kardex como tipo TRANSFERENCIA con su origen y su destino.

**Datos involucrados**: MovimientoInventario (tipo = TRANSFERENCIA), DetalleMovimiento (ubicacion_origen_id, ubicacion_destino_id). 

---

### Historia de Usuario 9 – Auditoría e identidad local con roles de acceso (Prioridad: P3)

Como Administrador del módulo, quiero que cada acción quede registrada con la persona que la ejecuta, para poder auditar los cambios y verificar la separación de funciones, sabiendo que el rol controla la interfaz pero no reemplaza la seguridad del servidor.

**Por qué esta prioridad**: El MVP es solo frontend y no tiene autenticación real en servidor. Ocultar costos o contactos mediante un rol sería una protección que cualquier usuario podría eludir desde el navegador; por eso el rol gobierna qué pantallas y acciones se muestran (FR-052), no la confidencialidad de los datos. El 2026-11-23 se incorporó el cargo/rol al perfil de acceso local y el filtrado de la interfaz por rol (FR-050–FR-056); es una barrera visible, no seguridad, y la identidad del perfil sigue siendo la evidencia de auditoría (FR-049).

**Prueba Independiente**: Ingresar como Administrador, crear y desactivar un producto y anular un movimiento; revisar la auditoría y comprobar que aparecen la persona, la acción, la fecha y el detalle con valores anterior y nuevo. Luego realizar un conteo con una persona y aprobarlo con otra distinta.

**Escenarios de Aceptación**:

1. **Dado** cualquier creación, edición, desactivación o anulación, **entonces** queda un registro de auditoría con persona local, acción, entidad, fecha y hora, y valores anterior y nuevo cuando aplica.
2. **Dado** el MVP (solo frontend), **entonces** el rol del perfil filtra la navegación y las acciones visibles (FR-052), pero la autorización real, la confidencialidad de costos/contactos y la protección de datos deben validarse en el backend; el acceso local con rol no sustituye ese requisito.
3. **Dado** un ajuste derivado de un conteo, **entonces** la persona que aprueba debe ser distinta de quien contó, y ambos datos quedan en el movimiento.
4. **Dado** un despliegue a producción, **entonces** la autenticación, los permisos y la protección de datos sensibles deben validarse en el backend, no en la interfaz; el acceso local con rol no sustituye este requisito.

**Datos involucrados**: `PERSONA_LOCAL` (etiqueta derivada del perfil que entró), `PERFIL_ACCESO` (`username`, `role`), `AUDITORIA` (`audit_id`, `person`, `action`, `entityId`, `timestamp`, `details`) y `MOVIMIENTO` (`actorPerson`, `approvedByPerson`). El acceso local usa `erp.auth.users`/`erp.auth.session` fuera de `STORAGE_KEYS`; no es una cuenta de backend.

**Decisión de diseño**: El rol se guarda en el perfil y viaja en la sesión; la matriz de permisos en `src/roles.js` decide qué módulos, rutas y acciones se renderizan. El selector de actor queda fijo en el perfil de la sesión y el botón “+” solo agrega etiquetas para aprobaciones/separación de funciones. La auditoría se implementa en la capa de almacenamiento; el control de acceso real queda diferido al backend.
### Historia de Usuario 10 – Integración con Compras y Ventas (Prioridad: P3)

Como Analista de Inventario, quiero que las solicitudes de reposición lleguen al módulo de Compras y que los pedidos de Ventas aparezcan como despachos pendientes, para no digitar dos veces la misma información.

**Por qué esta prioridad**: Une la solicitud de reposición (HU5) con la recepción (HU2) y el pedido de venta con el despacho (HU3), cerrando el ciclo entre lo que se pide, lo que llega y lo que sale. Es P3 porque el módulo funciona sin ella.

**Prueba Independiente**: Enviar la solicitud de reposición de `PAP-CAR-075` (HU5) a Compras y verificar que queda disponible con estado "Enviada". Al emitirse la `OC-0098`, comprobar que aparece para recepción (HU2) con sus líneas precargadas y que se admite recepción parcial. Luego, un pedido de Ventas debe aparecer en "Despachos pendientes" y, al despacharlo (HU3), pasar a "Despachado".

**Escenarios de Aceptación**:

1. **Dado** una `SolicitudReposicion` generada (HU5), **cuando** se envía, **entonces** queda disponible para el módulo de Compras con su estado "Enviada".
2. **Dado** que Compras emite una orden de compra, **cuando** el operador registra la recepción (HU2), **entonces** puede seleccionar la OC y las líneas se cargan automáticamente (recepción parcial permitida).
3. **Dado** un pedido de Ventas, **entonces** aparece en "Despachos pendientes" y, al despacharlo (HU3), su estado cambia a "Despachado".

**Datos involucrados**: Claves foráneas `orden_compra_id` y `pedido_venta_id` en `MovimientoInventario`.

---

### Historia de Usuario 11 – Terminología configurable del módulo (Prioridad: P3, técnica)

Como equipo de desarrollo del ERP, queremos que los nombres del módulo, las etiquetas y los campos personalizados se definan en la configuración del módulo, para reutilizar el template y que la interfaz hable el lenguaje de bodega sin modificar el código de las pantallas.

**Por qué esta prioridad**: Facilita la reutilización y adaptación del módulo base a distintos contextos. Es P3 porque no agrega una operación de inventario, pero permite mantener una terminología consistente y evita modificar múltiples pantallas al personalizar el sistema.

**Prueba Independiente**: Configurar el nombre "Logística e Inventario" y el mapeo Entidad → "Producto" y Documento → "Movimiento de Inventario". Verificar que los botones, formularios, tablas y mensajes utilizan esos términos. Cambiar una etiqueta y comprobar que los registros existentes y la navegación siguen funcionando. Retirar el mapeo y verificar que se recuperan los términos base del template.

**Escenarios de Aceptación**:

1. **Dado** el mapeo Entidad → "Producto" y Documento → "Movimiento de Inventario", **cuando** se utiliza la aplicación, **entonces** todos los botones, tablas, formularios y mensajes correspondientes emplean esos términos.
2. **Dado** que existen registros almacenados, **cuando** se cambia una etiqueta en la configuración y se vuelve a cargar la aplicación, **entonces** la interfaz muestra la nueva terminología sin alterar los datos ni el funcionamiento de la navegación.
3. **Dado** que no se ha definido un mapeo de terminología, **cuando** se carga la aplicación, **entonces** se utilizan los términos base del template.

**Datos involucrados**: Configuración del módulo: nombre, etiquetas y definiciones de campos personalizados. No requiere nuevas entidades transaccionales.

**Decisión de diseño**: Las etiquetas visibles se obtienen de una configuración central, conservando los identificadores internos de los datos. El detalle de `module-config.js` y `userConfig.customFields` se documenta en `plan.md` y `tasks.md`.

---

### Historia de Usuario 12 – Registro con cargo/rol y acceso restringido por rol (Prioridad: P1)

Como responsable de acceso del módulo, quiero que al registrar un perfil se indique obligatoriamente el cargo/rol que cumple la persona y que al ingresar cada usuario acceda solo a la interfaz con las funciones disponibles para su cargo, para mantener la separación de funciones entre recepción, despacho, bodega y análisis, dejando al Administrador el control total del sistema.

**Por qué esta prioridad**: Sin el cargo en el registro no se puede aplicar la separación de funciones que exigen las otras historias (p. ej. que recepción no despache ni edite el catálogo, o que el analista no registre movimientos). Es transversal a todas las pantallas; sin ella, cualquier perfil accede a todo.

**Catálogo de roles (tomado de los perfiles ya documentados en el repositorio)**:

| Rol / cargo | Código | Alcance en la interfaz |
|---|---|---|
| Administrador del módulo | `admin` | Todas las funciones: catálogo, altas/ediciones/desactivaciones, entradas, salidas, transferencias, ajustes, conteos y aprobaciones, kardex, auditoría, panel, búsqueda y configuración |
| Operador de Recepción | `recepcion` | Panel, entradas y transferencias, kardex y búsqueda/consulta de catálogo; puede solicitar alta de producto. No edita el catálogo, no despacha, no aprueba conteos ni accede a auditoría |
| Operador de Despacho | `despacho` | Panel, salidas y transferencias, kardex y búsqueda/consulta de catálogo. No edita el catálogo, no recibe, no aprueba conteos ni accede a auditoría |
| Jefe de Bodega | `bodega` | Panel, entradas, salidas, transferencias, ajustes, conteos físicos y su aprobación, kardex, auditoría y consulta de catálogo. No edita el catálogo maestro |
| Analista de Inventario | `analista` | Panel con KPIs, búsqueda y consulta de catálogo/kardex en modo lectura. No crea ni modifica registros ni registra movimientos |

**Prueba Independiente**: Registrar un perfil con rol Analista e ingresar: se ve el panel, la búsqueda y la consulta de catálogo, pero no los formularios de producto ni de movimiento. Cerrar sesión, registrar/ingresar un perfil Administrador y comprobar que además ve Gestión de productos, movimientos, conteos y auditoría. Intentar abrir por URL `#/documents` con el perfil Analista y verificar que la app lo devuelve a una pantalla permitida con un aviso.

**Escenarios de Aceptación**:

1. **Dado** que se crea el primer perfil (o uno nuevo), **cuando** el formulario de registro se muestra, **entonces** el campo Cargo/Rol es obligatorio y ofrece únicamente el catálogo de roles; sin selección no se permite crear el perfil.
2. **Dado** un perfil registrado con un rol, **cuando** el usuario ingresa con sus credenciales, **entonces** la sesión carga su nombre y su rol, y el marco muestra el cargo activo.
3. **Dado** el rol Operador de Recepción, **cuando** entra al módulo, **entonces** la barra lateral y las acciones rápidas solo muestran Panel, Entradas/Transferencias, Kardex y Búsqueda; no aparecen formularios de alta/edición de producto, Salidas, Conteos ni Auditoría.
4. **Dado** el rol Operador de Despacho, **cuando** entra al módulo, **entonces** solo ve Panel, Salidas/Transferencias, Kardex y Búsqueda; no ve recepciones, ajustes, conteos ni auditoría.
5. **Dado** el rol Jefe de Bodega, **cuando** entra al módulo, **entonces** ve movimientos (entrada, salida, transferencia y ajuste), conteos con aprobación, kardex y auditoría, pero no la edición del catálogo maestro.
6. **Dado** el rol Analista de Inventario, **cuando** entra al módulo, **entonces** ve el panel de KPIs, la búsqueda y las consultas en modo lectura, sin botones de crear, editar, eliminar, registrar movimientos ni aprobar ajustes.
7. **Dado** el rol Administrador, **cuando** entra al módulo, **entonces** accede a todas las funciones sin restricción.
8. **Dado** un usuario con un rol sin permiso para una vista, **cuando** intenta abrirla por hash/URL o por una acción residual, **entonces** el sistema la bloquea y lo redirige a la primera vista permitida mostrando un aviso; nunca renderiza el contenido prohibido.
9. **Dado** un perfil ya registrado, **cuando** se quiere cambiar de rol, **entonces** debe cerrar sesión e ingresar con un perfil de ese rol; no existe selector de rol dentro del espacio de trabajo.

**Datos involucrados**: `PERFIL_ACCESO` (`username`, `salt`, `hash`, `role`), `ROL` (`code`, `label`) y `MATRIZ_PERMISOS` (`role`, permisos de módulo/acción). La sesión (`erp.auth.session`) guarda usuario y rol para reconstruir el marco al recargar.

**Decisión de diseño**: El rol se fija en el perfil al registrarse y se valida contra el catálogo; la matriz de permisos vive en `src/roles.js` y tanto la navegación como las acciones rápidas, formularios y rutas profundas se filtran con esa única fuente. En el MVP la restricción es de presentación en el navegador: la autorización real (y la confidencialidad de costos/contactos) debe aplicarse en backend al migrar de `localStorage`.

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
- **FR-046**: El sistema NO DEBE incluir en esta versión la integración con los módulos de Compras y Ventas (HU10): quedan diferidos `orden_compra_id`, `pedido_venta_id` y la demanda no atendida operativa.
- **FR-047**: El sistema DEBE aplicar control de acceso por rol sobre el catálogo y la matriz de permisos definidos en FR-050–FR-056. *(Redefinido en la sesión 2026-11-23; sustituye la decisión anterior de roles como etiquetas descriptivas.)*
- **FR-048**: El sistema DEBE permitir transferir stock entre ubicaciones de la bodega sin alterar el stock total, registrando origen y destino en el kardex.
- **FR-049**: El sistema DEBE usar la identidad del perfil autenticado como persona local en la auditoría, en el actor de los movimientos y en las aprobaciones de ajustes.

### Requisitos de Control de Acceso por Rol

> Sustituyen la decisión de 2026-11-10 («roles como etiquetas descriptivas»); ver Clarifications, sesión 2026-11-23.

- **FR-050**: El formulario de registro de perfil DEBE exigir la selección obligatoria de un Cargo/Rol del catálogo (`Administrador del módulo`, `Operador de Recepción`, `Operador de Despacho`, `Jefe de Bodega`, `Analista de Inventario`) y persistirlo junto al perfil.
- **FR-051**: El ingreso DEBE recuperar el rol del perfil autenticado y cargarlo en la sesión, mostrando el cargo activo en el marco del espacio de trabajo.
- **FR-052**: La interfaz DEBE mostrar únicamente los módulos, botones, formularios y acciones permitidos para el rol de la sesión, derivados de una única matriz de permisos.
- **FR-053**: El rol `Administrador del módulo` DEBE tener acceso irrestricto a todas las funciones del módulo.
- **FR-054**: El sistema DEBE bloquear el acceso directo por hash/URL a una vista no permitida para el rol y redirigir a la primera vista autorizada con un aviso; el contenido prohibido no DEBE renderizarse.
- **FR-055**: El rol DEBE fijarse al registrar el perfil; cambiarlo DEBE requerir cerrar sesión e ingresar con un perfil del rol deseado, sin selector de rol dentro del espacio de trabajo.
- **FR-056**: El sistema DEBE documentar y mantener el rol como control de presentación del MVP; la autorización real y la confidencialidad de datos sensibles DEBEN validarse en el backend en producción.

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
- **PerfilAcceso y Rol**: El perfil local de acceso guarda usuario, credenciales y un `role` obligatorio tomado del catálogo de cargos; la matriz de permisos asocia cada rol con los módulos y acciones visibles (FR-050–FR-056). Ver data-model.md para el catálogo y la matriz.

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
- Los roles mencionados en las historias (Administrador, Operador de Recepción, Operador de Despacho, Jefe de Bodega, Analista de Inventario) son **cargos operativos con permisos de interfaz** desde la clarificación de 2026-11-23 (FR-050–FR-056). El perfil de acceso local, creado en el primer uso, guarda el rol obligatorio y filtra la navegación y las acciones; no es autenticación real y en producción los permisos deben validarse en el backend.
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

