import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function useChildById(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['child', childId],
    queryFn: async () => {
      if (!childId) throw new Error('childId required');
      const children = await dataClient.getAllChildren();
      const child = children.find(c => c.id === childId);
      if (!child) throw new Error('Child not found');
      return child;
    },
    enabled: !!childId,
    staleTime: 5 * 60_000,
  });
}
