-- ============================================================
-- 038_ai_company_payments.sql
-- Adds company profile fields to ai_configs and a new table for payment methods.
-- ============================================================

-- 1. Add company details to ai_configs
ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_ruc text,
  ADD COLUMN IF NOT EXISTS company_location text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_description text;

-- 2. Create ai_payment_methods table
CREATE TABLE IF NOT EXISTS ai_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('bank_transfer', 'yape', 'plin')),
  bank_name text,
  account_number text NOT NULL,
  cci text,
  holder_name text NOT NULL,
  qr_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_payment_methods_select ON ai_payment_methods;
CREATE POLICY ai_payment_methods_select ON ai_payment_methods FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_payment_methods_insert ON ai_payment_methods;
CREATE POLICY ai_payment_methods_insert ON ai_payment_methods FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_payment_methods_update ON ai_payment_methods;
CREATE POLICY ai_payment_methods_update ON ai_payment_methods FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_payment_methods_delete ON ai_payment_methods;
CREATE POLICY ai_payment_methods_delete ON ai_payment_methods FOR DELETE
  USING (is_account_member(account_id, 'admin'));

CREATE OR REPLACE FUNCTION public.update_ai_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_payment_methods_updated_at ON ai_payment_methods;
CREATE TRIGGER ai_payment_methods_updated_at
  BEFORE UPDATE ON ai_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_payment_methods_updated_at();

-- 3. Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment_qrs',
  'payment_qrs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for payment_qrs
DROP POLICY IF EXISTS "Public QR images are viewable by everyone." ON storage.objects;
CREATE POLICY "Public QR images are viewable by everyone." ON storage.objects
  FOR SELECT USING (bucket_id = 'payment_qrs');

DROP POLICY IF EXISTS "Authenticated users can upload QRs" ON storage.objects;
CREATE POLICY "Authenticated users can upload QRs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'payment_qrs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their QRs" ON storage.objects;
CREATE POLICY "Users can update their QRs" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'payment_qrs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their QRs" ON storage.objects;
CREATE POLICY "Users can delete their QRs" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'payment_qrs' AND auth.role() = 'authenticated');
