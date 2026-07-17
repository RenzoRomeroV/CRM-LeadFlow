# API Pública (`/api/v1`)

La API pública te permite controlar tu instancia de wacrm desde tus propios scripts y automatizaciones — enviar mensajes, gestionar contactos, lanzar difusiones — sin pasar por la interfaz de usuario del panel de control.

> **Estado:** estable. La autenticación, los alcances (scopes), el límite de peticiones (rate limiting), los endpoints de mensajes / contactos / conversaciones / difusiones, y los [webhooks](#webhooks) de eventos de salida ya están disponibles.

## Autenticación

Cada solicitud se autentica con una **clave API (API key)**, enviada como un token bearer:

```
Authorization: Bearer wacrm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Las claves están **limitadas por cuenta**: una clave actúa exactamente sobre una cuenta, aquella en la que fue creada. No hay acceso entre diferentes cuentas.

### Creación de una clave

En el panel de control: **Configuración → Claves API → Nueva clave API**. Únicamente los **administradores y propietarios** pueden crear claves.

1. Dale un nombre a la clave (por ejemplo, el nombre de la integración que la usará).
2. Otorga los **alcances (scopes)** que necesita — nada más (ver abajo).
3. Copia la clave. **La clave completa se muestra exactamente una vez.** wacrm solo almacena un hash SHA-256, por lo que nunca podrá volver a mostrarse. Si la pierdes, revócala y crea una nueva.

### Revocación de una clave

**Configuración → Claves API → Revocar.** La revocación se hace efectiva en la siguiente solicitud de la clave. Las claves revocadas permanecen en la lista como rastro de auditoría.

## Alcances (Scopes)

Una clave solo puede hacer lo que sus alcances le permiten, independientemente de quién la haya creado. Otorga siempre el mínimo necesario.

| Alcance              | Permite                                  |
| -------------------- | ---------------------------------------- |
| `messages:send`      | Enviar mensajes de WhatsApp              |
| `messages:read`      | Leer mensajes y estado de entrega        |
| `contacts:read`      | Listar y leer contactos                  |
| `contacts:write`     | Crear y actualizar contactos             |
| `conversations:read` | Listar y leer conversaciones             |
| `broadcasts:send`    | Lanzar campañas de difusión              |
| `webhooks:manage`    | Registrar y gestionar webhooks de salida |

Una clave **sin alcances** aún puede autenticarse y llamar a `GET /api/v1/me` — útil para verificar que una clave funciona.

## Estructura de Respuesta

Cada respuesta utiliza una de dos formas:

```jsonc
// éxito
{ "data": { /* ... */ } }

// fallo
{ "error": { "code": "forbidden", "message": "This API key is missing the 'messages:send' scope" } }
```

Utiliza `error.code` para condiciones lógicas (estable); `error.message` es para humanos y puede cambiar su redacción.

| Estado | `code`         | Significado                                      |
| ------ | -------------- | ------------------------------------------------ |
| 401    | `unauthorized` | Clave faltante / malformada / desconocida / revocada / expirada |
| 403    | `forbidden`    | Clave válida, pero falta el alcance requerido    |
| 429    | `rate_limited` | Límite de peticiones por clave excedido          |
| 400    | `bad_request`  | Entrada malformada                               |
| 404    | `not_found`    | Recurso inexistente                              |
| 500    | `internal`     | Error del servidor                               |

## Límite de Peticiones (Rate limits)

Las solicitudes están limitadas **por clave**: **120 solicitudes por minuto**. Al recibir un `429`, estas cabeceras te indican cuándo volver a intentar:

- `Retry-After` — segundos hasta que se restablezca la ventana
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

> El limitador está en memoria y **por proceso**. Un despliegue de una sola instancia (el caso común para un entorno auto-alojado) funciona bien así. Si escalas a múltiples instancias, cambia el limitador por un almacenamiento compartido (Redis/Upstash) — revisa la nota en la parte superior de `src/lib/rate-limit.ts`. De lo contrario, el límite no se aplicará entre instancias.

## Endpoints

### `GET /api/v1/me`

Devuelve la cuenta a la que está vinculada una clave y los alcances que posee. Requiere solo una clave válida (sin alcance específico). Úsalo para verificar que una clave funciona y para descubrir sus alcances.

```bash
curl https://your-crm.example.com/api/v1/me \
  -H "Authorization: Bearer wacrm_live_xxx"
```

```json
{
  "data": {
    "account": { "id": "…", "name": "Acme Inc" },
    "key": { "id": "…", "scopes": ["messages:send"] }
  }
}
```

### `POST /api/v1/messages`

Envía un mensaje de WhatsApp a un número de teléfono. Alcance: `messages:send`. Debes pasar un **número E.164**, no un ID interno — el endpoint busca o crea el contacto + conversación, y luego envía.

```bash
curl -X POST https://your-crm.example.com/api/v1/messages \
  -H "Authorization: Bearer wacrm_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "to": "+14155550123", "type": "text", "text": "Hola 👋" }'
```

`type` es `text` (por defecto), `template` o un tipo multimedia (`image` / `video` / `document` / `audio`). Multimedia requiere `media_url` (y opcionalmente `filename`); `text` hace de subtítulo (caption). `template` requiere un objeto `template`:

```jsonc
{
  "to": "+14155550123",
  "type": "template",
  "template": {
    "name": "order_update",
    "language": "es_ES",
    "params": ["A123"]        // variables posicionales para el cuerpo, o un objeto estructurado
  },
  "reply_to_message_id": "<uuid>"   // opcional; debe estar en la misma conversación
}
```

Respuesta (201):

```json
{
  "data": {
    "message_id": "…",
    "whatsapp_message_id": "wamid.…",
    "conversation_id": "…",
    "contact_id": "…",
    "contact_created": true
  }
}
```

Códigos de error de dominio más allá de la tabla anterior: `whatsapp_not_configured` (400), `meta_error` (502 — la petición llegó a Meta y éste rechazó el envío), `template_malformed` (500).

### `GET /api/v1/contacts`

Lista los contactos, los más nuevos primero. Alcance: `contacts:read`. Paginado (ver [Paginación](#paginación)). Filtros opcionales: `?search=` (coincide con nombre o teléfono) y `?tag=<tagId>`.

```json
{
  "data": [
    {
      "id": "…", "phone": "+14155550123", "name": "Jane Doe",
      "email": null, "company": "Acme", "avatar_url": null,
      "tags": [{ "id": "…", "name": "vip", "color": "#3b82f6" }],
      "created_at": "…", "updated_at": "…"
    }
  ],
  "meta": { "next_cursor": "…" }
}
```

### `POST /api/v1/contacts`

Crea un contacto. Alcance: `contacts:write`. `phone` (E.164) es obligatorio; `name`, `email`, `company`, y `tags` (un arreglo de nombres de etiquetas, creadas si faltan) son opcionales. **Buscar o crear por teléfono:** una coincidencia existente devuelve `200` con el contacto existente; un nuevo contacto devuelve `201`. El cuerpo de la respuesta es el contacto serializado (misma estructura que las filas de la lista de arriba).

### `GET` / `PATCH /api/v1/contacts/{id}`

Lee o actualiza un contacto. Alcances: `contacts:read` / `contacts:write`. `PATCH` actualiza solo los campos que envíes (`name`, `email`, `company`); pasa `tags` (un arreglo de nombres de etiquetas) para reemplazar las etiquetas del contacto. Un contacto en otra cuenta devuelve `404`.

### `GET /api/v1/conversations`

Lista las conversaciones, las más nuevas primero. Alcance: `conversations:read`. Paginado. Filtros opcionales: `?status=` (`open` / `pending` / `closed`) y `?contact_id=`. Cada conversación incorpora su contacto + etiquetas.

### `GET /api/v1/conversations/{id}`

Lee una conversación. Alcance: `conversations:read`. `404` si pertenece a otra cuenta.

### `GET /api/v1/conversations/{id}/messages`

Lista los mensajes de una conversación, los más nuevos primero. Alcance: `messages:read`. Paginado. Cada mensaje incluye su `direction` (`inbound` / `outbound`), `status` (estado de entrega), `whatsapp_message_id`, y `content_*`. Primero se verifica que la conversación pertenece a tu cuenta (de lo contrario, devuelve `404`).

### `POST /api/v1/broadcasts`

Lanza una difusión con plantilla a una lista de destinatarios. Alcance: `broadcasts:send`. La difusión + sus filas de destinatarios se persisten de inmediato y los envíos se distribuyen en segundo plano, por lo que la llamada retorna rápidamente — sondea `GET /api/v1/broadcasts/{id}` para revisar el progreso.

```bash
curl -X POST https://your-crm.example.com/api/v1/broadcasts \
  -H "Authorization: Bearer wacrm_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Promoción de Julio",
        "template_name": "promo_julio",
        "template_language": "es_ES",
        "recipients": [
          { "to": "+14155550123", "params": ["Jane"] },
          { "to": "+14155550124" }
        ]
      }'
