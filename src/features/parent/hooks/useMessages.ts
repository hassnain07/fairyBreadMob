import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import type { ChatMessage } from '@/types/message';

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return dataClient.getMessages?.(conversationId) ?? [];
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      return dataClient.sendMessage?.(conversationId, body);
    },
    onSuccess: (data, { conversationId }) => {
      // Invalidate messages query
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}
