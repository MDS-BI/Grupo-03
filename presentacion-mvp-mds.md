# Presentación MVP — Módulo ERP de Logística e Inventario (SCM)

**Curso:** Modelación de Sistemas 2026-2 · Universidad de Concepción · Departamento de Ingeniería Industrial
**Grupo:** 03 · **Duración total:** 5 minutos (más preguntas y respuestas)
**Formato:** 9 diapositivas, una sola persona presenta (elegida al azar el día de la presentación)

> Guion listo para pegar en ChatGPT Canvas. Cada diapositiva incluye títulos, viñetas visibles y notas del presentador. El tiempo indicado es acumulado.

---

## Diapositiva 1 — Portada (0:00 – 0:20)

**Título:** Módulo ERP de Logística e Inventario (SCM)

**Subtítulo:** MVP desarrollado con Spec Driven Development · Modelación de Sistemas 2026-2

**En pantalla:** Universidad de Concepción · Facultad de Ingeniería · DII · Grupo 03

**Notas del presentador:**
"Buenos días. Presentamos el MVP de un módulo ERP de Logística e Inventario, construido sobre la plantilla del curso usando Spec Driven Development. La demo es solo frontend, con persistencia local. En cinco minutos recorreremos el problema, la solución, el modelo de datos, las decisiones metodológicas, el manejo de riesgos y la proyección futura, y cerraremos con una demo rápida."

**Mensaje clave:** Un módulo ERP reutilizable, hablado en lenguaje de bodega.

---

## Diapositiva 2 — El problema y los usuarios (0:20 – 0:55)

**Título:** ¿Qué problema resuelve?

- **Duplicidad de maestros:** «Resma Carta» y «RESMA carta 75g» dividen el stock y rompen los reportes.
- **Sin trazabilidad:** entradas y salidas sin documento ni responsable; no se puede reconstruir el saldo.
- **Decisiones sesgadas:** conteos viendo el saldo del sistema (anclaje), KPIs con historiales cortos y costos expuestos sin control.

**Usuarios potenciales:** Administrador, Operador de Recepción, Operador de Despacho, Jefe de Bodega y Analista de Inventario.

**Notas del presentador:**
"El problema no es solo tecnológico: es de confianza en los datos. Un catálogo duplicado fragmenta el inventario; una salida sin documento impide auditar; y un conteo hecho mirando el saldo esperado repite el sesgo de anclaje. Por eso definimos cinco perfiles de usuario, desde quien recibe mercancía hasta quien decide reposiciones. En el MVP no hay selector de rol: esos perfiles son los usuarios potenciales y la identidad real se elige en un selector local de persona, usado solo para auditoría."

**Mensaje clave:** Datos confiables = catálogo único + trazabilidad + conteos sin sesgo.

---

## Diapositiva 3 — La solución (0:55 – 1:30)

**Título:** MVP propuesto

- SPA con **Vite + HTML + CSS + JavaScript vanilla**, persistencia en `localStorage`.
- Adaptación declarativa en `src/module-config.js`: nombre, etiquetas, campos, ciclo de vida y color de acento, **sin tocar el núcleo**.
- Alcance: catálogo, movimientos, kardex, conteos, indicadores y reposición.
- Fuera de alcance: integración con Compras y Ventas (HU10) y autenticación real.

**Notas del presentador:**
"La solución es un MVP deliberadamente pequeño: una aplicación de una sola página, sin backend, que corre con `npm install` y `npm run dev`. La personalización al dominio de bodega ocurre en un único archivo de configuración, de modo que el módulo base pueda reutilizarse en otros contextos. Dejamos fuera la integración con Compras y Ventas y el login, porque en un frontend esos controles se pueden eludir; quedan documentados como evolución futura."

**Mensaje clave:** Configuración sobre código; complejidad donde aporta valor.

---

## Diapositiva 4 — Funcionalidad del módulo (1:30 – 2:10)

**Título:** Lo que el usuario puede hacer

- **Catálogo maestro:** SKU normalizado y único, categoría, unidad, punto de reorden, costo opcional y proveedor con RUT validado.
- **Movimientos:** Entrada (con ubicación pasillo-estante-nivel y documento de respaldo), Salida (validación de stock y sugerencia FIFO), Transferencia y Ajuste.
- **Kardex:** historial cronológico con saldo acumulado, filtros y documentos confirmados inmutables.
- **Panel:** KPIs, alertas de reposición, filtros por categoría y período, rotación y cobertura.

