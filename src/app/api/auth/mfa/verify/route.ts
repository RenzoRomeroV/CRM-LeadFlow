import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the code in the database
    const { data: codeData, error: findError } = await supabaseAdmin
      .from('mfa_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .single();

    if (findError || !codeData) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    // Check expiration
    if (new Date(codeData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'El código expiró, reenvíe nuevamente' }, { status: 400 });
    }

    // Valid code! Delete it to prevent reuse
    await supabaseAdmin.from('mfa_codes').delete().eq('id', codeData.id);

    // Set the mfa_verified cookie
    const response = NextResponse.json({ success: true });
    
    // Set a secure, HTTP-only cookie valid for the session
    response.cookies.set('mfa_verified', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (err) {
    console.error('MFA Verify Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
