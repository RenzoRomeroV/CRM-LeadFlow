import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize with a fallback string so the build doesn't crash if the env var is missing.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Delete any existing codes for this user to prevent spam
    await supabaseAdmin.from('mfa_codes').delete().eq('user_id', user.id);

    // Insert new code
    const { error: insertError } = await supabaseAdmin.from('mfa_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Error inserting MFA code:', insertError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set. Falling back to console log.');
      console.log(`🔐 MFA CODE FOR ${user.email}: ${code}`);
    } else {
      const { error: emailError } = await resend.emails.send({
        from: 'LeadFlow Security <onboarding@resend.dev>',
        to: user.email!,
        subject: 'Código de Verificación - LeadFlow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Verificación de Seguridad</h2>
            <p style="color: #555; text-align: center; font-size: 16px;">
              Tu código de verificación de 6 dígitos es:
            </p>
            <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${code}</span>
            </div>
            <p style="color: #888; text-align: center; font-size: 14px;">
              Este código expirará en 2 minutos. Si no solicitaste este código, puedes ignorar este correo.
            </p>
          </div>
        `
      });

      if (emailError) {
        console.error('Error sending MFA email via Resend:', emailError);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Code sent successfully' });
  } catch (err) {
    console.error('MFA Send Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
