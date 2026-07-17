import { supabaseAdmin } from './admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'

export async function analyzeVoucherWithAI(imageUrl: string, accountId: string, messageId: string) {
  // Rotate between keys if multiple are provided via comma
  const groqKeys = (process.env.GROQ_API_KEY_VOUCHER || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    
  // Fallback to the main AI Groq key if the specific voucher keys aren't set
  if (groqKeys.length === 0 && process.env.GROQ_API_KEY) {
    groqKeys.push(process.env.GROQ_API_KEY)
  }

  // Llama 3.2 Vision Preview models on Groq
  const models = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview']

  try {
    console.log('[VisionService] 🚀 Iniciando análisis financiero con Llama 3.2 Vision...')

    // 1. Extract Media ID and download directly from Meta
    const mediaId = imageUrl.split('/').pop()
    if (!mediaId) throw new Error('Could not extract media ID from URL')

    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', accountId)
      .single()

    if (configError || !config) {
      throw new Error('WhatsApp config not found for account')
    }

    const accessToken = decrypt(config.access_token)
    const mediaInfo = await getMediaUrl({ mediaId, accessToken })
    const { buffer, contentType } = await downloadMedia({
      downloadUrl: mediaInfo.url,
      accessToken,
    })

    const base64Image = Buffer.from(buffer).toString('base64')
    const mimeType = contentType || mediaInfo.mimeType || 'image/jpeg'

    const prompt = `Analiza este comprobante de pago (Yape o Plin) y extrae TODOS los datos en formato JSON estricto:
    {
      "monto": número (ej: 29.90),
      "operacion": "string (número de operación)",
      "nombre": "string (nombre del que paga)",
      "fecha": "string (fecha y hora)",
      "tipo": "YAPE" o "PLIN"
    }
    Responde solo el JSON puro sin bloques de código.`

    // 2. Call the API with key rotation
    for (const key of groqKeys) {
      for (const model of models) {
        try {
          console.log(`[VisionService] Probando ${model} (Llave ...${key.slice(-4)})...`)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 25000)

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { 
                  role: 'user', 
                  content: [
                    { type: 'text', text: prompt }, 
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                  ] 
                }
              ],
              response_format: { type: 'json_object' }
            }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (!res.ok) {
            const errorText = await res.text()
            throw new Error(errorText)
          }

          const data = await res.json()
          let content = data.choices[0].message.content
          // Clean up formatting in case the model returns markdown codeblocks
          content = content.replace(/```json/gi, '').replace(/```/g, '').trim()
          
          const extractedJson = JSON.parse(content)
          console.log('[VisionService] ✅ ¡ÉXITO! Datos extraídos:', extractedJson)

          // Protect against duplicates
          if (extractedJson.operacion && extractedJson.tipo) {
            const { error: insertError } = await supabaseAdmin()
              .from('payment_vouchers')
              .insert({
                account_id: accountId,
                operacion: String(extractedJson.operacion).trim(),
                monto: typeof extractedJson.monto === 'number' ? extractedJson.monto : null,
                fecha: extractedJson.fecha,
                nombre: extractedJson.nombre,
                tipo: String(extractedJson.tipo).toUpperCase().trim(),
                message_id: messageId
              })
            
            if (insertError) {
              if (insertError.code === '23505') { // Postgres Unique Violation
                console.warn(`⚠️ Voucher duplicado detectado (Operación: ${extractedJson.operacion})`)
                return { ...extractedJson, error: 'DUPLICATE_VOUCHER' }
              }
              console.error('[VisionService] Error guardando voucher:', insertError)
            }
          }

          return extractedJson
        } catch (e: any) {
          const msg = e.message || String(e)
          console.warn(`⚠️ Error con ${model} usando llave ...${key.slice(-4)}: ${msg}`)
        }
      }
    }

    return null
  } catch (error: any) {
    console.error('[VisionService] Error crítico:', error.message)
    return null
  }
}
