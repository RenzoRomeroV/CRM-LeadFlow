# CRM LeadFlow

Plataforma CRM avanzada para WhatsApp® con bandeja de entrada compartida, contactos, embudos de venta, envíos masivos y automatizaciones integradas.

## 🚀 Arquitectura y Stack Tecnológico

Este proyecto está construido bajo una arquitectura **Full-Stack moderna**, en la que tanto el frontend como el backend conviven en el mismo repositorio para maximizar la velocidad de desarrollo, tipado seguro y rendimiento.

### Frontend & Backend (Unificados)
- **[Next.js 16](https://nextjs.org/) & React 19:** Framework principal. Se encarga tanto del renderizado de la interfaz de usuario (React Server Components) como de la lógica de negocio (Server Actions y Rutas de API).
- **Lenguaje:** **TypeScript** estricto en todo el proyecto.
- **Ubicación del código:** La lógica de la aplicación, páginas y componentes residen principalmente en `src/app/` (Enrutamiento) y `src/components/` (UI).

### Base de Datos y Backend as a Service
- **[Supabase](https://supabase.com/):** Actúa como nuestra capa de persistencia y seguridad.
- **Base de Datos:** **PostgreSQL**.
- **Autenticación y Seguridad:** Integrado con Supabase Auth y Row Level Security (RLS) para proteger los datos directamente a nivel de base de datos.

### Interfaz de Usuario (UI/UX)
- **Estilos:** **Tailwind CSS v4**.
- **Componentes:** **shadcn/ui** y componentes accesibles de `@base-ui/react`.
- **Iconografía:** **Lucide React**.
- **Gráficos y Visualización:** **Recharts** para analíticas.

### Automatizaciones Visuales
- Utiliza **React Flow** (`@xyflow/react`) y `@dnd-kit/core` para proporcionar una experiencia de configuración de flujos ("drag-and-drop") fluida y sin código.

---

## ⚙️ Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:
- **Node.js**: v20.0.0 o superior (Recomendado usar `nvm` o `fnm`).
- **npm** (Gestor de paquetes).
- Una cuenta activa en **Supabase** (para la base de datos y autenticación).

---

## 🛠️ Instalación y Configuración Local

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina:

### 1. Clonar el repositorio e instalar dependencias

```bash
# Navega a la carpeta del proyecto
cd wacrm

# Instala todas las dependencias
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` o `.env.local` en la raíz del proyecto basándote en el archivo de ejemplo (si existe) y agrega tus credenciales de Supabase y otras integraciones (como la IA Groq o la API de WhatsApp). 

Ejemplo de variables base necesarias:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 3. Levantar el servidor de desarrollo

Ejecuta el siguiente comando para iniciar el entorno:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000). El servidor observará los cambios y recargará la página automáticamente.

---

## 📦 Scripts Disponibles

En el directorio del proyecto, puedes ejecutar:

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Construye la aplicación optimizada para producción.
- `npm run start`: Inicia el servidor de producción (requiere compilar antes con `build`).
- `npm run lint`: Ejecuta el linter para buscar errores de código.
- `npm run format`: Formatea el código usando Prettier.
- `npm run test`: Ejecuta las pruebas automatizadas con Vitest.

---

## 🌟 Características Principales

* **Bandeja de Entrada Compartida**: Múltiples agentes respondiendo desde un solo número.
* **Integración de IA (Groq)**: Auto-respuestas y borradores generados por inteligencia artificial con opción de transición a humano (Take over).
* **Pipelines de Ventas**: Tableros Kanban para seguimiento de negocios y leads.
* **Automatización sin código**: Flujos de trabajo automatizados para mensajes de bienvenida, asignación de agentes, etc.
* **Campañas Masivas**: Envío de difusiones a listas de contactos segmentadas.

---
© CRM LeadFlow. Todos los derechos reservados.
