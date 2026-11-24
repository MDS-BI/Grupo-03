# Contrato de Interfaz de Usuario

**Feature**: `001-erp-base-module` | **Spec**: [../spec.md](../spec.md) | **Fecha**: 2026-11-23

## Propósito

Definir pantallas, navegación y comportamiento observable de la SPA. Las etiquetas provienen de [module-config.md](./module-config.md). El acceso local exige un cargo/rol al registrar el perfil y filtra la interfaz con la matriz de permisos (FR-050–FR-056); el usuario del perfil es la persona local activa para auditoría y aprobaciones (FR-049). La integración con Compras y Ventas (HU10) queda fuera de este contrato (FR-046).

## Acceso local (registro con cargo/rol)

- Pantalla inicial con formulario de registro en el primer uso y de ingreso después; usuario y contraseña (mínimo 4 caracteres) se guardan en `erp.auth.users`, sesión en `erp.auth.session`.
- **El registro exige seleccionar Cargo/Rol** de un desplegable obligatorio con: Administrador del módulo, Operador de Recepción, Operador de Despacho, Jefe de Bodega, Analista de Inventario. Sin rol no se crea el perfil y se muestra un error accesible.
- El ingreso recupera usuario y rol y los carga en la sesión; el cargo activo es visible en el marco.
- Usuario/contraseña incorrectos muestran error accesible; “Salir” cierra la sesión y vuelve al formulario.
- El perfil que entra se registra como **persona local** y queda fijo en el marco; el botón “+” solo agrega etiquetas locales para aprobaciones/separación de funciones, sin cambiar al actor de la sesión.
- No hay selector de rol dentro del espacio de trabajo: para actuar con otro cargo se cierra sesión y se ingresa con un perfil de ese rol (FR-055).
- Es una barrera del navegador, no autenticación de servidor: la autorización real se valida en backend (FR-056).

## Marco persistente (workspace shell)

- Barra superior con logotipo monograma SVG derivado de `moduleName`, nombre del módulo y **cargo activo**.
- Selector de **persona local** disponible en el marco pero deshabilitado: muestra al perfil de la sesión y su etiqueta se usa en auditoría y movimientos (FR-049).
- Barra lateral con módulos filtrados por rol; el activo se resalta (`aria-current`).
- En anchos reducidos la barra lateral se contrae a iconos manteniéndose operable.
- El marco permanece visible en todas las pantallas una vez superado el acceso local.

## Control de acceso por rol

| Rol | Navegación visible | Acciones disponibles | Acciones ocultas/bloqueadas |
|---|---|---|---|
| Administrador del módulo | Panel, Gestión (entidades y movimientos), Búsqueda, Auditoría | Todas | — |
| Operador de Recepción | Panel, Gestión › Movimientos (entrada, transferencia), Búsqueda | Entrada, transferencia, solicitar alta de producto | Editar catálogo, salida, ajuste, conteos, aprobar, anular, auditoría |
| Operador de Despacho | Panel, Gestión › Movimientos (salida, transferencia), Búsqueda | Salida, transferencia | Editar catálogo, entrada, ajuste, conteos, aprobar, anular, auditoría |
| Jefe de Bodega | Panel, Gestión › Movimientos y Conteos, Búsqueda, Auditoría | Entrada, salida, transferencia, ajuste, conteo y aprobación, anular | Crear/editar/desactivar catálogo |
| Analista de Inventario | Panel, Búsqueda | Consulta y KPIs (lectura) | Crear, editar, eliminar, registrar movimientos, conteos, auditoría |

- La barra lateral, las acciones rápidas del panel, los formularios y el guardia de rutas consultan `src/roles.js`; no hay listas duplicadas.
- **Ruta no permitida**: si el hash/URL apunta a una vista sin permiso, no se renderiza el contenido; se redirige a la primera vista autorizada (Panel o Búsqueda) y se muestra un aviso accesible (FR-054).
- El Administrador es comodín: recibe todas las claves de permiso, presente y futuras.

## Pantallas

