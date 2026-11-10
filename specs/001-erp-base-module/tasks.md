---
description: "Lista de tareas para implementar el módulo base ERP de Logística e Inventario"
---

# Tareas: Módulo Base ERP — Logística e Inventario

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`

**Prerrequisitos**: [plan.md](./plan.md) (obligatorio), [spec.md](./spec.md) (obligatorio para historias), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Pruebas**: Incluidas porque el principio II de la constitución exige pruebas automatizadas para comportamiento visible y lógica de negocio. Escribir las pruebas antes de la implementación correspondiente y verificar que fallan.

**Organización**: Tareas agrupadas por historia de usuario para permitir implementación y prueba independientes.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias de tareas incompletas)
- **[Historia]**: Historia de usuario a la que pertenece (US1…US6)
- Todas las descripciones incluyen rutas de archivo exactas

## Convenciones de Rutas

Proyecto único frontend: `src/` y `tests/` en la raíz del repositorio, según [plan.md](./plan.md).

---

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Inicializar la estructura del proyecto y las herramientas compartidas.

- [X] T001 Crear la estructura de carpetas `index.html`, `src/components/`, `tests/unit/` y `tests/integration/` según [plan.md](./plan.md)
- [X] T002 Inicializar Vite 8, Vitest 4 y jsdom con scripts `dev`, `build`, `preview` y `test` en `package.json` y `vitest.config.mjs`
- [X] T003 [P] Configurar ESLint y Prettier en `eslint.config.js` y `.prettierrc`
- [X] T004 [P] Crear `index.html` con el contenedor raíz y el punto de entrada `src/main.js`
- [X] T005 [P] Crear `src/styles.css` con tokens de diseño, layout del shell, formularios, listas y estados vacío/error

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Infraestructura central que debe existir antes de cualquier historia.

**⚠️ CRÍTICO**: Ninguna historia puede comenzar hasta completar esta fase.

- [X] T006 Implementar las formas de datos de entidad y documento, generación de identidad/marcas de tiempo y `load`/`save` en `src/storage.js`
- [X] T007 Implementar validación de entidades (`name`, `code`, `category`, `targetDate`, `reorderPoint`, `unitCost`, campos personalizados) en `src/storage.js`
- [X] T008 Implementar validación de documentos y aplicación/reversión atómica de stock para `ENTRADA`/`SALIDA` en `src/storage.js`
- [X] T009 Implementar eliminación en cascada, `searchEntities`, `getLatestLocation` y `getDashboardStats` en `src/storage.js`
- [X] T010 [P] Implementar el cargador de `src/module-config.js` con valores predeterminados, validación e informes de configuración inválida
- [X] T011 [P] Implementar utilidades DOM compartidas (`escapeHTML`, retroalimentación de validación, formato) en `src/components/dom.js`
- [X] T012 [P] Implementar el shell del espacio de trabajo (barra superior, monograma SVG, barra lateral, resaltado activo y contracción responsive) en `src/components/shell.js`
- [X] T013 Implementar el arranque de la aplicación y el enrutamiento de vistas Panel/Gestión/Búsqueda en `src/main.js` y `src/app.js`
- [X] T014 [P] Crear la configuración de pruebas Vitest/jsdom con reinicio de `localStorage` en `tests/setup.js`
- [X] T015 [P] Añadir pruebas unitarias fundacionales de almacenamiento, stock y configuración en `tests/unit/storage.test.js`, `tests/unit/stock.test.js` y `tests/unit/module-config.test.js`

**Punto de control**: La base está lista; las historias pueden comenzar.

---

## Fase 3: Historia de Usuario 1 — Parametrización y datos maestros (Prioridad: P1) 🎯 MVP

**Objetivo**: Configurar el módulo desde `module-config.js` y gestionar entidades maestras (crear, editar, eliminar, validar) con campos personalizados.

**Prueba Independiente**: El Administrador crea un producto con nombre, código, categoría y campos personalizados obligatorios, ve el error al dejar un obligatorio vacío, lo edita, lo elimina y confirma la cascada de documentos.

### Pruebas de la Historia 1

- [X] T016 [P] [US1] Añadir pruebas unitarias de alta/edición/eliminación de entidades y validación de categoría/campos personalizados en `tests/unit/storage.test.js`
- [X] T017 [P] [US1] Añadir prueba de integración de creación de entidad con campos personalizados en `tests/integration/create-entity.test.js`
- [X] T018 [P] [US1] Añadir prueba de integración de edición/eliminación de entidad con cascada de documentos en `tests/integration/edit-delete-entity.test.js`

### Implementación de la Historia 1

- [X] T019 [P] [US1] Construir el formulario de entidad con campos base y campos personalizados dinámicos en `src/components/entity-form.js`
- [X] T020 [P] [US1] Construir la lista de entidades con acciones de editar/eliminar y estado vacío en `src/components/entity-list.js`
- [X] T021 [US1] Conectar el CRUD de entidades a la vista de Gestión sin mostrar la lista de entidades en esa pantalla en `src/app.js`
- [X] T022 [US1] Renderizar los campos personalizados de `module-config.js` en formulario y lista, incluyéndolos en búsqueda y validación en `src/components/entity-form.js` y `src/components/entity-list.js`
- [X] T023 [US1] Añadir retroalimentación de validación para categoría obligatoria y fecha objetivo inválida en `src/components/entity-form.js`

**Punto de control**: La Historia 1 es funcional y comprobable de forma independiente.

---

## Fase 4: Historia de Usuario 2 — Recepción y entradas (Prioridad: P1)

**Objetivo**: Registrar productos y documentos de `ENTRADA` con ubicación física, incrementando el stock disponible.

**Prueba Independiente**: Se crea un producto, se registra una entrada de 100 unidades en Pasillo A / Estante 3 / Nivel 2, y el stock pasa a 100 con la ubicación guardada.

### Pruebas de la Historia 2

- [X] T024 [P] [US2] Añadir prueba de integración de entrada que incrementa stock y guarda ubicación en `tests/integration/inventory-movements.test.js`
- [X] T025 [P] [US2] Añadir pruebas unitarias de validación de `ENTRADA` e incremento de stock en `tests/unit/stock.test.js`

### Implementación de la Historia 2

- [X] T026 [P] [US2] Construir el formulario de documento con tipo, cantidad y ubicación en `src/components/document-form.js`
- [X] T027 [P] [US2] Construir la lista de documentos por entidad en `src/components/document-list.js`
- [X] T028 [US2] Conectar la creación de `ENTRADA` para persistir el movimiento e incrementar el stock en `src/app.js`
- [X] T029 [US2] Validar cantidad y ubicación obligatorias de `ENTRADA` con mensajes descriptivos en `src/components/document-form.js`

**Punto de control**: La recepción de inventario funciona de extremo a extremo.

---

## Fase 5: Historia de Usuario 3 — Gestión de entradas y ubicación (Prioridad: P1)

**Objetivo**: Mejorar el flujo de entrada: habilitar ubicación tras código/cantidad, cancelar sin efectos y mostrar la ubicación más reciente en el detalle del producto.

**Prueba Independiente**: A mitad de una entrada se cancela y el stock no cambia; al guardar, el detalle del producto muestra la ubicación de la entrada más reciente.

### Pruebas de la Historia 3

- [X] T030 [P] [US3] Añadir prueba de integración de cancelación sin cambio de stock y visualización de última ubicación en `tests/integration/inventory-movements.test.js`

### Implementación de la Historia 3

- [X] T031 [US3] Habilitar los campos de ubicación solo después de ingresar código de producto y cantidad en `src/components/document-form.js`
- [X] T032 [US3] Añadir cancelar/volver con confirmación de cambios sin guardar en `src/app.js`
- [X] T033 [US3] Mostrar la ubicación de la entrada más reciente en el detalle/lista de la entidad en `src/components/entity-list.js`

**Punto de control**: El flujo de entrada es seguro ante cancelaciones y localizable en el catálogo.

---

## Fase 6: Historia de Usuario 4 — Salidas y despachos (Prioridad: P1)

**Objetivo**: Procesar documentos de `SALIDA` con validación automática de existencias y descuento de stock.

**Prueba Independiente**: Se intenta una salida mayor al stock y se bloquea con alerta; con cantidad válida se guarda y el stock disminuye exactamente.

### Pruebas de la Historia 4

- [X] T034 [P] [US4] Añadir prueba de integración de bloqueo por stock insuficiente y descuento en salida válida en `tests/integration/inventory-movements.test.js`
- [X] T035 [P] [US4] Añadir pruebas unitarias de validación de `SALIDA` y decremento de stock en `tests/unit/stock.test.js`

### Implementación de la Historia 4

- [X] T036 [US4] Mostrar el stock disponible al seleccionar un producto en `src/components/document-form.js`
- [X] T037 [US4] Bloquear `SALIDA` cuando la cantidad supere el stock, mostrando alerta y deshabilitando el guardado en `src/components/document-form.js`
- [X] T038 [US4] Conectar la creación de `SALIDA` para persistir el movimiento y decrementar el stock en `src/app.js`

**Punto de control**: El despacho nunca deja stock negativo.

---

## Fase 7: Historia de Usuario 5 — Panel analítico y búsqueda (Prioridad: P1)

**Objetivo**: Mostrar KPIs de inventario (conteo, valoración, críticos), filtrar por categoría con recálculo dinámico y ofrecer la pantalla de búsqueda dedicada.

**Prueba Independiente**: El panel muestra las tres métricas; al filtrar por categoría se recalculan; al limpiar filtros vuelven los valores globales; la búsqueda dedicada devuelve resultados o estado vacío.

### Pruebas de la Historia 5

- [X] T039 [P] [US5] Añadir prueba de integración de KPIs, filtro por categoría y alerta de nivel crítico en `tests/integration/dashboard.test.js`
- [X] T040 [P] [US5] Añadir pruebas unitarias de valoración y conteo de críticos en `getDashboardStats` en `tests/unit/storage.test.js`

### Implementación de la Historia 5

- [X] T041 [P] [US5] Construir el panel con acciones rápidas y tarjetas KPI en `src/components/dashboard.js`
- [X] T042 [US5] Implementar el filtro por categoría con recálculo dinámico de KPIs y limpiar filtros en `src/components/dashboard.js` y `src/app.js`
- [X] T043 [US5] Refrescar estadísticas al mostrar el panel y renderizar la alerta de stock crítico en `src/components/dashboard.js`
- [X] T044 [US5] Construir la pantalla de búsqueda dedicada (FR-019–FR-021) con resultados y estado vacío en `src/components/search-bar.js` y `src/app.js`

**Punto de control**: El analista puede monitorear y filtrar la salud del inventario.

---

## Fase 8: Historia de Usuario 6 — Reetiquetado desde configuración (Prioridad: P1)

**Objetivo**: Derivar todas las etiquetas visibles y el ciclo de vida de documentos desde `module-config.js`, con retroceso seguro a los términos base.

**Prueba Independiente**: Con `Entidad → Producto` y `Documento → Movimiento de Inventario`, todas las pantallas usan esos términos; al quitar la configuración se usan los términos base sin romper datos.

### Pruebas de la Historia 6

- [X] T045 [P] [US6] Añadir prueba de integración de etiquetas configuradas en panel, gestión y búsqueda en `tests/integration/relabeling.test.js`

### Implementación de la Historia 6

- [X] T046 [US6] Derivar todas las etiquetas visibles de `module-config.js` en `src/components/shell.js`, `src/components/dashboard.js`, `src/components/entity-form.js`, `src/components/entity-list.js`, `src/components/document-form.js`, `src/components/document-list.js` y `src/components/search-bar.js`
- [X] T047 [US6] Aplicar `moduleName` a la barra superior/logotipo y las etiquetas a los botones de la barra lateral en `src/components/shell.js`
- [X] T048 [US6] Retroceder a los términos base Entidad/Documento, sin campos personalizados ni ciclo de vida, cuando no haya configuración en `src/module-config.js` y componentes
- [X] T049 [US6] Aplicar el ciclo de vida de estados configurado con retroceso a texto libre en `src/components/document-form.js` y `src/storage.js`
- [X] T050 [US6] Mostrar advertencias de configuración inválida o conflictiva en la UI en `src/app.js` y `src/components/shell.js`

**Punto de control**: Un módulo adaptado se presenta completamente con su propia terminología.

---

## Fase 9: Pulido y Preocupaciones Transversales

**Propósito**: Calidad, accesibilidad, rendimiento y validación final.

- [X] T051 [P] Auditar y corregir el escapado HTML de todos los datos de usuario renderizados en `src/components/`
- [X] T052 [P] Revisar accesibilidad (etiquetas, foco de teclado, `aria-current`, estructura semántica) en `src/components/`
- [X] T053 [P] Implementar la contracción responsive de la barra lateral y estilos para ventanas estrechas en `src/styles.css`
- [X] T054 [P] Verificar rendimiento de listado y búsqueda con 500 entidades y optimizar en `src/app.js` y `src/components/`
- [X] T055 Actualizar `README.md` con instalación, ejecución, pruebas y personalización vía `src/module-config.js`
- [X] T056 Ejecutar la suite completa de Vitest y el build de producción usando los scripts de `package.json`; corregir regresiones
- [X] T057 Ejecutar los escenarios de validación de [quickstart.md](./quickstart.md) y registrar los resultados

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- **Configuración (Fase 1)**: Sin dependencias; puede comenzar de inmediato.
- **Fundacional (Fase 2)**: Depende de Fase 1; bloquea todas las historias.
- **Historias (Fases 3–8)**: Dependen de Fase 2.
- **Pulido (Fase 9)**: Depende de las historias que se deseen entregar.

### Dependencias entre Historias

- **US1 (P1)**: Comienza tras Fundacional. Sin dependencias de otras historias.
- **US2 (P1)**: Depende de US1 para dar de alta el producto; requiere stock fundacional.
- **US3 (P1)**: Depende de US2 (formulario de entrada y stock).
- **US4 (P1)**: Depende de US1 y US2 (producto y stock); puede desarrollarse en paralelo con US3 si se coordina `src/app.js`.
- **US5 (P1)**: Comienza tras Fundacional con datos sembrados; su valor completo requiere US2/US4.
- **US6 (P1)**: Comienza tras Fundacional (cargador de configuración); la verificación global de etiquetas se completa después de US1–US5.

### Dentro de Cada Historia

- Las pruebas se escriben primero y deben fallar antes de implementar.
- Modelo/almacenamiento antes de servicios/UI.
- Implementación central antes de la integración en `src/app.js`.
- Completar una historia antes de pasar a la siguiente prioridad, salvo trabajo paralelo coordinado.

### Oportunidades de Paralelismo

- Fase 1: T003, T004 y T005 en paralelo.
- Fase 2: T010, T011, T012 y T014 en paralelo tras T006–T009.
- US1: T016–T020 en paralelo (pruebas y componentes en archivos distintos).
- US2: T024–T027 en paralelo.
- US4: T034–T037 en paralelo (pruebas y formulario).
- US5: T039–T041 en paralelo.
- US6: T045 en paralelo con T046–T050 tras estabilizar componentes.
- Fase 9: T051–T054 en paralelo antes de T055–T057.

---

## Ejemplo de Paralelismo: Historia de Usuario 1

```bash
# Pruebas de US1 en paralelo
Task: "Añadir pruebas unitarias de entidades en tests/unit/storage.test.js"
Task: "Añadir prueba de integración de creación en tests/integration/create-entity.test.js"
Task: "Añadir prueba de integración de edición/eliminación en tests/integration/edit-delete-entity.test.js"