**Notas del presentador:**
"El flujo operativo es completo: dar de alta un producto, recibirlo con su ubicación, despacharlo sin dejar stock negativo, transferirlo entre pasillos y corregir diferencias mediante ajustes aprobados. El kardex reconstruye el saldo en cualquier momento. Ningún movimiento confirmado se edita: los errores se corrigen con un contramovimiento vinculado, como en contabilidad."

**Mensaje clave:** Operación diaria cubierta de extremo a extremo.

---

## Diapositiva 5 — Modelo entidad-relación (2:10 – 2:45)

**Título:** Modelo de datos

**En pantalla:** imagen `docs/mer-logistica-inventario.png`

- `ENTIDAD` (Producto) 1 — 0..* `MOVIMIENTO`; `PROVEEDOR` y `CATEGORIA` referenciados.
- `MOVIMIENTO` se anula a sí mismo mediante `voidsMovementId` (contramovimiento).
- `CONTEO_FISICO` → `DETALLE_CONTEO`; `SOLICITUD_REPOSICION` → su detalle.
- `PERSONA_LOCAL` y `AUDITORIA` dan identidad y trazabilidad.
- `MODULE_CONFIG` es configuración, no una entidad persistida.

**Notas del presentador:**
"El MER está derivado directamente del archivo `data-model.md` y se entrega también como imagen. La integridad referencial se resuelve en la capa de almacenamiento: si un producto tiene historial no se elimina, se desactiva, para conservar el kardex. La ubicación se guarda en el movimiento y la ubicación vigente se deriva del último documento confirmado; el saldo por ubicación quedó explicitado como evolución futura para mantener el MVP simple y coherente."

**Mensaje clave:** El MER es consistente con la spec, el código y la imagen entregada.

---

## Diapositiva 6 — Decisiones metodológicas (2:45 – 3:20)

**Título:** Cómo trabajamos

- **Spec Driven Development:** `spec.md` → `research.md` → `plan.md` → `data-model.md` y contratos → `tasks.md`.
- **11 historias de usuario** con criterios de aceptación, datos involucrados y decisión de diseño.
- **Trazabilidad:** cada historia se mapea a tareas y a pruebas.
- **Verificación:** 103 pruebas en 13 archivos; `lint`, `format:check` y `build` en verde.

**Notas del presentador:**
"No partimos del código, partimos de los specs. Cada historia incluye escenarios Dado/Cuando/Entonces y una decisión de diseño que explica el porqué. Las decisiones técnicas —localStorage, configuración central, inmutabilidad, identidad local— están registradas en `research.md`. Las 103 pruebas cubren tanto la lógica de stock como los flujos de interfaz, y `tasks.md` marca cada tarea con su historia de origen."

**Mensaje clave:** Decisiones documentadas y verificables, no improvisadas.

---

## Diapositiva 7 — Riesgos de datos y sesgos (3:20 – 4:00)

**Título:** Datos sensibles y sesgos

| Riesgo                      | Mitigación                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| SKU duplicado               | Normalización y unicidad global bloqueante                               |
| Sesgo de anclaje en conteos | Conteo ciego: se oculta el saldo del sistema                             |
| Sesgo de confirmación       | Documentos inmutables + contramovimiento con motivo                      |
| Sesgo de autoridad          | Aprobación por persona distinta de quien contó                           |
| Sesgo de disponibilidad     | Rotación con «Datos insuficientes» si hay < 30 días                      |
| Inyección XSS               | Renderizado con `textContent`, sin `innerHTML` con datos de usuario      |
| Exposición de costos        | `unitCost` solo en panel/catálogo (FR-044); sin roles simulados (FR-047) |

**Notas del presentador:**
"La mitigación de sesgos es parte del diseño, no un anexo. El conteo ciego evita copiar el saldo esperado; la separación de funciones evita que quien cuenta apruebe su propio ajuste; y los indicadores se marcan como insuficientes cuando el historial es corto. En seguridad evitamos una falsa sensación: no hay selector de rol que oculte costos en el navegador, porque se puede eludir. Los costos se muestran solo donde aportan decisión, y el control de acceso real queda para el backend."

**Mensaje clave:** Riesgos nombrados, mitigaciones implementadas.

---

## Diapositiva 8 — Escalabilidad y desarrollo futuro (4:00 – 4:35)

**Título:** Qué sigue

1. **Persistencia:** `localStorage` → API + base de datos relacional; las tablas ya están modeladas.
2. **Stock por ubicación:** tabla `StockUbicacion` derivada de los movimientos confirmados.
3. **Integración (HU10):** órdenes de compra y pedidos de venta como despachos/recepciones pendientes.
4. **Identidad real:** autenticación y permisos validados en servidor.
5. **Auditoría inmutable y observabilidad:** registros solo de inserción y trazas de stock.

