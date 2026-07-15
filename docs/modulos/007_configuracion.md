# Módulo 007: Configuración de Sistema (Settings)

## ¿Para qué sirve?
Es la central de mandos técnica. Exclusiva para el perfil "Administrador". Aquí se conectan los "cables" externos como WhatsApp API, Groq, manejo de usuarios internos y se gestionan los permisos, así como la creación de Plantillas oficiales.

## ¿Cómo se hizo (Flujo Técnico)?
1. **Frontend:** Un panel consolidado en `src/app/(dashboard)/settings/` separado por pestañas (General, WhatsApp, IA, Usuarios, Plantillas).
2. **Gestión de Plantillas:** Interfaz que se conecta directamente con la API de Meta (`/api/whatsapp/templates`) para crear, sincronizar y aprobar Plantillas sin que el administrador deba entrar a la plataforma de Facebook Developers.
3. **Manejo de Credenciales:** Guarda las API Keys y tokens (de forma cifrada y segura) que alimentan al resto de los módulos. 

## Funciones principales
- Sincronización de Plantillas (Templates) con Meta.
- Conexión del Cloud API de WhatsApp (Tokens y Webhooks).
- Gestión de equipo (invitar agentes al sistema).
- Futura gestión de Roles (Admin / Usuario regular).
- Ajustes generales de la empresa (Nombre, logos).
