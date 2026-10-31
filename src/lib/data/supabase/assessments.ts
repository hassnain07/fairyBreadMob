import type { AppSupabase } from '../../supabase';
import type { Assessment, StudentReport, NewReport, AttendanceRecord } from '../../../types/booking';
import { toAppError } from '../errors';
import { rpc } from './rpc';

export async function getAssessments(sb: AppSupabase, familyId: string): Promise<Assessment[]> {
  const { data, error } = await sb
    .from('assessments')
    .select('*, child:children(name)')
    .eq('family_id', familyId);

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function getTeacherAssessments(sb: AppSupabase): Promise<Assessment[]> {
  const { data, error } = await sb
    .from('assessments')
    .select('*, child:children(name)');

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createTeacherAssessments(
  sb: AppSupabase,
  rows: Array<{ childId: string; classId?: string; date: string; time: string }>
): Promise<Assessment[]> {
  throw new Error('Not yet implemented: createTeacherAssessments');
}

export async function updateAssessment(
  sb: AppSupabase,
  id: string,
  patch: Partial<Pick<Assessment, 'status' | 'scheduled_date' | 'scheduled_time' | 'notes'>>
): Promise<Assessment> {
  throw new Error('Not yet implemented: updateAssessment');
}

export async function getReportsForChild(sb: AppSupabase, childId: string): Promise<StudentReport[]> {
  const { data, error } = await sb
    .from('student_reports')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    child_id: r.child_id,
    teacher_id: r.teacher_id,
    term: r.term_label ?? r.term ?? '',
    overall: r.overall ?? r.overall_rating ?? 0,
    subjects: r.subjects ?? [],
    strengths: r.strengths ?? '',
    areas: r.areas ?? '',
    note: r.note ?? '',
    created_at: r.created_at,
  }));
}

export async function getTeacherReports(sb: AppSupabase): Promise<StudentReport[]> {
  const { data, error } = await sb
    .from('student_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    child_id: r.child_id,
    teacher_id: r.teacher_id,
    term: r.term_label ?? r.term ?? '',
    overall: r.overall ?? r.overall_rating ?? 0,
    subjects: r.subjects ?? [],
    strengths: r.strengths ?? '',
    areas: r.areas ?? '',
    note: r.note ?? '',
    created_at: r.created_at,
  }));
}

export async function createReport(sb: AppSupabase, report: NewReport): Promise<StudentReport> {
  throw new Error('Not yet implemented: createReport');
}

export async function getAttendance(sb: AppSupabase, sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await sb
    .from('attendance')
    .select('class_session_id, child_id, status')
    .eq('class_session_id', sessionId);

  if (error) throw toAppError(error);
  return (data ?? []).map((r: any) => ({
    class_session_id: r.class_session_id,
    child_id: r.child_id,
    status: r.status,
  }));
}

export async function getChildAttendance(sb: AppSupabase, childId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await sb
    .from('attendance')
    .select('class_session_id, child_id, status')
    .eq('child_id', childId)
    .order('class_session_id', { ascending: false });

  if (error) throw toAppError(error);
  return (data ?? []).map((r: any) => ({
    class_session_id: r.class_session_id,
    child_id: r.child_id,
    status: r.status,
  }));
}

export async function saveAttendance(
  sb: AppSupabase,
  sessionId: string,
  records: Array<{ childId: string; status: AttendanceRecord['status'] }>
): Promise<number> {
  // Matches the web portal: the save_attendance RPC takes a session id and an
  // array of { child_id, status } records, upserting the attendance rows.
  const result = await rpc<number>(sb, 'save_attendance', {
    p_session_id: sessionId,
    p_records: records.map((r) => ({ child_id: r.childId, status: r.status })),
  });
  return result ?? records.length;
}