# Componentes de US1 en paralelo
Task: "Construir el formulario de entidad en src/components/entity-form.js"
Task: "Construir la lista de entidades en src/components/entity-list.js"
```

---

## Estrategia de Implementación

### MVP Primero (Solo US1)

1. Completar Fase 1: Configuración.
2. Completar Fase 2: Fundacional (CRÍTICO).
3. Completar Fase 3: US1 (parametrización y datos maestros).
4. **DETENER y VALIDAR**: Probar US1 de forma independiente.
5. Demostrar si está listo.

> Primer incremento usable: **US1 + US2**, que entrega catálogo de productos y recepción de stock.

### Entrega Incremental

1. Configuración + Fundacional → base lista.
2. US1 → probar → demo (MVP de datos maestros).
3. US2 → probar → demo (recepción).
4. US3 → probar → demo (ubicación y cancelación segura).
5. US4 → probar → demo (despachos).
6. US5 → probar → demo (panel analítico y búsqueda).
7. US6 → probar → demo (módulo reetiquetado).
8. Pulido → validación final con `quickstart.md`.

### Estrategia de Equipo en Paralelo

1. El equipo completa Configuración + Fundacional en conjunto.
2. Luego:
   - Desarrollador A: US1 → US2 → US3.
   - Desarrollador B: US4 (coordinando `src/app.js` con A).
   - Desarrollador C: US5 y US6 (con componentes estabilizados).
3. Integrar y validar cada historia de forma independiente.

---

## Notas

- `[P]` indica archivos distintos y sin dependencias de tareas incompletas; tareas sobre el mismo archivo (p. ej., `src/storage.js`) no son paralelizables.
- Cada historia debe quedar completable y comprobable de forma independiente.
- Verificar que las pruebas fallan antes de implementar.
- Confirmar que ningún formulario de movimiento expone `costo_unitario` (FR-044).
- Confirmar que la valoración solo aparece en panel/catálogo.
- Evitar tareas vagas, conflictos sobre el mismo archivo y dependencias cruzadas que rompan la independencia.

---

## Phase 10: Convergence

> Hallazgos de convergencia del 2026-11-10. El código de aplicación aún no existe (`src/`, `tests/`, `index.html` ausentes) y T001–T057 permanecen sin completar. Esta fase solo añade trabajo que **no** estaba cubierto por tareas existentes; no reemplaza ni duplica T001–T057.

- [X] T058 Implementar edición y eliminación de documentos en la gestión, con pruebas unitarias e integración per FR-008, FR-018 (missing)
- [X] T059 Aplicar `theme.accentColor` como variable CSS en el shell y retroceder al color base si falta o es inválido, con prueba per FR-038 (missing)
- [X] T060 Conectar las acciones rápidas del panel para abrir Gestión con formulario vacío de entidad/documento y enfocar la búsqueda, con prueba de integración per FR-034, FR-021 (partial)
- [X] T061 Restringir la valoración y `costo_unitario` a panel/catálogo y excluirlos de los formularios de movimiento, con prueba per FR-044 (partial)
- [X] T062 Añadir un punto de extensión para reglas de validación específicas del módulo junto a las reglas base, con prueba per XR-003 (partial)
- [X] T063 Incluir `targetDate` en `searchEntities` y en los resultados de la pantalla de búsqueda, con prueba per FR-020 (partial)
- [X] T064 Enrutar el botón Documentos de la barra lateral a la gestión de documentos sin mostrar la lista de entidades, con prueba per FR-014 (partial)
- [X] T065 Gestionar la edición/eliminación de una entidad que ya no existe con un mensaje claro y sin corromper datos, con prueba per spec edge case (entidad inexistente) (missing)
- [X] T066 Preservar u ocultar sin pérdida los valores de campos personalizados ya no declarados en la configuración, con prueba per spec edge case (campos no declarados) (missing)
- [X] T067 Soportar enlaces profundos/recarga y botón atrás del navegador de forma predecible entre Panel, Gestión y Búsqueda, con prueba per spec edge case (navegación) (partial)
- [X] T068 Renderizar un estado vacío del panel cuando no hay entidades ni documentos, con prueba per spec edge case (panel vacío) (partial)
