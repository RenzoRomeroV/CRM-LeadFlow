# Módulo 002: Bandeja de Entrada (Inbox)

## ¿Para qué sirve?
Es el corazón operativo del CRM para los agentes (Usuarios). Aquí es donde reciben los mensajes de WhatsApp de los clientes en tiempo real y pueden chatear con ellos. Actúa como un "WhatsApp Web multicanal" donde varias personas pueden atender números distintos o el mismo.

## ¿Cómo se hizo (Flujo Técnico)?
1. **Frontend:** Interfaz de chat en `src/app/(dashboard)/inbox/` con lista de conversaciones a la izquierda y el panel de chat a la derecha.
2. **Backend (Webhooks):** Cuando un cliente escribe al WhatsApp de la empresa, Meta envía un Webhook al servidor (`src/app/api/whatsapp/webhook/route.ts`).
3. **Tiempo Real:** Se usa Supabase Realtime para que los mensajes nuevos aparezcan instantáneamente en la pantalla del agente sin tener que recargar la página.
4. **Intervención de IA:** Permite ver cuándo la IA (Groq) está respondiendo en automático y ofrece un botón de "Take Over" para que el humano tome el control.

## Funciones principales
- Lectura y envío de mensajes de texto y multimedia.
- Asignación de chats a agentes específicos.
- Cambio de estado (Abierto, Cerrado, Pendiente).
- Notas internas (mensajes invisibles para el cliente pero visibles para el equipo).
