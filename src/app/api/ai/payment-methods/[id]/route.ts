import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const { error } = await supabase
      .from('ai_payment_methods')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('Error deleting payment method:', error);
      return NextResponse.json({ error: 'Error deleting payment method' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const { type, bank_name, account_number, cci, holder_name, qr_image_url } = body;

    const { data, error } = await supabase
      .from('ai_payment_methods')
      .update({
        type,
        bank_name: bank_name || null,
        account_number,
        cci: cci || null,
        holder_name,
        qr_image_url: qr_image_url || null,
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating payment method:', error);
      return NextResponse.json({ error: 'Error updating payment method' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