### 1. Panel (Dashboard)
| Elemento | Comportamiento |
|----------|----------------|
| Acciones rápidas | Al menos: nueva entidad, nuevo documento/movimiento, abrir gestión y buscar registros |
| Nueva entidad / nuevo movimiento | Abre Gestión con formulario vacío enfocado |
| KPIs | N° entidades activas, valoración total `Σ(stock×unitCost)` (solo panel/catálogo), N° en alerta, productos sin movimiento en 90 días |
| Alertas de reposición | Productos con stock ≤ punto de reorden (rojo si 0, amarillo si bajo punto) con cantidad sugerida editable |
| Solicitud de reposición | Genera solicitud agrupada por proveedor a partir de selección |
| Filtros | Recalculan KPIs y tabla; filtro activo visible; limpiar filtros restaura vista global |
| Actualización | Se refresca al mostrar el panel |

### 2. Gestión (Entidades y Movimientos)
| Elemento | Comportamiento |
|----------|----------------|
| Formulario de entidad | Crear/editar nombre, código (SKU), categoría, unidad, punto de reorden, descripción, fecha objetivo, `costo_unitario` opcional y campos personalizados; desactivar entidad con historial |
| Eliminación de entidad | Si no tiene historial: permite eliminar. Si tiene historial: bloquea eliminación y ofrece solo desactivación (conserva historial) |
| Formulario de movimiento | Registrar borrador/confirmación de Entrada, Salida, Transferencia y Ajuste según reglas; ubicación en entradas; origen/destino en transferencias; motivo cuando aplique |
| Inmutabilidad | Movimientos confirmados no se editan ni eliminan; se corrigen por anulación con contramovimiento. Borradores pueden editarse/cancelarse |
| Conteos físicos | Conteo ciego, cierre con diferencias y ajustes con motivo obligatorio; la aprobación exige persona local distinta de quien contó (FR-049) |
| Kardex/historial | Consulta cronológica por entidad con filtros (fecha/tipo), saldo, ubicación y persona local responsable; accesible desde gestión/detalle |
| Auditoría | Creación, edición y desactivación de entidades quedan registradas con persona local y fecha (HU1#4) |
| Lista de entidades | No se muestra como listado principal en esta pantalla (FR-016); gestión se enfoca en formularios/acciones |
| Validación | Bloquea guardados inválidos con mensajes descriptivos (campos obligatorios, SKU duplicado, stock insuficiente, etc.) |

### 3. Búsqueda
| Elemento | Comportamiento |
|----------|----------------|
| Búsqueda | Por nombre, código, categoría, descripción, fecha objetivo y campos personalizados |
| Filtros | P. ej. categoría; resultados claros |
| Estado vacío | Mensaje claro cuando no hay coincidencias |
| Resultados | Lectura/detalle; edición en Gestión |
| Acceso | Desde barra lateral y acción rápida del panel |

## Navegación y Estado

- Una sola pantalla visible a la vez; navegación interna sin recarga completa.
- Botón atrás del navegador con comportamiento predecible; enlaces profundos/recarga renderizan la pantalla solicitada.
- Datos intactos al navegar (FR-022, SC-007).
- Salir de formularios con cambios sin guardar requiere confirmación.

## Etiquetado e identidad local

- Todas las etiquetas visibles derivan de `labels` (FR-029); fallback a términos base (FR-024).
- La visibilidad de costos y valorización se rige por FR-044 (panel y catálogo); el rol no altera qué datos se muestran, solo qué acciones y pantallas se habilitan (FR-052).
- El selector de persona local, fijado al perfil que entró, identifica al responsable de movimientos, conteos y auditoría; el aprobador se elige por separado entre las etiquetas agregadas (FR-049).

## Estados de retroalimentación

| Estado | Requisito |
|--------|-----------|
| Validación | Mensaje descriptivo por campo; foco en primer error |
| Vacío | Mensaje claro con acción sugerida |
| Carga | Indicador no bloqueante |
| Error de configuración | Aviso visible sin romper la app (FR-025) |
| Stock insuficiente | Alerta y guardado/confirmación bloqueados según corresponda (FR-042) |
| Acceso denegado por rol | Aviso claro y redirección a la primera vista permitida; nunca se muestra la pantalla prohibida (FR-054) |
| Inmutabilidad | Indicación clara de que un movimiento confirmado solo puede anularse |

## Accesibilidad y seguridad

- Controles nativos con `<label>`, teclado completo, foco visible.
- Contraste suficiente y texto alternativo en logotipo.
- Todo dato de usuario escapado antes de insertarse en el DOM (prevención XSS); sin `innerHTML` con datos sin sanitizar.

## Rendimiento observable

- Listados y búsqueda usables con ≥ 500 entidades (FR-032); sin bloqueos perceptibles en interacción/navegación.
