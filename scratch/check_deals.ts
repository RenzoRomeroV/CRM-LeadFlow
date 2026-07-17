import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDeals() {
  const { data, error } = await supabase.from('deals').select('*')
  console.log('Deals:', data)
  if (error) console.error(error)
}

checkDeals()