```

Los destinatarios tienen un límite de **1000 por solicitud** — divide envíos más grandes. Los números de teléfono inválidos se descartan y se cuentan como `rejected` (rechazados). Respuesta (202):

```json
{
  "data": {
    "broadcast_id": "…",
    "status": "sending",
    "total_recipients": 2,
    "accepted": 2,
    "rejected": 0
  }
}
```

### `GET /api/v1/broadcasts/{id}`

Estado de la difusión + conteos. Alcance: `broadcasts:send`. `status` cambia de `sending` → `sent`; `delivered_count` / `read_count` continúan subiendo a medida que llegan los webhooks de entrega de Meta. `404` si la difusión pertenece a otra cuenta.

## Paginación

Todos los endpoints de listas se paginan de la misma forma. Solicita el tamaño de página con `?limit=` (por defecto 50, máximo 100) y lee la página siguiente usando el `meta.next_cursor` opaco devuelto en la respuesta anterior:

```
GET /api/v1/contacts?limit=50
→ { "data": [ … ], "meta": { "next_cursor": "eyJ…" } }

GET /api/v1/contacts?limit=50&cursor=eyJ…
→ { "data": [ … ], "meta": { "next_cursor": null } }   // última página
```

Los cursores están basados en conjuntos de claves (estables bajo inserciones concurrentes). Pasa el cursor devuelto de forma literal — no lo analices (parse). `next_cursor: null` significa que es la última página.

## Webhooks

En lugar de hacer sondeos (polling), registra un endpoint (webhook) y wacrm hará una solicitud POST hacia él cuando ocurran cosas en tu cuenta. **Migración requerida:** aplica `supabase/migrations/028_webhook_endpoints.sql`.

### Eventos

| Evento                   | Se dispara cuando                                 |
| ------------------------ | ------------------------------------------------- |
| `message.received`       | Llega un mensaje entrante de un contacto          |
| `message.status_updated` | Un mensaje que enviaste cambió de estado de entrega|
| `conversation.created`   | Se abre una nueva conversación para un contacto   |

### Gestión de endpoints

Todo bajo el alcance `webhooks:manage`.

- `POST /api/v1/webhooks` — registrar `{ "url": "https://…", "events": ["message.received"] }`. `url` debe ser `https://`. **La respuesta incluye `secret` exactamente una vez** — guárdalo para verificar firmas; wacrm guarda solo una copia cifrada.
- `GET /api/v1/webhooks` — lista tus endpoints (nunca devuelve el secret).
- `GET /api/v1/webhooks/{id}` — lee uno.
- `PATCH /api/v1/webhooks/{id}` — actualiza `url`, `events`, o `is_active` (re-habilitarlo limpia el contador de fallos).
- `DELETE /api/v1/webhooks/{id}` — elimina uno.