**Notas del presentador:**
"El MVP validó la lógica con hasta 500 entidades. Para escalar, la ruta es clara: mover la persistencia a una base de datos, normalizar el saldo por ubicación, integrar compras y ventas, y llevar la autenticación al backend. Como las reglas de dominio están concentradas en `storage.js`, esos cambios no obligan a reescribir la interfaz."

**Mensaje clave:** La arquitectura actual facilita la evolución.

---

## Diapositiva 9 — Demo en vivo y cierre (4:35 – 5:00)

**Título:** Demo rápida (25 segundos)

1. Crear producto `PAP-CAR-075` (SKU único, categoría Papelería, punto de reorden 20).
2. Registrar Entrada de 50 en `A-03-2` con documento de respaldo.
3. Registrar Salida de 60 → bloqueo por stock insuficiente; Salida de 30 → stock 20.
4. Abrir kardex → `ENT +50`, `SAL -30`, saldo 20.
5. Panel → alerta de reposición y KPIs actualizados.

**Notas del presentador:**
"En la demo mostramos el recorrido mínimo: alta de producto, recepción, intento de despacho excedido, kardex y panel. Con eso se ve que la validación, la trazabilidad y los indicadores funcionan sobre datos reales. Cerramos invitando preguntas."

**Mensaje clave:** Lo prometido en los specs se ve funcionando.

---

## Mapa de cobertura de la rúbrica

| Ítem de la rúbrica                                      | Dónde se atiende en la presentación                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1. Formato general del informe                          | Diapositivas 1, 6 y 9: estructura consistente, fuentes en el README e imagen del MER |
| 2. Historias de usuario y decisiones metodológicas / BD | Diapositivas 5 y 6                                                                   |
| 3. Claridad del problema y la solución en los specs     | Diapositivas 2 y 3                                                                   |
| 4. MER consistente con datos y solución                 | Diapositiva 5 (imagen + relaciones)                                                  |
| 5. Usuarios y riesgos de datos                          | Diapositivas 2 y 7                                                                   |
| 6. Presentación clara, concisa y en el tiempo           | Este guion: 9 diapositivas, 5:00 minutos cronometrados                               |

---

## Prompt para ChatGPT Canvas (pegar en el apartado de Canvas)

```
Actúa como diseñador instruccional y crea, en Canvas, una presentación de 5 minutos
(título + viñetas visibles + notas del presentador por diapositiva, con tiempos
acumulados) sobre el siguiente trabajo. Respeta literalmente la rúbrica adjunta:

RÚBRICA (6 ítems, 1 punto cada uno):
1. Formato general del informe: tamaño de letra, espaciado y fuentes debidamente referenciadas.
2. Manejo de historias de usuario asociadas a decisiones metodológicas y de bases de datos.
3. Claridad del problema y la solución en los specs del proyecto.
4. Esquema del MER, consistente con los conjuntos de datos y la solución propuesta.
5. Descripción de los potenciales usuarios y manejo de riesgos de datos.
6. Presentación clara y concisa en el tiempo asignado (5 minutos), describiendo el sistema propuesto.

TRABAJO: módulo ERP de Logística e Inventario (SCM), curso Modelación de Sistemas
2026-2, UdeC. SPA con Vite/HTML/CSS/JS vanilla y localStorage; Spec Driven Development
con spec.md, research.md, plan.md, data-model.md y tasks.md; 11 historias de usuario;
SKU único; entradas/salidas/transferencias/ajustes con validación de stock y FIFO;
kardex inmutable con contramovimientos; conteos ciegos con aprobación separada;
auditoría; panel de KPIs, alertas, rotación y cobertura; MER con ENTIDAD, MOVIMIENTO,
PROVEEDOR, CATEGORIA, CONTEO_FISICO, AUDITORIA y PERSONA_LOCAL; 103 pruebas en verde;
escalabilidad hacia API/DB y stock por ubicación; integración Compras/Ventas diferida.

REQUISITOS DE SALIDA:
- Exactamente 9 diapositivas con tiempo acumulado que sume 5:00 minutos.
- Cada diapositiva: título corto, máximo 4 viñetas visibles y notas del presentador.
- Incluir una diapositiva del problema y usuarios, una de solución, una funcional,
  una del MER (con referencia a la imagen docs/mer-logistica-inventario.png),
  una de decisiones metodológicas, una de riesgos/sesgos, una de escalabilidad y
  una demo de 25 segundos.
- Cerrar con una tabla que relacione cada uno de los 6 ítems de la rúbrica con
  la diapositiva que lo cubre.
- Tono académico, en español de Chile, claro y conciso; sin relleno.
```
