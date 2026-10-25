import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function usePayments(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', familyId],
    queryFn: async () => {
      if (!familyId) throw new Error('familyId required');
      return dataClient.getPayments(familyId);
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000, // 5 minutes
  });
}
