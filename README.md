# ERP - Módulo de Logística e Inventario (SCM)

Este repositorio contiene la implementación del **Módulo de Logística e Inventario (Supply Chain Management - SCM)** para el curso **Modelación de Sistemas (2026-2)** del Departamento de Ingeniería Industrial de la Universidad de Concepción.

El desarrollo se realiza utilizando la metodología **Spec Driven Development (SDD)** sobre una plantilla base desarrollada con **Vite**, **HTML**, **CSS** y **JavaScript (Vanilla JS)**.

---

## 1. Descripción del Proyecto y MVP

El módulo permite gestionar el ciclo operativo de bodegas, control de existencias y movimiento de mercancías. Ofrece una interfaz de usuario completamente en español para la gestión de catálogo de productos, registro de proveedores y trazabilidad de entradas/salidas de stock.

### Características Principales
- **Dashboard Principal:** Métricas en tiempo real de stock total, ítems bajo punto de reorden y accesos rápidos.
- **Gestión de Entidades (Productos y Proveedores):** Administración del maestro de productos, SKU, ubicaciones y datos de proveedores.
- **Gestión de Documentos (Movimientos de Inventario):** Registro de guías de recepción, despachos y transferencias de stock.
- **Persistencia Local:** Los datos se guardan en el almacenamiento local del navegador (`localStorage`).
- **Integridad Referencial:** Eliminación en cascada y trazabilidad completa entre productos y movimientos.

---

## 2. Configuración y Personalización (`src/module-config.js`)

La adaptación del módulo base a **Logística e Inventario** se define a través del objeto `userConfig` en el archivo `src/module-config.js`:

- **Nombre del Módulo (`moduleName`):** "Logística e Inventario"
- **Etiquetas Custom (`labels`):**
  - Entidades: **Producto / Proveedor**
  - Documentos: **Movimiento de Inventario**
- **Campos Personalizados (`customFields`):**
  - `sku` (Texto, Requerido)
  - `punto_reorden` (Número, Requerido)
  - `ubicacion_bodega` (Texto)
  - `tipo_movimiento` (Selección: Entrada, Salida, Transferencia)
- **Ciclo de Vida de Estado (`statusLifecycle`):**
  - Estados: `Borrador` → `Pendiente` → `Completado` / `Cancelado`

---

## 3. Instalación y Ejecución

### Requisitos Previos
- Node.js (versión 18 o superior)
- npm o yarn

### Pasos para Ejecutar Localmente

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_REPOSITORIO>
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. Abrir la URL indicada en la consola (por defecto: `http://localhost:5173`).

---

## 4. Pruebas Automatizadas

El proyecto cuenta con una suite de pruebas unitarias e integración con Vitest.

- **Ejecutar pruebas en modo watch:**
  ```bash
  npm test
  ```

- **Ejecutar pruebas una sola vez:**
  ```bash
  npx vitest run
  ```

---

## 5. Estructura de Documentación SpecKit

La especificación detallada del módulo, requerida para las entregas del curso, se encuentra distribuida en la carpeta de especificaciones:

- [`plan.md`](./specs/plan.md): Plan de trabajo, historias de usuario, perfiles de clientes y mitigación de sesgos.
- [`data-model.md`](./specs/data-model.md): Modelo Entidad-Relación (MER) en Mermaid, diccionario de variables críticas y análisis de escalabilidad.

---

## 6. Equipo de Trabajo e Información Académica

- **Universidad:** Universidad de Concepción
- **Facultad:** Facultad de Ingeniería
- **Departamento:** Departamento de Ingeniería Industrial (DII)
- **Asignatura:** Modelación de Sistemas (2026-2)
- 
