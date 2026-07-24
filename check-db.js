require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const convId = '86a04c6d-d35e-4e07-815d-30e2a4291543';
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', convId)
    .single();

  console.log('Conversation:', conv, error);

  const { data: msgs } = await supabase
    .from('messages')
    .select('id, content_text, created_at, sender_type')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent messages:', msgs);

  if (conv && conv.account_id) {
    const { data: aiConfig } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('account_id', conv.account_id)
      .single();
    console.log('AI Config:', aiConfig);
  }
}

main().catch(console.error);
