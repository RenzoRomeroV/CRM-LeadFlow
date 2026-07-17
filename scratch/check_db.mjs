import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase.from('ai_configs').select('*')
  console.log('Configs:', JSON.stringify(data, null, 2))
  
  const { data: pm } = await supabase.from('ai_payment_methods').select('*')
  console.log('Payment Methods:', JSON.stringify(pm, null, 2))
}

check()
