import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import type { AuthUser } from '@/types/auth';

export interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  role: 'parent' | 'teacher' | 'admin' | null;
  familyId: string | null;
  teacherId: string | null;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, gcTime: 10 * 60_000 },
      mutations: { retry: 0 },
    },
  });
}

export const queryClient = createQueryClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await dataClient.getMyContext();
      setUser(u);
    } catch (e) {
      console.warn('Failed to refresh user context:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const off = dataClient.onAuthChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        queryClient.clear();
        return;
      }
      // Keep callback sync; defer async work
      setTimeout(() => {
        void refresh();
      }, 0);
    });
    return off;
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      role: user?.role ?? null,
      familyId: user?.familyId ?? null,
      teacherId: user?.teacherId ?? null,
      signIn: async (email, password) => {
        const u = await dataClient.signIn(email, password);
        setUser(u);
        return u;
      },
      signOut: async () => {
        await dataClient.signOut();
        setUser(null);
        queryClient.clear();
      },
      refresh,
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
