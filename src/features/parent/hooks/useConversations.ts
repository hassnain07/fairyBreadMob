import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => dataClient.getConversations?.(),
    staleTime: 5 * 60_000, // 5 minutes
  });
}
