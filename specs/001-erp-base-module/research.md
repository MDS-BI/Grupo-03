# Investigación (Phase 0): Módulo Base ERP — Logística e Inventario

**Entrada**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-10

Este documento resuelve las decisiones técnicas y de dominio necesarias antes del diseño. No quedan marcadores `NEEDS CLARIFICATION`.

## Decisión 1: Vite + HTML/CSS/JavaScript vanilla

**Decisión**: Implementar la SPA con Vite 8 como herramienta de desarrollo/build y JavaScript ES2022 sin framework de UI.

**Justificación**: El proyecto es un módulo base pequeño y didáctico; Vite ofrece recarga rápida y build simple, mientras que JavaScript vanilla mantiene el código legible y fácil de probar. Evita que los módulos personalizados hereden un framework específico.

**Alternativas consideradas**:
- React/Vue: mejor ecosistema de componentes, pero añade abstracción y dependencias innecesarias para el alcance.
- HTML estático sin bundler: más simple, pero sin servidor de desarrollo ni build de producción.

## Decisión 2: Persistencia en `localStorage`

**Decisión**: Guardar entidades y documentos en `localStorage` del navegador bajo un espacio de trabajo único.

**Justificación**: El alcance excluye backend y multiinquilino. `localStorage` cumple la persistencia, es síncrono y suficiente para ≥ 500 registros. La capa `storage.js` aísla el acceso para permitir un backend futuro sin cambiar la UI.

**Alternativas consideradas**:
- IndexedDB: mejor para grandes volúmenes, pero añade complejidad asíncrona innecesaria.
- Backend con base de datos: fuera de alcance y agrega infraestructura.

## Decisión 3: Configuración como único punto de adaptación

**Decisión**: Toda adaptación (nombre de módulo, etiquetas, campos personalizados, ciclo de vida y color de acento) se define en `src/module-config.js`; el código central no se edita.

**Justificación**: Cumple FR-023 a FR-029 y los requisitos XR-001 a XR-005. Sin configuración, la aplicación usa los valores base Entidad/Documento, sin campos personalizados ni ciclo de vida.

**Alternativas consideradas**:
- Variables de entorno: no permiten etiquetas/campos anidados de forma legible.
- Editar código por módulo: viola SC-008 (cero modificaciones al código central).

## Decisión 4: Saldo de stock en la entidad y efecto por movimiento

**Decisión**: Cada entidad mantiene un `stockBalance` numérico. Un documento de tipo `ENTRADA` suma la cantidad y uno de tipo `SALIDA` la resta, de forma atómica al guardar. Una salida con cantidad mayor al saldo se rechaza.

**Justificación**: FR-040, FR-042 y FR-043 exigen un saldo por entidad y validación de existencias. Mantener el saldo en la entidad evita recalcular todo el historial en cada render y soporta 500 registros.

**Alternativas consideradas**:
- Calcular el saldo sumando todos los movimientos en cada lectura: correcto pero costoso y propenso a errores de rendimiento.
- Inventario negativo permitido: rechazado explícitamente por FR-042.

## Decisión 5: Ubicación física por movimiento de entrada

**Decisión**: `pasillo`, `estante` y `nivel` se almacenan en cada documento de Entrada. El detalle del producto muestra la ubicación del documento de entrada más reciente, derivada en lectura y sin duplicarla en la entidad.

**Justificación**: Responde a la clarificación del 2026-11-10 y a FR-041. Conserva historial de ubicaciones y evita inconsistencias entre entidad y movimientos.

**Alternativas consideradas**:
- Ubicación única en la entidad: pierde historial y contradice "asociados al registro actual".
- Duplicar ubicación en entidad y documento: riesgo de desincronización.

## Decisión 6: Valoración con `costo_unitario` opcional

**Decisión**: La entidad admite un `costo_unitario` opcional. El KPI de valoración total se calcula como `Σ(stockBalance × costo_unitario)` y se muestra solo en el panel y el catálogo. Los formularios de Entrada/Salida no incluyen campos de costo.

**Justificación**: Resuelve la contradicción entre la historia del Analista (valoración) y la prohibición de datos financieros en las historias de operación. Mantiene el KPI sin exponer costos en los flujos de movimiento.

**Alternativas consideradas**:
- Eliminar el KPI: pierde un requisito de la historia del Analista.
- Costo global en configuración: menos realista y no refleja productos distintos.

## Decisión 7: Categoría obligatoria y sin autenticación

**Decisión**: `category` es obligatoria al crear una entidad. Los roles (Administrador, Operador de Recepción, Operador de Despacho, Analista) son etiquetas descriptivas; no se implementa login ni permisos.

**Justificación**: Alinea FR-001 con la historia del Administrador y habilita el filtro por categoría del Analista. La ausencia de autenticación respeta la suposición de espacio único y `localStorage`.

**Alternativas consideradas**:
- Categoría opcional: obliga a manejar "sin categoría" en KPIs y filtros.
- Autenticación local completa: fuera del alcance del módulo base y añade gestión de usuarios.

## Decisión 8: Documento de inventario sin rango de fechas

**Decisión**: Un documento contiene `entity_id`, `type` (`ENTRADA`/`SALIDA`), `quantity`, `location` (solo Entrada), `notes` opcional, `status` y una marca de tiempo `createdAt` automática. No admite `startDate`/`endDate`.

**Justificación**: Los movimientos de inventario son eventos puntuales. Elimina la ambigüedad del caso límite de fechas invertidas y simplifica la validación.

**Alternativas consideradas**:
- Rango de fechas genérico: útil para documentos tipo contrato, pero no para movimientos y añade validación innecesaria.

## Decisión 9: Pruebas con Vitest + jsdom

**Decisión**: Usar Vitest 4 con entorno jsdom, con pruebas unitarias para `storage.js` y `module-config.js`, y de integración para flujos de UI.

**Justificación**: Cumple el principio constitucional II (Test-First). `fileParallelism: false` en `vitest.config.mjs` evita interferencias de `localStorage` compartido entre archivos.

**Alternativas consideradas**:
- Jest: viable, pero Vitest ya está configurado y se integra con Vite.
- Solo pruebas manuales: no cumple la constitución.

## Decisión 10: Renderizado seguro y accesible

**Decisión**: Escapar HTML y atributos al renderizar datos de usuario; usar controles nativos, etiquetas asociadas, foco visible y `aria-current` en la navegación; la barra lateral se contrae a iconos en anchos reducidos.

**Justificación**: La suposición de seguridad de la spec exige prevenir XSS; el principio III exige accesibilidad y consistencia. Los controles nativos reducen superficie de error.

**Alternativas consideradas**:
- `innerHTML` directo con datos de usuario: riesgo de XSS.
- Widgets personalizados complejos: mayor coste de accesibilidad y mantenimiento.
