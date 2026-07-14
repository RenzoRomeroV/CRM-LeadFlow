-- ============================================================
-- 034_add_groq_provider.sql
-- Adds support for 'groq' as an AI provider in ai_configs
-- ============================================================

ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'groq'));
