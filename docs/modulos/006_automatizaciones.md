# Módulo 006: Automatizaciones e Inteligencia Artificial

## ¿Para qué sirve?
Es el "cerebro" en piloto automático del CRM. Sirve para quitarle carga de trabajo humana a tareas repetitivas (como dar la bienvenida) y para conectar a la Inteligencia Artificial (Groq) con los chats entrantes, logrando un bot conversacional rápido e inteligente.

## ¿Cómo se hizo (Flujo Técnico)?
1. **Motor Lógico:** Basado en un sistema de "Disparadores" (Triggers) y "Acciones" (Actions). Ejemplo: Si `Trigger = Nuevo Chat`, entonces `Action = Enviar mensaje de bienvenida`.
2. **Integración IA (Groq):** Cuando la automatización lo requiere, los mensajes entrantes del webhook se mandan al modelo de lenguaje (LLM) alojado en Groq a través de su API (`src/lib/automations/`), procesa el contexto del negocio y devuelve la respuesta al webhook para mandarla por WhatsApp.
3. **Frontend:** Una interfaz de configuración de IA en `src/app/(dashboard)/settings/ai` donde el Admin escribe el comportamiento que debe tener el bot (El famoso "System Prompt").

## Funciones principales
- Reglas de auto-respuesta.
- Integración de chatbot inteligente capaz de entender lenguaje natural.
- Definición de instrucciones (Prompt) para perfilar la IA como vendedor, soporte, etc.
- Auto-asignación de agentes según reglas.
