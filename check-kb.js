require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('knowledge_articles').select('*').eq('account_id', '95dfe4f4-a97e-4b2c-b358-6dd8d525b439');
  console.log(JSON.stringify(data, null, 2));
}

check();
