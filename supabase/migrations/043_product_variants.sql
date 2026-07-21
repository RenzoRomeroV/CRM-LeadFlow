-- Product Variants Migration

-- 1. Create the product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  name text, -- Optional variant name (e.g. "Caja x 12")
  price numeric(10, 2) not null default 0,
  stock integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for JSONB attributes on variants
CREATE INDEX IF NOT EXISTS product_variants_attributes_idx ON public.product_variants USING GIN (attributes);

-- 2. Migrate existing data: For every product, create a default variant containing its price, stock, and attributes
INSERT INTO public.product_variants (product_id, name, price, stock, attributes)
SELECT id, 'Principal', price, stock, attributes
FROM public.products;

-- 3. Remove columns from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS price;
ALTER TABLE public.products DROP COLUMN IF EXISTS stock;
ALTER TABLE public.products DROP COLUMN IF EXISTS attributes;

-- 4. RLS for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product variants in their accounts" ON public.product_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
      AND is_account_member(p.account_id)
    )
  );

CREATE POLICY "Users can insert product variants in their accounts" ON public.product_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
      AND is_account_member(p.account_id)
    )
  );

CREATE POLICY "Users can update product variants in their accounts" ON public.product_variants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
      AND is_account_member(p.account_id)
    )
  );

CREATE POLICY "Users can delete product variants in their accounts" ON public.product_variants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
      AND is_account_member(p.account_id)
    )
  );
