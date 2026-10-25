import type { AppSupabase } from '../../supabase';
import { toAppError } from '../errors';
import type { Term, GatingSnapshot } from '../../../types/term';
import { rpc } from './rpc';

export async function getTerms(sb: AppSupabase, familyId: string): Promise<Term[]> {
  const { data, error } = await sb
    .from('terms')
    .select('*')
    .eq('family_id', familyId)
    .order('start_date');

  if (error) throw toAppError(error);
  return (data ?? []).map(toTerm);
}

export async function getAllTerms(sb: AppSupabase): Promise<Term[]> {
  const { data, error } = await sb
    .from('terms')
    .select('*')
    .order('start_date');

  if (error) throw toAppError(error);
  return (data ?? []).map(toTerm);
}

export async function getGating(sb: AppSupabase, familyId: string): Promise<GatingSnapshot> {
  const result = await rpc<any>(sb, 'get_family_gating', { p_family_id: familyId });
  return {
    state: result.gating_state,
    active_term_id: result.active_term_id,
    classes_remaining: result.classes_remaining ?? 0,
    end_date: result.end_date,
  };
}

export async function adminAdjustCredits(
  sb: AppSupabase,
  termId: string,
  delta: number,
  note: string
): Promise<Term> {
  const result = await rpc<any>(sb, 'admin_adjust_credits', {
    p_term_id: termId,
    p_delta: delta,
    p_note: note,
  });
  return toTerm(result);
}

function toTerm(r: any): Term {
  return {
    id: r.id,
    family_id: r.family_id,
    status: r.status,
    term_label: r.term_label,
    start_date: r.start_date,
    end_date: r.end_date,
  };
}
