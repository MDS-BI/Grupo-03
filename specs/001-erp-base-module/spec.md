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

## Escenarios de Usuario y Pruebas *(obligatorio)*

Historia de Usuario 1 — Parametrización del ERP y Datos Maestros de Entidades (Prioridad: P1)
Como Administrador del ERP,

quiero configurar las reglas globales del sistema en module-config.js y crear entradas maestras de entidades (Productos/Proveedores) con atributos personalizados y reglas de validación,

para asegurar la integridad de los datos maestros y permitir que el resto del equipo opere sobre un catálogo estandarizado y libre de errores.

Por qué esta prioridad: Es la base del sistema. Sin la parametrización de etiquetas, campos personalizados y validaciones maestras del Administrador, los Operadores y Analistas no pueden ingresar ni procesar la información de inventario correctamente.

Prueba Independiente: El Administrador puede abrir el módulo de parametrización/entidades, configurar un campo personalizado o registrar una nueva entidad maestra con sus atributos requeridos, y verificar que el sistema aplique las reglas de validación y la muestre correctamente en la lista global.

Escenarios de Aceptación:

Dado que el Administrador está en el formulario de creación de entidades maestras, cuando ingresa todos los campos obligatorios (Nombre, Código/SKU, Categoría y parámetros del userConfig), entonces la nueva entidad se guarda exitosamente, aparece en la lista principal y queda disponible para las operaciones de bodega.

Dado que el Administrador está registrando o parametrizando una entidad, cuando deja información obligatoria en blanco (como el Nombre o Código/SKU) o ingresa un tipo de dato inválido en un campo personalizado, entonces el sistema bloquea el guardado y despliega un mensaje descriptivo explicando qué datos se requieren.

Dado que el Administrador actualiza la configuración en module-config.js (nombres de módulo, etiquetas o campos personalizados para productos/proveedores), cuando se carga la aplicación, entonces la interfaz adapta dinámicamente las etiquetas, vistas y formularios de entidades según la nueva configuración sin romper los registros existentes.

Mapeo Técnico para tu Implementación (Fichas de Apoyo para tu entrega)
Como te corresponde module-config.js y el alta de Entidades Maestras, en tu parte del código de SpecKit asegúrate de definir lo siguiente en la configuración del modulo base:

Módulo Name: Módulo de Logística e Inventario

Labels (Entidad): Producto / Proveedor (artículo: el)

Custom Fields (en userConfig.customFields):

sku (tipo text, requerido)

punto_reorden (tipo number, requerido)

unidad_medida (tipo select con opciones: Unidades, Cajas, Kg, Litros)
---

### Historia de Usuario 2 - Operador de Bodega (Recepción y Entradas) — Operador de Almacén (Inbound) (Prioridad: P1)
Como Operador de Recepción, quiero dar de alta entidades de productos y registrar documentos de Entrada de Inventario asignando la ubicación física (pasillo, estante, nivel), para actualizar el stock disponible sin manejar datos financieros ni valores de costo

**Por qué esta prioridad**:Es la puerta de entrada del inventario: sin recepción de stock registrada, no existe stock disponible y las demás funciones del sistema (despachos, consultas, reportes, valorización) no tienen datos sobre los cuales operar.
Es una dependencia directa de otras historias de usuario, como la salida de inventario o la consulta de existencias.
Impacta la precisión del inventario desde el origen: un error en la entrada se propaga a todo el flujo posterior.
La asignación de ubicación física permite localizar el producto desde el momento en que llega, reduciendo tiempos de búsqueda y pérdidas.

**Prueba Independiente**: Iniciar sesión con un usuario de rol Operador de Recepción.
Dar de alta un producto nuevo (por ejemplo, “Caja de tornillos 5 mm”).
Registrar un documento de Entrada de Inventario con 100 unidades y asignar la ubicación Pasillo A, Estante 3, Nivel 2.
Verificar que el stock disponible del producto sea 100 y que su ubicación quede registrada.
Confirmar que en ningún formulario ni pantalla aparecen campos de costo, precio o valores financieros.

**Escenarios de Aceptación**:

