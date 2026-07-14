import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Delete any existing codes for this user to prevent spam
    await supabase.from('mfa_codes').delete().eq('user_id', user.id);

    // Insert new code
    const { error: insertError } = await supabase.from('mfa_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Error inserting MFA code:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // SIMULATED EMAIL SENDING
    console.log('\n\n=========================================================');
    console.log(`🔐 MFA CODE FOR ${user.email}`);
    console.log(`Tu código de verificación de 6 dígitos es: ${code}`);
    console.log('=========================================================\n\n');

    return NextResponse.json({ success: true, message: 'Code sent via simulated email' });
  } catch (err) {
    console.error('MFA Send Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
