# Modelo de Datos (Data Model) - Módulo de Logística e Inventario

## 1. Diagrama Entidad-Relación (MER - Plantilla Mermaid)

```mermaid
erDiagram
    CATEGORIA ||--o{ PRODUCTO : clasifica
    UBICACION ||--o{ STOCK : almacena
    PRODUCTO ||--o{ STOCK : registra
    PRODUCTO ||--o{ DETALLE_MOVIMIENTO : contiene
    MOVIMIENTO_INVENTARIO ||--|{ DETALLE_MOVIMIENTO : posee
    PROVEEDOR ||--o{ MOVIMIENTO_INVENTARIO : origina
    USUARIO ||--o{ MOVIMIENTO_INVENTARIO : autoriza

    CATEGORIA {
        string id_categoria PK
        string nombre
        string descripcion
    }

    PRODUCTO {
        string id_producto PK
        string sku
        string nombre
        string id_categoria FK
        decimal precio_unitario
        int stock_minimo
        int punto_reorden
        string unidad_medida
    }

    UBICACION {
        string id_ubicacion PK
        string pasillo
        string estante
        string nivel
        string codigo_bodega
    }

    STOCK {
        string id_stock PK
        string id_producto FK
        string id_ubicacion FK
        int cantidad_disponible
        int cantidad_reservada
        datetime ultima_actualizacion
    }

    PROVEEDOR {
        string id_proveedor PK
        string rut_tax_id
        string razon_social
        string contacto_email
    }

    MOVIMIENTO_INVENTARIO {
        string id_movimiento PK
        string tipo_movimiento "ENTRADA | SALIDA | TRANSFERENCIA"
        datetime fecha
        string id_proveedor FK "Opcional"
        string id_usuario FK
        string estado "PENDIENTE | COMPLETADO | CANCELADO"
    }

    DETALLE_MOVIMIENTO {
        string id_detalle PK
        string id_movimiento FK
        string id_producto FK
        int cantidad
        decimal costo_unitario
    }

    USUARIO {
        string id_usuario PK
        string nombre
        string rol "ADMIN | OPERADOR | ANALISTA"
    }