1. Dado que el operador está autenticado y el producto no existe en el sistema
Cuando completa el formulario de alta con los datos operativos obligatorios (código, nombre, unidad de medida) y lo guarda
Entonces el producto queda registrado y disponible para ser usado en entradas de inventario.
2. Dado que existe un producto registrado
Cuando el operador crea un documento de Entrada de Inventario indicando producto, cantidad, pasillo, estante y nivel
Entonces el sistema genera el documento de entrada, incrementa el stock disponible en la cantidad recibida y guarda la ubicación física asignada
3. Dado que el operador está registrando una entrada
Cuando intenta guardar sin indicar cantidad o ubicación
Entonces el sistema impide el guardado y muestra un mensaje indicando los campos faltantes

---

### Historia de Usuario 3 - Gestión de Entradas y Ubicación en Bodega (Prioridad: P1)

Como Operador 1 de Recepción, quiero registrar documentos de Entrada de Stock y asignar la ubicación física (pasillo, estante, nivel) a los productos ingresados, para mantener actualizada la disponibilidad operativa en bodega sin manipular valores monetarios o financieros.

**Por qué esta prioridad**: Esto preserva el valor operativo central del módulo de logística, siendo el punto de partida esencial para tener existencias en el sistema; sin recepciones físicas, el resto de las operaciones del almacén (como el despacho o los niveles de alerta) no pueden funcionar.

**Prueba Independiente**: Como operador 1, se abre la aplicación, navega a la pantalla de recepción, registra el ingreso de un lote de productos asignando pasillo y estante, guarda el documento, y comprueba que el stock disponible del producto aumente de inmediato en el inventario general sin tener acceso a datos de costos.

**Escenarios de Aceptación**:

1. **Dado** que el operador 1 está en el formulario de Entrada de Stock, **cuando** ingresa el código del producto y la cantidad recibida, **entonces** el sistema habilita las opciones para seleccionar la ubicación en la bodega.
2. **Dado** que la sección de ubicación está visible, **cuando** el operador 1 selecciona o escribe el pasillo, estante y nivel, **entonces** estos datos quedan asociados temporalmente al registro actual.
3. **Dado** que se tiene una entrada de mercancía con la cantidad y ubicación completadas, **cuando** el operador 1 guarda el registro, **entonces** el documento se emite con éxito en el sistema.
4. **Dado** un documento de Entrada de Stock recién guardado, **cuando** se consulta la tabla principal de productos, **entonces** el stock disponible de ese ítem aumenta exactamente en la cantidad ingresada.
5. **Dado** un documento de Entrada de Stock recién guardado, **cuando** se revisa el detalle del producto, **entonces** la nueva ubicación física asignada se muestra correctamente para facilitar su futura búsqueda.
6. **Dado** que el operador 1 está en medio del llenado de una Entrada de Stock, **cuando** presiona el botón de cancelar o volver, **entonces** no se guarda ningún cambio y el stock del inventario permanece inalterado..

---

### Historia de Usuario 4 - Gestión de Salidas y Despachos (Prioridad: P1)

Como Operador 2 de Despacho, quiero procesar documentos de Salida de Inventario con validación automática de existencias, para garantizar que no se registren despachos ni transferencias cuando el stock disponible sea insuficiente.

**Por qué esta prioridad**: Este proceso es vital para el ciclo final de la cadena de suministro. Sin un control riguroso de las salidas y la validación en tiempo real del stock, el sistema permitiría la existencia de inventario negativo, lo que compromete la fiabilidad de los datos, la planificación y el cumplimiento de entregas.

**Prueba Independiente**: Como operador 2, se abre la aplicación, navega a la pantalla de despachos, registra una salida intentando ingresar una cantidad superior a la existencia de un producto, verifica que el sistema bloquea la acción con una alerta. Luego, ajusta a una cantidad válida, guarda el documento y comprueba que el stock disponible del producto disminuye de inmediato en el inventario general.

**Escenarios de Aceptación**:

1. **Dado** que el operador 2 está en el formulario de Salida de Inventario, **cuando** selecciona un producto a despachar, **entonces** el sistema muestra de manera visible la cantidad de stock disponible actual para ese ítem.
2. **Dado** que el operador 2 está ingresando los detalles de la salida, **cuando** ingresa una cantidad que supera el stock disponible del producto, **entonces** el sistema muestra una alerta de error por inventario insuficiente y deshabilita el botón para guardar el documento.
3. **Dado** que se ha seleccionado un producto y una cantidad válida (menor o igual al stock), **cuando** el operador 2 guarda el registro, **entonces** el documento de Salida de Inventario se emite con éxito en el sistema.
4. **Dado** un documento de Salida de Inventario recién guardado, **cuando** se consulta la tabla principal de productos, **entonces** el stock disponible de ese ítem disminuye exactamente en la cantidad despachada.
5. **Dado** que el operador 2 está en medio del llenado de una Salida de Inventario, **cuando** presiona el botón de cancelar o volver, **entonces** no se genera el documento y el stock del inventario permanece inalterado.

