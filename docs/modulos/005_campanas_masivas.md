# Módulo 005: Campañas Masivas (Broadcasts)

## ¿Para qué sirve?
Es el módulo de marketing. Permite enviar un mismo mensaje (una Plantilla Oficial de Meta) a cientos o miles de contactos a la vez de forma segura, ideal para promociones, recordatorios o avisos importantes.

## ¿Cómo se hizo (Flujo Técnico)?
1. **Frontend:** Interfaz de creación en `src/app/(dashboard)/broadcasts/` donde el usuario selecciona un segmento de contactos (por etiqueta) y la Plantilla de Meta a enviar.
2. **Backend:** Un motor de envío asíncrono. Debido a los límites de la API de WhatsApp, no se envían 10,000 mensajes de golpe, sino que se encolan y se procesan por lotes (Batching) para evitar que Meta bloquee el número por spam.
3. **Reportes:** Se cruzan los estados de mensaje que entrega Meta (Enviado, Entregado, Leído, Fallido) para mostrar analíticas en tiempo real.

## Funciones principales
- Selección de audiencia objetivo (Filtrado de contactos).
- Vista previa de la Plantilla de WhatsApp seleccionada.
- Programación de envíos (ahora o en fecha futura).
- Métricas de éxito de la campaña.
