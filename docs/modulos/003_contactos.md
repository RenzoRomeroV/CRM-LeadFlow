# Módulo 003: Gestión de Contactos

## ¿Para qué sirve?
Es la agenda o directorio de clientes de la empresa. Almacena de forma estructurada a todos los clientes que han interactuado con el WhatsApp o que han sido importados, permitiendo buscar, filtrar y añadirles etiquetas para futuras campañas.

## ¿Cómo se hizo (Flujo Técnico)?
1. **Automático:** Cada vez que un número nuevo escribe al WhatsApp, el Webhook crea automáticamente un registro en la tabla `contacts` de la base de datos de Supabase si este no existe.
2. **Manual:** Pantalla en `src/app/(dashboard)/contacts/` que lista los contactos usando tablas (Grid) paginadas.
3. **Estructura:** Cada contacto tiene campos predefinidos (Nombre, Teléfono, Email) y puede tener "Etiquetas" (Tags) y campos personalizados para mayor flexibilidad.

## Funciones principales
- Listado general de contactos con buscador.
- Creación y edición manual de un cliente.
- Importación y exportación masiva (CSV/Excel).
- Asignación de etiquetas para segmentación (Ej: "VIP", "Mayorista").