---

### Historia de Usuario 5 - Agrupación analítica y paneles estadísticos de stock (Prioridad: P1)

Como Analista 1 de Inventarios, quiero categorizar el catálogo de productos y visualizar indicadores clave (KPIs) de conteo de registros, valoración de stock y productos con nivel crítico, para monitorear la salud operacional del almacén en el panel principal.

**Por qué esta prioridad**: El análisis de datos y la visualización del estado del inventario son fundamentales para la toma de decisiones ágiles. Sin un panel estadístico claro y categorizado, el equipo no puede detectar rápidamente quiebres de stock, inmovilización de capital ni evaluar la salud global del almacén.

**Prueba Independiente**: El Analista 1 abre la aplicación, visualiza el panel principal con las tarjetas de estadísticas globales, filtra la vista seleccionando una categoría de productos específica, y comprueba que las tarjetas de KPIs (conteo, valoración y niveles críticos) se recalculan dinámicamente al instante para reflejar solo los datos de esa categoría elegida.

**Escenarios de Aceptación**:

1. **Dado** que el Analista 1 inicia sesión con el rol de Analista de Inventarios, **cuando** aterriza en la página principal, **entonces** el sistema le muestra un Dashboard con tarjetas de estadísticas que resumen el inventario total.
2. **Dado** que el Analista 1 está en el panel principal, **cuando** observa los KPIs, **entonces** debe visualizar claramente al menos tres métricas: total de registros (productos), valoración total del stock y cantidad de productos con stock en nivel crítico.
3. **Dado** que el Analista 1 está gestionando el catálogo, **cuando** crea o edita un producto, **entonces** el sistema le permite asignarle una categoría específica a través de una lista desplegable.
4. **Dado** que el panel principal cuenta con una herramienta de búsqueda o filtro, **cuando** el Analista 1 selecciona una categoría específica, **entonces** el listado de productos de la tabla se actualiza para mostrar únicamente los ítems correspondientes a esa categoría.
5. **Dado** que el Analista 1 ha filtrado la vista por una categoría, **cuando** revisa las tarjetas de estadísticas superiores, **entonces** los valores de conteo, valoración y nivel crítico se recalculan dinámicamente excluyendo los datos de las demás categorías.
6. **Dado** que el stock de un producto cae por debajo de su umbral de seguridad, **cuando** el sistema actualiza la base de datos, **entonces** el indicador de "productos con nivel crítico" en el panel del Analista aumenta automáticamente y muestra una alerta visual.
7. **Dado** que el Analista 1 tiene un filtro de categoría activo, **cuando** presiona un botón para "limpiar filtros", **entonces** el panel y los KPIs vuelven a mostrar los valores globales de todo el inventario de la bodega.

---

## Historia de Usuario 6 - Reetiquetar pantallas desde la configuración de Logística e Inventario (Prioridad: P1)

**Estudiante Asignado:** Estudiante 6

Como usuario de logística y desarrollador del módulo, quiero que todas las etiquetas visibles deriven de la configuración en `module-config.js` mapeando "Entidad" a "Producto / Insumo" y "Documento" a "Movimiento de Inventario", para que la interfaz hable el lenguaje operacional de bodega y distribución en todo momento.

Por qué esta prioridad: Los operadores y analistas de bodega confían en un sistema que hable de "Productos", "Stock" y "Movimientos de Entrada/Salida" en lugar de términos genéricos como "Entidad" o "Documento". Una terminología inconsistente genera confusión operacional durante la recepción y despacho.

Prueba Independiente: Un usuario configura el mapeo Entidad -> "Producto" y Documento -> "Movimiento de Inventario", verificando que cada botón, tabla, pestaña, formulario y mensaje del sistema refleje dichos términos operativos.

