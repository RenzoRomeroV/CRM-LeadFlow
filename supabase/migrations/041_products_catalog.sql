-- Product Catalog Migration

CREATE TABLE IF NOT EXISTS public.products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  stock integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast JSONB querying
CREATE INDEX IF NOT EXISTS products_attributes_idx ON public.products USING GIN (attributes);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products in their accounts" ON public.products
  FOR SELECT
  USING (
    is_account_member(account_id)
  );

CREATE POLICY "Users can insert products in their accounts" ON public.products
  FOR INSERT
  WITH CHECK (
    is_account_member(account_id)
  );

CREATE POLICY "Users can update products in their accounts" ON public.products
  FOR UPDATE
  USING (
    is_account_member(account_id)
  );

CREATE POLICY "Users can delete products in their accounts" ON public.products
  FOR DELETE
  USING (
    is_account_member(account_id)
  );
