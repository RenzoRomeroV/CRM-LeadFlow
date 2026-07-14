-- Add mfa_enabled to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false;

-- Create mfa_codes table for storing the 6-digit OTPs securely
CREATE TABLE IF NOT EXISTS public.mfa_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code varchar(6) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mfa_codes ENABLE ROW LEVEL SECURITY;

-- No public policies are created for mfa_codes. 
-- It should ONLY be accessed via secure server routes using the service_role key to prevent brute-forcing from the client.