Escenarios de Aceptación:
1. Dados los mapeos definidos en `userConfig` (Entidad = "Producto", Documento = "Movimiento de Inventario"), cuando cualquier pantalla carga, entonces los botones de navegación, formularios de stock y mensajes de estado vacío muestran los términos adaptados a logística.
2. Dado que las etiquetas han sido remapeadas a terminología de bodega, cuando el usuario navega entre pantallas de catálogo y movimientos, entonces la lógica de persistencia y navegación se mantiene intacta.
3. Dado que no se proporcionan mapeos específicos, cuando el sistema carga, entonces se utilizan los términos base predeterminados del módulo ERP.
---

### Casos Límite

- ¿Qué ocurre cuando un usuario intenta guardar una entidad sin nombre o código obligatorio?
- ¿Cómo gestiona el sistema una búsqueda que no devuelve coincidencias?
- ¿Qué ocurre si un usuario intenta editar o eliminar una entidad que ya no existe?
- ¿Qué ocurre cuando un usuario introduce una fecha objetivo que no es una fecha de calendario válida?
- ¿Qué ocurre con los documentos de una entidad cuando esta se elimina?
- ¿Qué ocurre cuando un usuario introduce una fecha final anterior a la fecha inicial en un documento?
- ¿Qué ocurre cuando la configuración declara un campo personalizado cuya clave choca con un nombre de campo base?
- ¿Qué ocurre cuando la configuración referencia un tipo de campo desconocido o una definición de transición de ciclo de vida inválida?
- ¿Qué ocurre cuando los registros almacenados contienen valores de campos personalizados que ya no están declarados en la configuración?
- ¿Qué ocurre cuando un usuario abre la aplicación directamente en la pantalla de gestión o búsqueda (p. ej., vía enlace profundo o recarga del navegador) sin pasar por el panel de inicio?
- ¿Qué ocurre cuando un usuario pulsa el botón atrás del navegador estando en la pantalla de gestión o búsqueda?
- ¿Qué ocurre si un usuario navega fuera de la pantalla de gestión mientras un formulario aún tiene cambios sin guardar?
- ¿Permanecen intactas las entidades y los documentos al navegar entre el panel, la gestión y la búsqueda?
- ¿Qué ocurre cuando el panel se abre con cero entidades o cero documentos (valores estadísticos)?
- ¿Qué ocurre cuando el color de acento configurado no es un valor de color válido?
- ¿Cómo mantiene la barra lateral contraída las etiquetas de módulo accesibles en ventanas gráficas estrechas?

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir a los usuarios crear un registro de entidad con al menos un nombre y un código.
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
- **FR-041**: El sistema DEBE registrar la ubicación física de los productos recibidos mediante pasillo, estante y nivel, y mostrarla en el detalle del producto.
- **FR-042**: El sistema DEBE impedir registrar una Salida de Inventario cuya cantidad supere el stock disponible de la entidad, mostrando un mensaje de error descriptivo.
- **FR-043**: El sistema DEBE clasificar cada documento de inventario por tipo (Entrada o Salida) y aplicar el efecto correspondiente sobre el saldo de stock.

### Requisitos de Extensibilidad *(obligaciones del módulo base)*

Los módulos personalizados construidos sobre esta base DEBEN poder:

- **XR-001**: Extender los registros de entidad y documento con campos adicionales específicos del dominio sin cambiar la estructura de almacenamiento base.
- **XR-002**: Reetiquetar pantallas, pestañas, formularios y listas con terminología específica del módulo sin alterar el comportamiento de navegación.
- **XR-003**: Añadir reglas de validación específicas del módulo junto a las reglas de validación base.
- **XR-004**: Apoyarse en el módulo base para generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, y eliminación en cascada.
- **XR-005**: Remarcar el espacio de trabajo —nombre del módulo, logotipo derivado y color de acento— únicamente mediante configuración.

### Entidades Clave *(incluir si la funcionalidad implica datos)*

- **Entidad**: Un registro de datos maestros gestionado por el módulo, que incluye su nombre, código de negocio, detalles descriptivos, categoría de clasificación, una fecha objetivo opcional, un entity_id autogenerado, un saldo de stock disponible y, cuando aplica, unidad de medida, punto de reorden y ubicación física (pasillo, estante, nivel). Los módulos personalizados definen qué representa una Entidad en el mundo real (p. ej., cliente, producto, activo).
- **Documento**: Detalles transaccionales adjuntos a una entidad, vinculados a ella por el entity_id de la entidad, clasificados por tipo (p. ej., Entrada o Salida de Inventario) y con la cantidad que afecta el saldo de stock. Los módulos personalizados definen qué representa un Documento (p. ej., pedido, factura, contrato).
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

