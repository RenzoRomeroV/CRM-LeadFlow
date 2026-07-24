require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALGORITHM = 'aes-256-gcm';
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY is not set');
    const [ivHex, ctHex, tagHex] = encryptedText.split(':');
    if (!ivHex || !ctHex || !tagHex) return encryptedText;
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(key, 'hex'),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return 'DECRYPTION_ERROR: ' + error.message;
  }
}

async function main() {
  const { data: configs, error } = await supabase
    .from('whatsapp_config')
    .select('id, verify_token, account_id');

  if (configs) {
    for (const config of configs) {
      console.log(`Token: ${decrypt(config.verify_token)}`);
    }
  }
}

main().catch(console.error);
