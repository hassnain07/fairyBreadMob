import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';

interface UseSessionsOptions {
  /** How many days ahead to look. Default 7. */
  days?: number;
  /** Optional explicit to-date override (YYYY-MM-DD). */
  to?: string;
  /** Whether the query should run. Default true. */
  enabled?: boolean;
}

export function useSessions(opts?: UseSessionsOptions) {
  const days = opts?.days ?? 7;

  // Use a stable date-only string for the "to" bound so the query key
  // doesn't change on every render (a full ISO timestamp would do that).
  const weekTo =
    opts?.to ??
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const enabled = opts?.enabled !== false;

  return useQuery({
    queryKey: qk.sessions({ to: weekTo }),
    queryFn:  () =>
      dataClient.getUpcomingSessions({ from: new Date().toISOString(), to: weekTo }),
    enabled,
    staleTime: 5 * 60_000,
  });
}
