import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';

export function useBookings(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['bookings', familyId],
    queryFn: async () => {
      if (!familyId) throw new Error('familyId required');
      return dataClient.getBookings(familyId);
    },
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });
}