```bash
curl -X POST https://your-crm.example.com/api/v1/webhooks \
  -H "Authorization: Bearer wacrm_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/hooks/wacrm", "events": ["message.received"] }'
# → 201 { "data": { "id": "…", "url": "…", "events": [...], "secret": "whsec_…" } }
```

### Payload de entrega

Cada entrega es un POST con esta estructura base; `id` es un UUID único por entrega sobre el que puedes quitar duplicados (dedupe), y `data` varía dependiendo del evento `event`:

```json
{
  "id": "8f3c…",
  "event": "message.received",
  "occurred_at": "2026-07-01T12:00:00.000Z",
  "account_id": "…",
  "data": { /* por evento, ver abajo */ }
}
```

`data` por evento:

```jsonc
// message.received
{ "conversation_id": "…", "contact_id": "…", "whatsapp_message_id": "wamid.…", "content_type": "text", "text": "Hola 👋" }
// conversation.created
{ "conversation_id": "…", "contact_id": "…" }
// message.status_updated
{ "whatsapp_message_id": "wamid.…", "conversation_id": "…", "status": "delivered" }
```

Cabeceras: `X-Wacrm-Event`, `X-Wacrm-Webhook-Id`, y `X-Wacrm-Signature`.

### Verificando la firma

`X-Wacrm-Signature: t=<unix_seconds>,v1=<hex>` donde `v1 = HMAC-SHA256(secret, "${t}.${rawBody}")`. Vuelve a calcularla sobre el **cuerpo en bruto (raw)** de la solicitud y compárala en tiempo constante; rechaza la petición si `t` tiene más de un par de minutos de antigüedad (protección contra ataques de repetición o replay).

```js
const [, t, v1] = header.match(/t=(\d+),v1=([0-9a-f]+)/);
const expected = crypto.createHmac('sha256', secret)
  .update(`${t}.${rawBody}`).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
```

### Semántica de entrega

La entrega se hace con **el mejor esfuerzo (best-effort)**: un único intento por evento con un tiempo de espera corto, y **no se siguen redirecciones**. `message.status_updated` cubre mensajes que almacena wacrm (bandeja de entrada + envíos API), no envíos exclusivos de difusión, y — dado que los proveedores reenvían y desordenan callbacks de estado — el mismo estado puede llegar más de una vez o fuera de orden; **elimina duplicados basándote en el `id` y no asumas ningún orden**. Cada fallo consecutivo incrementa `failure_count`; tras suficientes fallos consecutivos, el endpoint se deshabilita automáticamente (`is_active: false`) — vuélvelo a habilitar mediante un `PATCH` (lo que restablecerá el contador). Una cola de entrega resistente con reintentos basados en tiempos (backoff) es una mejora a futuro; hoy en día, trata la falta de entregas como una posibilidad y compénsalo (reconcilia) utilizando los endpoints de lectura cuando sea fundamental.

**Restricciones de destino (SSRF).** La `url` debe ser `https://` y debe apuntar a una dirección pública — peticiones a `localhost`, rangos privados/RFC1918, link-local (incluyendo metadatos en la nube `169.254.169.254`), y otros destinos internos similares, se rechazarán en el momento de la entrega.

## Mapa de ruta (Roadmap)

La API pública actual cubre mensajería, contactos, conversaciones, difusiones y webhooks de salida — todo el alcance propuesto en el caso [#245](https://github.com/ArnasDon/wacrm/issues/245). Futuras ideas (acuerdos/embudos, plantillas, flujos, una cola de reintentos para webhooks) aún no tienen fecha programada.
