# Módulo 004: Embudos de Venta (Pipelines)

## ¿Para qué sirve?
Permite al equipo de ventas hacer seguimiento visual de los negocios en curso (Leads). Sirve para saber exactamente en qué etapa del proceso de venta está un cliente (Ej: "Nuevo Lead" -> "Propuesta Enviada" -> "Cierre Ganado").

## ¿Cómo se hizo (Flujo Técnico)?
1. **Frontend:** Se implementó una interfaz tipo Kanban (Tablero de arrastrar y soltar - Drag & Drop) en `src/app/(dashboard)/pipelines/`. 
2. **Estructura de Datos:** Se crearon tablas para `pipelines` (el tablero principal) y `stages` (las columnas: Contactado, Negociación, etc.). Cada "Oportunidad" de venta está atada a un Contacto.
3. **Interacción:** Cuando el agente arrastra una tarjeta de una columna a otra, se hace una petición a la base de datos para actualizar su etapa (Stage ID).

## Funciones principales
- Creación de múltiples embudos (Ej: "Ventas B2B", "Ventas B2C").
- Tarjetas Kanban interactivas (Drag and Drop).
- Visualización del valor monetario (cuánto dinero hay en el pipeline).
- Cambio rápido del estado del Lead.
