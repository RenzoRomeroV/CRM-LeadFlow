-- Agrega la columna is_active a la tabla accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Opcional: Actualizar las cuentas existentes para asegurar que estén activas
UPDATE public.accounts SET is_active = TRUE WHERE is_active IS NULL;
