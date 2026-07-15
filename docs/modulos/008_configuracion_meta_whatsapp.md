# Guía Paso a Paso: Configuración de Meta (WhatsApp Cloud API)

Para que el CRM pueda enviar y recibir mensajes de WhatsApp, necesitas conectar el proyecto a la API oficial de WhatsApp Cloud a través de Meta for Developers. A continuación se detalla el proceso completo paso a paso.

---

## PASO 1: Crear una cuenta de Desarrollador en Meta
1. Ingresa a [Meta for Developers](https://developers.facebook.com/).
2. Inicia sesión con tu cuenta personal de Facebook.
3. Haz clic en **Empezar** o **Mis Apps** en la esquina superior derecha.
4. Sigue los pasos para registrarte como desarrollador (te pedirán confirmar tu número de teléfono y correo electrónico).

---

## PASO 2: Crear una nueva Aplicación (App)
1. En el panel de "Mis Apps", haz clic en el botón verde **Crear App**.
2. Selecciona **Otros** (o "Business" / "Negocios" dependiendo de la interfaz actual de Meta) y haz clic en Siguiente.
3. Elige el tipo de aplicación: Selecciona **Negocios (Business)** y haz clic en Siguiente.
4. Completa la información:
   - **Nombre de la aplicación**: Ejemplo: `Solmit CRM WhatsApp`
   - **Correo electrónico de contacto**: Tu correo electrónico.
   - **Cuenta comercial (Business Account)**: Si ya tienes un Administrador Comercial (Business Manager) de Meta, selecciónalo. Si no tienes uno, Meta te pedirá crear uno más adelante.
5. Haz clic en **Crear App** (te pedirá ingresar la contraseña de tu Facebook por seguridad).

---

## PASO 3: Agregar el producto de WhatsApp
1. Una vez creada la app, serás dirigido al panel de control de tu aplicación.
2. Baja hasta encontrar **WhatsApp** y haz clic en **Configurar**.
3. Meta te pedirá seleccionar un Administrador Comercial (Business Manager). Si no tienes, sigue los pasos rápidos para crearlo ahí mismo.
4. Al terminar, serás redirigido a la sección "Configuración de la API" de WhatsApp en el menú izquierdo.

---

## PASO 4: Ingresar un Número Limpio (Real)
Meta te da un número de prueba temporal por defecto, pero nosotros necesitamos vincular un número real para producción.

> [!WARNING]
> **REQUISITO IMPORTANTE**: El número de teléfono que vayas a vincular **NO debe estar usando WhatsApp en este momento**. Debes borrar la cuenta de WhatsApp (ya sea normal o Business) desde la aplicación móvil antes de vincularlo aquí. Debe ser un "número limpio".

1. En el menú izquierdo ve a **WhatsApp > Configuración de la API**.
2. Baja hasta el Paso 5 donde dice "Agregar un número de teléfono". Haz clic en el botón **Agregar número de teléfono**.
3. Llena el perfil de tu empresa (Nombre a mostrar en WhatsApp, Categoría, Descripción).
4. Ingresa el **número de teléfono limpio**.
5. Te enviarán un SMS o llamada con un código de verificación. Ingresa el código.
6. ¡Listo! Tu número ya está validado y conectado a la API de WhatsApp.

---

## PASO 5: Obtener los ID's (Phone Number ID y WABA ID)
Con tu número ya agregado, en la misma página de **WhatsApp > Configuración de la API**, asegúrate de seleccionar tu número real en el menú desplegable "De:".

Copia y guarda los siguientes datos en tu archivo `.env` del proyecto:
1. **Identificador del número de teléfono (Phone Number ID)**.
2. **Identificador de la cuenta de WhatsApp Business (WABA ID)**.

---

## PASO 6: Generar el TOKEN PERMANENTE
Por defecto, Meta te muestra un token que expira en 24 horas. **No uses ese**. Necesitamos crear un Token Permanente mediante un "Usuario del Sistema".

1. Ve a tu [Configuración del negocio (Business Manager)](https://business.facebook.com/settings).
2. En el menú izquierdo, ve a **Usuarios > Usuarios del sistema**.
3. Haz clic en **Agregar**. 
   - Nombre: `CRM System User` (o cualquier nombre).
   - Rol: **Administrador**.
4. Haz clic en el botón **Agregar activos**:
   - Tipo de activo: **Apps**.
   - Selecciona la App que creaste en el Paso 2.
   - Activa el control total (Administrar App) y guarda.
5. Ahora haz clic en el botón **Generar nuevo token**:
   - Selecciona tu App.
   - Tiempo de caducidad: **Nunca (Never)**.
   - Permisos. Busca y selecciona estos tres (muy importantes):
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
     - `business_management`
6. Haz clic en generar. Te aparecerá un código larguísimo.
7. **Copia este token inmediatamente**. (Meta no te lo volverá a mostrar). 
8. Pega este token en tu archivo `.env` como el token de WhatsApp.

---

## PASO 7: Configurar los Webhooks (Para recibir mensajes)
Para que el CRM sepa cuando un cliente te escribe, Meta debe avisarnos mediante un "Webhook".

1. Vuelve al panel de [Meta for Developers](https://developers.facebook.com/) y entra a tu App.
2. En el menú izquierdo, ve a **WhatsApp > Configuración**.
3. En la sección "Webhooks", haz clic en **Editar**.
4. Te pedirá dos cosas:
   - **URL de devolución de llamada (Callback URL)**: Aquí debes poner la URL de tu servidor en producción seguida de la ruta de la API. Ejemplo: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Token de verificación**: Este es el `META_APP_SECRET` que está en tu `.env`. Puedes poner el código que tú quieras (por ejemplo, `crm-solmit-2026-secreto`), pero **debe ser exactamente el mismo** tanto en Meta como en tu archivo `.env`.
5. Haz clic en "Verificar y guardar". (Tu servidor CRM debe estar prendido y subido a internet para que Meta pueda verificarlo).
6. Finalmente, en esa misma pantalla, verás una lista de "Campos de suscripción". Haz clic en **Administrar** y suscríbete a la opción llamada **`messages`**. (Esto permite que lleguen los mensajes de texto, audios, fotos, etc).

---

### Resumen del `.env` necesario:

```env
# Configuracion Meta
# Token generado en el Paso 6
META_WHATSAPP_TOKEN=EABAABlKdrXIBRZBPQQppG...

# IDs obtenidos en el Paso 5
META_PHONE_NUMBER_ID=1268500659670701
META_WABA_ID=2422269268519793

# Secreto configurado en el Paso 7
META_APP_SECRET=crm-solmit-2026-secreto
```

¡Con esto tu entorno de Meta estará perfectamente configurado y tu CRM listo para procesar WhatsApp!
