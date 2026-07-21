import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { loadAiConfig } from './src/lib/ai/config'
import { generateReply } from './src/lib/ai/generate'
import { CRM_TOOLS } from './src/lib/ai/defaults'

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const messages = [
    { role: 'user', content: 'tienen torta de mora?' }
  ]
  
  console.log("Loading config...")
  const config = await loadAiConfig(supabase, '95dfe4f4-a97e-4b2c-b358-6dd8d525b439', { requireActive: false })
  
  if (!config) {
    console.log("Config not loaded!")
    return
  }

  console.log("Config loaded. Calling Groq...")
  try {
    const res = await generateReply({
      config: config as any,
      systemPrompt: "Eres un asistente de ventas. NO asumas que tienes productos. DEBES usar buscar_producto siempre.",
      messages: messages as any,
      tools: CRM_TOOLS
    })
    console.log("LLM INITIAL RESPONSE:")
    console.log(JSON.stringify(res, null, 2))
  } catch (e) {
    console.error(e)
  }
}
run()
