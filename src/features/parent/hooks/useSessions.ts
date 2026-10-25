import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import { addDays } from 'date-fns';

interface UseSessionsOptions {
  from?: Date | string;
  to?: Date | string;
  days?: number; // default 7
}

export function useSessions(opts?: UseSessionsOptions) {
  const days = opts?.days ?? 7;
  
  // Ensure we always use UTC ISO strings to avoid timezone issues
  let fromStr: string;
  if (typeof opts?.from === 'string') {
    fromStr = opts.from;
  } else if (opts?.from instanceof Date) {
    fromStr = opts.from.toISOString();
  } else {
    // Use current time in UTC
    fromStr = new Date().toISOString();
  }

  let toStr: string;
  if (typeof opts?.to === 'string') {
    toStr = opts.to;
  } else if (opts?.to instanceof Date) {
    toStr = opts.to.toISOString();
  } else {
    // Add days to the from date
    const fromDate = new Date(fromStr);
    toStr = addDays(fromDate, days).toISOString();
  }

  return useQuery({
    queryKey: ['sessions', fromStr, toStr],
    queryFn: async () => {
      return dataClient.getUpcomingSessions({ from: fromStr, to: toStr });
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}
