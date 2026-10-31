import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';

/**
 * Fetches a family's term history. Used together with getActiveTerm() from
 * termUtils to find the currently active term (end_date in the future).
 */
export function useTerms(familyId: string | null | undefined) {
  return useQuery({
    queryKey: qk.terms(familyId ?? ''),
    queryFn: async () => {
      if (!familyId) throw new Error('familyId required');
      return dataClient.getTerms(familyId);
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });
}
