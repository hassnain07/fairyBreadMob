import { supabase } from '../supabase';
import type { AuthUser, GetMyContextResult } from '@/types/auth';

export const dataClient = {
  async signIn(email: string, password: string): Promise<AuthUser> {
    const trimmedEmail = email.trim().toLowerCase();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const contextResult = await supabase.rpc('get_my_context');
    if (contextResult.error) {
      throw new Error('Failed to fetch user context');
    }

    const context = contextResult.data as GetMyContextResult | null;
    if (!context) {
      throw new Error('Your account is inactive. Please contact admin@fairybread.au');
    }

    return toAuthUser(context);
  },

  async getMyContext(): Promise<AuthUser | null> {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) return null;

    const { data, error } = await supabase.rpc('get_my_context');
    if (error) return null;

    const context = data as GetMyContextResult | null;
    if (!context) return null;

    return toAuthUser(context);
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  onAuthChange(callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED') => void) {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') callback('SIGNED_IN');
      else if (event === 'SIGNED_OUT') callback('SIGNED_OUT');
      else if (event === 'PASSWORD_RECOVERY') callback('PASSWORD_RECOVERY');
      else if (event === 'TOKEN_REFRESHED') callback('TOKEN_REFRESHED');
    });

    return () => data?.subscription?.unsubscribe();
  },
};

function toAuthUser(context: GetMyContextResult): AuthUser {
  const names = context.full_name.split(' ');
  return {
    id: context.id,
    email: context.email,
    fullName: context.full_name,
    firstName: names[0],
    role: context.role,
    familyId: context.family_id,
    teacherId: context.teacher_id,
  };
}
