import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function useChildren(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['children', familyId],
    queryFn: async () => {
      if (!familyId) throw new Error('familyId required');
      return dataClient.getChildren(familyId);
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000, // 5 minutes
  });
}
