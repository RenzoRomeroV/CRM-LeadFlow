# Módulo 001: Autenticación y Acceso (Auth)

## ¿Para qué sirve?
Este módulo es la puerta de entrada al CRM. Se encarga de validar quién entra al sistema, proteger las rutas privadas y, próximamente, gestionar si el usuario que ingresa es "Admin" (acceso total) o "Usuario Regular" (vista simplificada).

## ¿Cómo se hizo (Flujo Técnico)?
1. **Frontend:** Pantallas en `src/app/(auth)` como Login y Registro.
2. **Backend/Base de Datos:** Se integra con Supabase Auth para el manejo seguro de contraseñas y sesiones.
3. **Protección:** Se utiliza un Middleware (`src/middleware.ts`) que verifica en cada petición si el usuario tiene una sesión activa (token válido). Si no, lo redirige a la pantalla de Login.

## Funciones principales
- Registro de nuevas cuentas.
- Inicio de sesión con correo y contraseña.
- Recuperación de contraseña.
- Gestión de sesiones persistentes (el usuario no tiene que loguearse cada vez que cierra la pestaña).
