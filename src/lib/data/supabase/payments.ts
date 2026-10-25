import type { AppSupabase } from '../../supabase';
import type { Payment, PaymentIntent, PriceQuote } from '../../../types/payment';
import { toAppError } from '../errors';
import { toPayment } from './mappers';
import { rpc } from './rpc';

export async function getPriceQuote(sb: AppSupabase, type: Payment['type'], familyId: string): Promise<PriceQuote> {
  const result = await rpc<any>(sb, 'quote_price', { p_family_id: familyId, p_type: type });
  return {
    base_cents: result.base_cents,
    registration_cents: result.registration_cents,
    amount_cents: result.amount_cents,
    gst_cents: result.gst_cents,
    total_cents: result.total_cents,
  };
}

export async function getPayments(sb: AppSupabase, familyId: string): Promise<Payment[]> {
  const { data, error } = await sb
    .from('payments')
    .select('*, family:families(parent_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map(toPayment);
}

export async function getAllPayments(sb: AppSupabase, opts?: { status?: Payment['status'] }): Promise<Payment[]> {
  let q = sb.from('payments').select('*, family:families(parent_name)');
  if (opts?.status) q = q.eq('status', opts.status);
  const { data, error } = await q.order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map(toPayment);
}

export async function submitPayment(sb: AppSupabase, intent: PaymentIntent): Promise<Payment> {
  // intent contains: type, familyId, proof (File or blob), amount_cents, etc.
  if (!intent.proof) throw new Error('Proof of payment is required');

  // Upload file to supabase storage
  const timestamp = Date.now();
  const fileName = `payment-${intent.familyId}-${timestamp}`;
  const { error: uploadError } = await sb.storage
    .from('payment-proofs')
    .upload(fileName, intent.proof, {
      contentType: intent.proof.type || 'application/octet-stream',
    });

  if (uploadError) throw toAppError(uploadError);

  // Call RPC to create payment record
  let p_child_id: string | undefined;
  let p_session_id: string | undefined;

  if (intent.type === 'individual_class') {
    p_child_id = intent.childId;
    p_session_id = intent.sessionId;
  } else if (intent.type === 'assessment') {
    p_child_id = intent.childId;
  }

  const result = await rpc<any>(sb, 'submit_payment', {
    p_family_id: intent.familyId,
    p_type: intent.type,
    p_child_id,
    p_session_id,
    p_amount_cents: intent.amount_cents,
    p_proof_file_name: fileName,
    p_reference: intent.reference,
  });

  return toPayment(result);
}

export async function getProofUrl(sb: AppSupabase, paymentId: string): Promise<string> {
  const { data, error } = await sb
    .from('payments')
    .select('proof_file_name')
    .eq('id', paymentId)
    .single();

  if (error) throw toAppError(error);
  if (!data?.proof_file_name) throw new Error('No proof file associated with this payment');

  const { data: urlData } = sb.storage
    .from('payment-proofs')
    .getPublicUrl(data.proof_file_name);

  return urlData.publicUrl;
}

export async function verifyPayment(
  sb: AppSupabase,
  paymentId: string,
  action: 'approve' | 'reject',
  note?: string
): Promise<Payment> {
  const result = await rpc<any>(sb, 'verify_payment', {
    p_payment_id: paymentId,
    p_action: action,
    p_note: note,
  });
  return toPayment(result);
}

export async function adminRecordPayment(
  sb: AppSupabase,
  input: { familyId: string; type: 'term' | 'individual_class'; childId?: string; sessionId?: string; note?: string }
): Promise<Payment> {
  const result = await rpc<any>(sb, 'admin_record_payment', {
    p_family_id: input.familyId,
    p_type: input.type,
    p_child_id: input.childId,
    p_session_id: input.sessionId,
    p_note: input.note,
  });
  return toPayment(result);
}
