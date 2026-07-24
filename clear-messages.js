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
  const { error: msgErr } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (msgErr) {
    console.error('Error borrando mensajes:', msgErr);
  } else {
    console.log('Mensajes borrados con exito.');
  }

  // Reactivar la IA para todas las conversaciones
  const { error: convErr } = await supabase.from('conversations')
    .update({ 
      ai_autoreply_disabled: false, 
      ai_reply_count: 0 
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (convErr) {
    console.error('Error reactivando IA:', convErr);
  } else {
    console.log('IA reactivada y contadores reiniciados en todas las conversaciones.');
  }
}

clearMessages();
