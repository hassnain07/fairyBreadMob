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
  if (!intent.proof) throw new Error('Proof of payment is required');

  // Generate stable payment ID once per attempt
  const paymentId = intent.paymentId || crypto.randomUUID();

  // Build storage path: familyId/paymentId/filename
  const proofName = intent.proof.name || 'proof.jpg';
  const safeName = proofName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const proofPath = `${intent.familyId}/${paymentId}/${safeName}`;

  // Upload file to supabase storage in payment-proofs bucket
  const { error: uploadError } = await sb.storage
    .from('payment-proofs')
    .upload(proofPath, intent.proof, {
      contentType: intent.proof.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw toAppError(uploadError);

  // Call RPC with exact args from web
  const result = await rpc<any>(sb, 'submit_payment', {
    p_id: paymentId,
    p_family_id: intent.familyId,
    p_type: intent.type,
    p_proof_path: proofPath,
    p_proof_filename: safeName,
    p_child_id: intent.childId ?? null,
    p_class_session_id: intent.sessionId ?? null,
    p_assessment_date: intent.assessmentDate ?? null,
    p_assessment_time: intent.assessmentTime ?? null,
  });

  return toPayment(result);
}

export async function getProofUrl(sb: AppSupabase, paymentId: string): Promise<string | null> {
  const { data, error } = await sb
    .from('payments')
    .select('proof_path')
    .eq('id', paymentId)
    .single();

  if (error) throw toAppError(error);
  if (!data?.proof_path) return null;

  // Generate signed URL for private bucket (valid 1 hour)
  const { data: signedData, error: signError } = await sb.storage
    .from('payment-proofs')
    .createSignedUrl(data.proof_path, 3600);

  if (signError) return null;
  return signedData?.signedUrl || null;
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
