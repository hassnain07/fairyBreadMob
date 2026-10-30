import type { AppSupabase } from '../../supabase';
import type { Program, Teacher, ClassSlot, ClassSession, ClassSlotInput } from '../../../types/teacher';
import { toAppError } from '../errors';
import { rpc } from './rpc';

export async function getPrograms(sb: AppSupabase): Promise<Program[]> {
  const { data, error } = await sb.from('programs').select('*').eq('is_active', true);
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function upsertProgram(sb: AppSupabase, p: Partial<Program>): Promise<Program> {
  const { data, error } = await sb
    .from('programs')
    .upsert({ id: p.id, name: p.name, description: p.description, color: p.color, is_active: p.is_active })
    .select()
    .single();

  if (error) throw toAppError(error);
  if (!data) throw toAppError({ message: 'invalid_input' });
  return data;
}

export async function getTeachers(sb: AppSupabase): Promise<Teacher[]> {
  const { data, error } = await sb
    .from('teachers')
    .select('id,name,initials,subjects,color')
    .eq('is_active', true);

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function getClassSlots(sb: AppSupabase): Promise<ClassSlot[]> {
  const { data, error } = await sb
    .from('v_class_catalog')
    .select('*')
    .eq('is_active', true);

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createClassSlot(sb: AppSupabase, input: ClassSlotInput): Promise<ClassSlot> {
  throw new Error('Not yet implemented: createClassSlot');
}

export async function updateClassSlot(sb: AppSupabase, id: string, patch: Partial<ClassSlotInput>): Promise<ClassSlot> {
  throw new Error('Not yet implemented: updateClassSlot');
}

export async function deactivateClassSlot(
  sb: AppSupabase,
  id: string,
  cancelFuture?: boolean
): Promise<number> {
  throw new Error('Not yet implemented: deactivateClassSlot');
}

export async function getUpcomingSessions(
  sb: AppSupabase,
  opts?: { from?: string; to?: string; classId?: string; teacherId?: string }
): Promise<ClassSession[]> {
  const fromDate = opts?.from ?? new Date().toISOString();
  const hasExplicitRange = !!(opts?.from || opts?.to);

  // If filtering by teacher, resolve their class IDs first
  let classIds: string[] | null = null;
  if (opts?.teacherId) {
    const { data: classes, error: classErr } = await sb
      .from('classes')
      .select('id')
      .eq('teacher_id', opts.teacherId);
    if (classErr) throw toAppError(classErr);
    classIds = (classes ?? []).map((c: any) => c.id);
    if (classIds.length === 0) return [];
  }

  let q = sb
    .from('class_sessions')
    .select(`
      id, class_id, starts_at, ends_at, capacity, booked_count, status,
      class:classes(
        teacher_id,
        program:programs(name, color),
        teacher:teachers(name, color)
      )
    `)
    .gte('starts_at', fromDate)
    .order('starts_at', { ascending: true });

  // Only show scheduled sessions unless an explicit range was requested
  // (explicit range = admin reviewing past sessions too)
  if (!hasExplicitRange) q = q.eq('status', 'scheduled');
  if (opts?.to)      q = q.lt('starts_at', opts.to);       // exclusive upper bound, matches web
  if (opts?.classId) q = q.eq('class_id', opts.classId);
  if (classIds)      q = q.in('class_id', classIds);

  const { data, error } = await q;
  if (error) throw toAppError(error);

  return (data ?? []).map((r: any) => ({
    id:            r.id,
    class_id:      r.class_id,
    starts_at:     r.starts_at,
    ends_at:       r.ends_at,
    capacity:      r.capacity,
    booked_count:  r.booked_count,
    status:        r.status,
    spaces_left:   Math.max(0, r.capacity - r.booked_count),
    subject:       r.class?.program?.name   ?? '',
    teacher_id:    r.class?.teacher_id      ?? '',
    teacher_name:  r.class?.teacher?.name   ?? '',
    teacher_color: r.class?.teacher?.color  ?? '',
    program_color: r.class?.program?.color  ?? '',
  } as ClassSession));
}

export async function cancelSession(sb: AppSupabase, sessionId: string, reason?: string): Promise<number> {
  throw new Error('Not yet implemented: cancelSession');
}
