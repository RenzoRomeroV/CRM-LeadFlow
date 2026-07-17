-- ============================================================
-- 040_add_groq_to_ai_usage_log.sql
-- Adds support for 'groq' as an AI provider in ai_usage_log
-- ============================================================

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_provider_check CHECK (provider IN ('openai', 'anthropic', 'groq'));
