import type { Child } from '../../../types/family';
import type { ClassSession } from '../../../types/teacher';
import type { Payment } from '../../../types/payment';
import type { ClassBooking } from '../../../types/booking';

export const toChild = (r: any): Child => ({
  id: r.id,
  family_id: r.family_id,
  name: r.name,
  initials: r.initials,
  givenName: r.given_name,
  familyName: r.family_name,
  preferredName: r.preferred_name ?? undefined,
  year: r.year_level ?? '',
  school: r.school ?? '',
  enrolled: !!r.enrolled_at,
  concern: r.concern ?? undefined,
  subjects: r.subjects ?? [],
  preferredDays: r.preferred_days ?? [],
  goals: r.goals ?? undefined,
  notes: r.notes ?? undefined,
  preferredTutor: r.preferred_teacher?.name,
  sessions: r.sessions_per_week ?? undefined,
});

export const toClassSession = (r: any): ClassSession => ({
  id: r.id,
  class_id: r.class_id,
  starts_at: r.starts_at,
  ends_at: r.ends_at,
  capacity: r.capacity,
  booked_count: r.booked_count,
  status: r.status,
  spaces_left: r.capacity - r.booked_count,
  subject: r.class?.subject ?? r.subject,
  teacher_id: r.class?.teacher_id ?? r.teacher_id,
  teacher_name: r.class?.teacher?.name ?? r.teacher_name,
  teacher_color: r.class?.teacher?.color ?? r.teacher_color,
  program_color: r.class?.program?.color ?? r.program_color,
});

export const toPayment = (r: any): Payment => ({
  id: r.id,
  family_id: r.family_id,
  family_name: r.family?.parent_name ?? r.family_name,
  type: r.type,
  amount_cents: r.amount_cents,
  gst_cents: r.gst_cents,
  total_cents: r.total_cents,
  status: r.status,
  reference: r.reference,
  term_label: r.term_label,
  proof_filename: r.proof_filename,
  review_note: r.review_note,
  details: r.details || {},
  created_at: r.created_at,
});

export const toClassBooking = (r: any): ClassBooking => ({
  id: r.id,
  family_id: r.family_id,
  child_id: r.child_id,
  class_session_id: r.class_session_id,
  source: r.source,
  status: r.status,
  credit_consumed: r.credit_consumed,
  credit_restored: r.credit_restored,
  hold_expires_at: r.hold_expires_at,
  session: r.session ? toClassSession(r.session) : undefined,
  child: r.child
    ? { id: r.child.id, name: r.child.name, initials: r.child.initials }
    : undefined,
});
