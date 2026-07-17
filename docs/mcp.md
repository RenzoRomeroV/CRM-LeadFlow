# Servidor MCP

wacrm incluye un servidor del [Model Context Protocol](https://modelcontextprotocol.io) (MCP) para que puedas controlar tu CRM desde asistentes de IA — Claude Desktop, Claude Code, Cursor y cualquier otro cliente MCP — utilizando lenguaje natural:

> "¿Cuántas conversaciones siguen abiertas hoy?"
> "Muestra los últimos cinco mensajes con el número +1 415 555 0123."
> "Envía la plantilla `order_update` a ese contacto."

El servidor se encuentra en [`mcp-server/`](../mcp-server) y está publicado en npm como [`wacrm-mcp`](https://www.npmjs.com/package/wacrm-mcp). A nivel interno, es una capa delgada sobre la [API Pública](./public-api.md), por lo que cada solicitud está autenticada y su alcance está limitado a tu instancia exactamente igual que cualquier otra llamada a la API.

## Inicio rápido

1. Crea una clave API en el panel de control: **Configuración → Claves API**. Otorga únicamente los permisos que tu asistente necesita (un asistente de solo lectura solo necesita los permisos `*:read`).
2. Agrega el servidor a la configuración de tu cliente MCP:

   ```jsonc
   {
     "mcpServers": {
       "wacrm": {
         "command": "npx",
         "args": ["-y", "wacrm-mcp"],
         "env": {
           "WACRM_BASE_URL": "https://crm.ejemplo.com",
           "WACRM_API_KEY": "wacrm_live_xxxxxxxxxxxxxxxxxxxxxxxx"
         }
       }
     }
   }
   ```

Esa configuración es de **solo lectura** — la opción predeterminada y más segura. Para permitir que el asistente modifique datos o envíe mensajes, añade `"WACRM_ENABLE_WRITES": "true"` (y `"WACRM_ENABLE_BROADCASTS": "true"` para envíos masivos) en la propiedad `env`.

## Qué expone

- **Lecturas (siempre activas):** `whoami`, contactos (listar/obtener), conversaciones (listar/obtener), mensajes (listar), estado de las difusiones.
- **Escrituras (opcionales):** enviar un mensaje, crear/actualizar un contacto.
- **Difusiones (opcionales):** lanzar una difusión basada en plantillas — requiere una confirmación explícita (`confirm`) y está marcada como destructiva.

## Seguridad

Dado que enviar mensajes de WhatsApp tiene consecuencias reales, el servidor está configurado en **solo lectura hasta que optes por lo contrario**, sumado a los propios permisos de la clave API. Si le das a un asistente una clave de solo lectura y una configuración de solo lectura, le será físicamente imposible enviar algo. Consulta el [README del servidor](../mcp-server/README.md) para ver la lista completa de herramientas y el modelo de seguridad.
