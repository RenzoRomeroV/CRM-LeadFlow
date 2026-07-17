import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, ai_reply_count, ai_autoreply_disabled, ai_handoff_summary, assigned_agent_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    
  console.log('Last Conversation:', JSON.stringify(data, null, 2))
}

check()
