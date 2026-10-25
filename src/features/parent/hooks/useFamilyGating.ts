import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function useFamilyGating(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['family-gating', familyId],
    queryFn: async () => {
      if (!familyId) throw new Error('familyId required');
      return dataClient.getGating(familyId);
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });
}
