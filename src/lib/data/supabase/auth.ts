import type { AppSupabase } from '../../supabase';
import { toAppError } from '../errors';
import type { AuthUser } from '../../../types/auth';
import { rpc } from './rpc';

export async function signIn(sb: AppSupabase, email: string, password: string): Promise<AuthUser> {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
  if (!data.user) throw toAppError({ message: 'No user returned' });

  // Fetch the full context
  const user = await getMyContext(sb);
  if (!user) throw toAppError({ message: 'not_authenticated' });
  return user;
}

export async function requestSignupOtp(
  sb: AppSupabase,
  input: { email: string; firstName: string; lastName: string; phone?: string }
): Promise<void> {
  const { error } = await sb.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: true,
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      },
    },
  });
  if (error) throw toAppError(error);
}

export async function requestPasswordResetOtp(sb: AppSupabase, email: string): Promise<void> {
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw toAppError(error);
  // Always resolve OK (never reveal whether email exists)
}

export async function verifyOtp(
  sb: AppSupabase,
  email: string,
  code: string,
  purpose: 'signup' | 'recovery'
): Promise<void> {
  const { error } = await sb.auth.verifyOtp({
    email,
    token: code,
    type: purpose === 'signup' ? 'email' : 'recovery',
  });
  if (error) throw toAppError(error);
}

export async function setPassword(sb: AppSupabase, newPassword: string): Promise<void> {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw toAppError(error);
}

export async function signOut(sb: AppSupabase): Promise<void> {
  const { error } = await sb.auth.signOut();
  if (error) throw toAppError(error);
}

export async function getMyContext(sb: AppSupabase): Promise<AuthUser | null> {
  const session = await sb.auth.getSession();
  if (!session.data.session?.user) return null;

  try {
    const ctx = await rpc<any>(sb, 'get_my_context');
    if (!ctx) return null;

    return {
      id: ctx.id,
      email: ctx.email,
      fullName: ctx.full_name,
      firstName: ctx.first_name,
      role: ctx.role,
      familyId: ctx.family_id,
      teacherId: ctx.teacher_id,
    };
  } catch (e) {
    throw toAppError(e);
  }
}

export function onAuthChange(
  sb: AppSupabase,
  cb: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED') => void
): () => void {
  const { data } = sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') cb('SIGNED_IN');
    else if (event === 'SIGNED_OUT') cb('SIGNED_OUT');
    else if (event === 'PASSWORD_RECOVERY') cb('PASSWORD_RECOVERY');
    else if (event === 'TOKEN_REFRESHED') cb('TOKEN_REFRESHED');
  });

  return () => data?.subscription?.unsubscribe?.();
}
