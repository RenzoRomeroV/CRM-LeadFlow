-- Company Product Fields Migration

CREATE TABLE IF NOT EXISTS public.company_product_fields (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade not null,
  field_name text not null,
  field_type text not null default 'text', -- text, number, boolean, etc.
  created_at timestamptz not null default now()
);

-- Unique constraint so an account doesn't have duplicate field names
CREATE UNIQUE INDEX IF NOT EXISTS company_product_fields_account_name_idx ON public.company_product_fields (account_id, lower(field_name));

-- RLS
ALTER TABLE public.company_product_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fields in their accounts" ON public.company_product_fields
  FOR SELECT
  USING (
    is_account_member(account_id)
  );

CREATE POLICY "Users can insert fields in their accounts" ON public.company_product_fields
  FOR INSERT
  WITH CHECK (
    is_account_member(account_id)
  );

CREATE POLICY "Users can update fields in their accounts" ON public.company_product_fields
  FOR UPDATE
  USING (
    is_account_member(account_id)
  );

CREATE POLICY "Users can delete fields in their accounts" ON public.company_product_fields
  FOR DELETE
  USING (
    is_account_member(account_id)
  );
