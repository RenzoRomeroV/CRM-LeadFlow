export async function analyzeVoucherWithAI(imageUrl: string) {
  // Rotate between keys if multiple are provided via comma
  const groqKeys = (process.env.GROQ_API_KEY_VOUCHER || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    
  // Fallback to the main AI Groq key if the specific voucher keys aren't set
  if (groqKeys.length === 0 && process.env.GROQ_API_KEY) {
    groqKeys.push(process.env.GROQ_API_KEY)
  }

  // Llama 4 Scout for Vision/OCR
  const models = ['meta-llama/llama-4-scout-17b-16e-instruct']

  try {
    console.log('[VisionService] 🚀 Iniciando análisis financiero con Llama 4 Scout...')

    // 1. Download image and convert to base64
    const responseImage = await fetch(imageUrl)
    if (!responseImage.ok) {
      throw new Error(`Failed to download image: ${responseImage.statusText}`)
    }
    const arrayBuffer = await responseImage.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = responseImage.headers.get('content-type') || 'image/jpeg'

    const prompt = `Analiza este comprobante de pago (Yape o Plin) y extrae TODOS los datos en formato JSON estricto:
    {
      "monto": número (ej: 29.90),
      "operacion": "string (número de operación)",
      "nombre": "string (nombre del que paga)",
      "fecha": "string (fecha y hora)",
      "tipo": "YAPE" o "PLIN"
    }
    Responde solo el JSON puro.`

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
          const extractedJson = JSON.parse(data.choices[0].message.content)
          
          console.log('[VisionService] ✅ ¡ÉXITO! Datos extraídos:', extractedJson)
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
