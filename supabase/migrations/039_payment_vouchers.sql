CREATE TABLE payment_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    operacion TEXT NOT NULL,
    monto NUMERIC(10, 2),
    fecha TEXT,
    nombre TEXT,
    tipo TEXT NOT NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure that for a given account and payment type, the operation number is strictly unique.
CREATE UNIQUE INDEX unique_account_tipo_operacion ON payment_vouchers (account_id, tipo, operacion);

-- Add RLS policies for security (assuming only authenticated users for that account can read/write)
ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment vouchers of their account" 
ON payment_vouchers FOR SELECT 
USING (
    account_id IN (
        SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert payment vouchers to their account" 
ON payment_vouchers FOR INSERT 
WITH CHECK (
    account_id IN (
        SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
);
