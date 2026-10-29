import type { AppSupabase } from '../../supabase';
import type { Conversation, ChatMessage, ConversationKind } from '../../../types/message';
import { toAppError } from '../errors';
import { rpc } from './rpc';

export async function getConversations(sb: AppSupabase): Promise<Conversation[]> {
  const result = await rpc<any[]>(sb, 'get_conversations');
  return (result ?? []).map(r => ({
    id: r.id,
    kind: r.kind,
    other_party_name: r.other_party_name || r.teacher_name || r.parent_name || 'Unknown',
    last_message_body: r.last_message_body,
    last_message_at: r.last_message_at,
    unread_count: r.unread_count || 0,
    avatar_color: r.avatar_color,
    family_id: r.family_id,
    teacher_id: r.teacher_id,
  }));
}

export async function startConversation(
  sb: AppSupabase,
  kind: ConversationKind,
  target: { familyId?: string; teacherId?: string }
): Promise<string> {
  const result = await rpc<any>(sb, 'start_conversation', {
    p_kind: kind,
    p_family_id: target.familyId,
    p_teacher_id: target.teacherId,
  });
  return result.id;
}

export async function getMessages(sb: AppSupabase, conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at');

  if (error) throw toAppError(error);
  return data ?? [];
}

export async function sendMessage(sb: AppSupabase, conversationId: string, body: string): Promise<ChatMessage> {
  const result = await rpc<any>(sb, 'send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  return {
    id: result.id,
    conversation_id: result.conversation_id,
    sender_role: result.sender_role,
    sender_name: result.sender_name,
    body: result.body,
    created_at: result.created_at,
  };
}

export async function markConversationRead(sb: AppSupabase, conversationId: string): Promise<void> {
  await rpc<void>(sb, 'mark_conversation_read', { p_conversation_id: conversationId });
}

export function onMessagesChange(
  sb: AppSupabase,
  conversationId: string,
  callback: (message: ChatMessage) => void
) {
  const subscription = sb
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = payload.new as any;
        callback({
          id: message.id,
          conversation_id: message.conversation_id,
          sender_role: message.sender_role,
          sender_name: message.sender_name,
          body: message.body,
          created_at: message.created_at,
        });
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void sb.removeChannel(subscription);
    },
  };
}
