Feedback Avance 01 (26/10/26)

- no hay ningun avance en el repositorio (editar README, agregar data-model y plan).

Proximos pasos:

- rectificar puntos anteriores
- trabajar en los specs (historias de usuario, US) para definir tareas
- dividirse las US y tareas para una siguiente iteracion (avances cada semana)
- ejecutar una version integrada de prueba

Feedback Avance 02 (2/11/26)

- Se observan historias de usuario y actividad del grupo, y reordenamiento de la estructura, muy bien

Proximos pasos:

- crear tareas a partir de los specs
- hacer primera implmentacion, registar modificaciones/incremental y volver al spec
- dividir el grupo entre modificaciones (ajustes previos) e incremental (nueva funcionalidad)
- integrar nueva version en 2 semanas
-

Feedback Avance 03 (16/11/26)

- Cambios en la especificación: spec.md incorpora tres sesiones de clarificación (03, 10 y 11/11) y reescribe la US5 como panel analítico con KPIs. Se eliminan las antiguas US5, US7–US11 y se quita la autenticación. tasks.md se reorganiza por US1–US6, con T001–T057 y una Fase 10 (T058–T068). Son coherentes entre sí, pero la Fase 10 dice que "src/ no existe" y T001–T057 siguen sin completar, lo que contradice las casillas [X] y el código existente.
- Consistencia sitio–especificación: FR-045 (código único, sesión 11/11) no se cumple: `addEntity` y `updateEntity` en src/storage.js no comprueban duplicados, y no hay tarea para ello. La US2 sigue pidiendo "unidad de medida" como dato obligatorio al dar de alta el producto, pero en `userConfig` (src/module-config.js) `unidad_medida` es `required: false`. Existe `streamlit_app/` (port a Python) que no aparece en spec.md ni en tasks.md. El filtro de categoría de la US5 (T042) y el vínculo de T061 con el formulario no son verificables: dashboard.js y document-form.js no se incluyeron.
- hacer mejoras de funcionalidad e interfaz de usuario, incluir data simulada para probar campos, incluir mejoras de estilo, transicion, navegacion, etcetera.

Presentacion de MVP final en 2 semanas.
