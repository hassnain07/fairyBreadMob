import type { AppSupabase } from '../../supabase';
import type { ClassBooking, BookingCancelResult } from '../../../types/booking';
import { toAppError } from '../errors';
import { rpc } from './rpc';
import { toClassBooking } from './mappers';

export async function getBookings(sb: AppSupabase, familyId: string): Promise<ClassBooking[]> {
  const { data, error } = await sb
    .from('class_bookings')
    .select('*, child:children(id,name,initials), session:class_sessions(*)')
    .eq('family_id', familyId)
    .neq('status', 'cancelled')
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toClassBooking);
}

export async function getAllBookings(sb: AppSupabase): Promise<ClassBooking[]> {
  const { data, error } = await sb
    .from('class_bookings')
    .select('*, child:children(id,name,initials), session:class_sessions(*)')
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toClassBooking);
}

export async function getBookingsForTeacher(sb: AppSupabase): Promise<ClassBooking[]> {
  const { data, error } = await sb
    .from('class_bookings')
    .select('*, child:children(id,name,initials), session:class_sessions(*)')
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toClassBooking);
}

export async function bookClassSession(
  sb: AppSupabase,
  childId: string,
  sessionId: string
): Promise<ClassBooking> {
  const result = await rpc<any>(sb, 'book_class_session', {
    p_child_id: childId,
    p_session_id: sessionId,
  });
  return toClassBooking(result);
}

export async function joinWaitlist(
  sb: AppSupabase,
  childId: string,
  sessionId: string
): Promise<ClassBooking> {
  const result = await rpc<any>(sb, 'join_waitlist', {
    p_child_id: childId,
    p_session_id: sessionId,
  });
  return toClassBooking(result);
}

export async function cancelBooking(
  sb: AppSupabase,
  bookingId: string,
  opts?: { restoreCredit?: boolean }
): Promise<BookingCancelResult> {
  const result = await rpc<any>(sb, 'cancel_booking', {
    p_booking_id: bookingId,
    p_restore_credit: opts?.restoreCredit ?? false,
  });
  return {
    credit_restored: result.credit_restored,
    within_window: result.within_window,
  };
}

export async function getWaitingList(sb: AppSupabase): Promise<ClassBooking[]> {
  const { data, error } = await sb
    .from('class_bookings')
    .select('*, child:children(id,name,initials), session:class_sessions(*)')
    .eq('status', 'waiting_list')
    .order('created_at');

  if (error) throw toAppError(error);
  return (data ?? []).map(toClassBooking);
}
