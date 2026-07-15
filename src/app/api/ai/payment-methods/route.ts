import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount();
    const { data, error } = await supabase
      .from('ai_payment_methods')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Error loading payment methods' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');
    const body = await request.json();

    const { type, bank_name, account_number, cci, holder_name, qr_image_url } = body;

    if (!type || !account_number || !holder_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_payment_methods')
      .insert({
        account_id: accountId,
        created_by: userId,
        type,
        bank_name: bank_name || null,
        account_number,
        cci: cci || null,
        holder_name,
        qr_image_url: qr_image_url || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting payment method:', error);
      return NextResponse.json({ error: 'Error creating payment method' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
