import type { AppSupabase } from '../../supabase';
import { toAppError } from '../errors';
import type { Family, Child, ChildPatch, NewChild } from '../../../types/family';
import { toChild } from './mappers';
import { rpc } from './rpc';

export async function getFamily(sb: AppSupabase, familyId: string): Promise<Family> {
  const { data, error } = await sb
    .from('families')
    .select('*, children(*)')
    .eq('id', familyId)
    .single();

  if (error) throw toAppError(error);
  if (!data) throw toAppError({ message: 'family_not_found' });

  return {
    id: data.id,
    reference_code: data.reference_code,
    parent_name: data.parent_name,
    email: data.email,
    phone: data.phone,
    children: (data.children ?? []).map(toChild),
  };
}

export async function getAllFamilies(sb: AppSupabase): Promise<Family[]> {
  const { data, error } = await sb.from('families').select('*');
  if (error) throw toAppError(error);

  return (data ?? []).map(row => ({
    id: row.id,
    reference_code: row.reference_code,
    parent_name: row.parent_name,
    email: row.email,
    phone: row.phone,
  }));
}

export async function createFamily(
  sb: AppSupabase,
  input: { parentName: string; email?: string; phone?: string }
): Promise<Family> {
  const result = await rpc<any>(sb, 'admin_create_family', {
    p_parent_name: input.parentName,
    p_email: input.email,
    p_phone: input.phone,
  });

  return {
    id: result.id,
    reference_code: result.reference_code,
    parent_name: result.parent_name,
    email: result.email,
    phone: result.phone,
  };
}

export async function updateFamily(
  sb: AppSupabase,
  familyId: string,
  patch: Partial<Pick<Family, 'parent_name' | 'phone'>>
): Promise<Family> {
  const { data, error } = await sb
    .from('families')
    .update({
      parent_name: patch.parent_name,
      phone: patch.phone,
    })
    .eq('id', familyId)
    .select()
    .single();

  if (error) throw toAppError(error);
  if (!data) throw toAppError({ message: 'family_not_found' });

  return {
    id: data.id,
    reference_code: data.reference_code,
    parent_name: data.parent_name,
    email: data.email,
    phone: data.phone,
  };
}

export async function getChildren(sb: AppSupabase, familyId: string): Promise<Child[]> {
  const { data, error } = await sb
    .from('children')
    .select('*, preferred_teacher:teachers(name)')
    .eq('family_id', familyId)
    .is('archived_at', null)
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toChild);
}

export async function getAllChildren(sb: AppSupabase): Promise<Child[]> {
  const { data, error } = await sb
    .from('children')
    .select('*, preferred_teacher:teachers(name)')
    .is('archived_at', null)
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toChild);
}

export async function addChild(sb: AppSupabase, familyId: string, child: NewChild): Promise<Child> {
  const { data, error } = await sb
    .from('children')
    .insert({
      family_id: familyId,
      given_name: child.givenName,
      family_name: child.familyName,
      year_level: child.year,
      school: child.school,
    })
    .select()
    .single();

  if (error) throw toAppError(error);
  if (!data) throw toAppError({ message: 'child_not_found' });

  return toChild(data);
}

export async function updateChild(sb: AppSupabase, childId: string, patch: ChildPatch): Promise<Child> {
  const updateData: Record<string, any> = {};
  if (patch.givenName !== undefined) updateData.given_name = patch.givenName;
  if (patch.familyName !== undefined) updateData.family_name = patch.familyName;
  if (patch.preferredName !== undefined) updateData.preferred_name = patch.preferredName;
  if (patch.year !== undefined) updateData.year_level = patch.year;
  if (patch.school !== undefined) updateData.school = patch.school;
  if (patch.concern !== undefined) updateData.concern = patch.concern;
  if (patch.subjects !== undefined) updateData.subjects = patch.subjects;
  if (patch.preferredDays !== undefined) updateData.preferred_days = patch.preferredDays;
  if (patch.goals !== undefined) updateData.goals = patch.goals;
  if (patch.notes !== undefined) updateData.notes = patch.notes;

  const { data, error } = await sb
    .from('children')
    .update(updateData)
    .eq('id', childId)
    .select()
    .single();

  if (error) throw toAppError(error);
  if (!data) throw toAppError({ message: 'child_not_found' });

  return toChild(data);
}

export async function completeEnrolment(
  sb: AppSupabase,
  childId: string,
  input: any
): Promise<Child> {
  const child = await rpc<any>(sb, 'complete_enrolment', {
    p_child_id: childId,
    p_child: input.child,
    p_parent: input.parent,
    p_referral: input.referral,
    p_signature: input.signature,
    p_agreed_terms: input.agreed_terms,
    p_agreed_privacy: input.agreed_privacy,
    p_agreed_trampoline: input.agreed_trampoline,
  });

  return toChild(child);
}

export async function adminMarkEnrolled(sb: AppSupabase, childId: string, note?: string): Promise<Child> {
  const child = await rpc<any>(sb, 'admin_mark_enrolled', {
    p_child_id: childId,
    p_note: note,
  });

  return toChild(child);
}
