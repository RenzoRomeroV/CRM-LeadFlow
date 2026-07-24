require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('conversations')
    .select('ai_autoreply_disabled, ai_reply_count, assigned_agent_id')
    .eq('id', '86a04c6d-d35e-4e07-815d-30e2a4291543')
    .single();

  console.log(data, error);
}
check();
