require('dotenv').config({ path: '.env' });

async function test() {
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const tools = [
    {
      type: 'function',
      function: {
        name: 'buscar_producto',
        description: 'Buscar un producto',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            atributos: { type: 'object' }
          },
          required: ['query']
        }
      }
    }
  ];

  const messages = [
    { role: 'system', content: 'Eres un asistente. Si preguntan por un producto o atributo especifico, DEBES usar la herramienta buscar_producto. NUNCA asumas que un producto existe.' },
    { role: 'user', content: 'tienes torta de mora?' }
  ];

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools
    });
    console.log(JSON.stringify(res.choices[0].message, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
