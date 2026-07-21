require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.log('Falta SUPABASE_URL o KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearMessages() {
  console.log('Borrando mensajes de la tabla...');
  // Borrar todos los mensajes
  const { error } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Mensajes borrados con exito. La memoria de la IA ahora esta en blanco.');
  }
}

clearMessages();
