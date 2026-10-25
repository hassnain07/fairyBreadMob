import type { AppSupabase } from '../../supabase';
import type { AdminStats } from '../../../types/admin';
import { rpc } from './rpc';

export async function getAdminStats(sb: AppSupabase): Promise<AdminStats> {
  const result = await rpc<any>(sb, 'admin_dashboard_stats');
  return {
    active_students: result.active_students || 0,
    upcoming_assessments: result.upcoming_assessments || 0,
    classes_today: result.classes_today || 0,
    pending_payments: result.pending_payments || 0,
    reports_due: result.reports_due || 0,
    revenue_this_month_cents: result.revenue_this_month_cents || 0,
    weekly_attendance: result.weekly_attendance || [],
  };
}

export async function inviteStaff(
  sb: AppSupabase,
  input: { email: string; fullName: string; role: 'teacher' | 'admin'; subjects?: string[]; color?: string }
): Promise<void> {
  throw new Error('Not yet implemented: inviteStaff (Edge Function)');
}

export async function deleteMyAccount(sb: AppSupabase): Promise<void> {
  throw new Error('Not yet implemented: deleteMyAccount (Edge Function)');
}
