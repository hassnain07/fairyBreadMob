import type { AppSupabase } from '../../supabase';
import type { Conversation, ChatMessage, ConversationKind } from '../../../types/message';
import { toAppError } from '../errors';
import { rpc } from './rpc';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable avatar colour derived from conversation id (same algorithm as web portal). */
function avatarColor(id: string): string {
  const colours = ['pink', 'teal', 'yellow', 'orange', 'green'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return colours[h % colours.length];
}

/**
 * Resolve the display name for the other party.
 * Mirrors the web portal's mapConversation logic:
 *   parent_staff  → admin sees family name,  parent sees "Fairybread & Fractions"
 *   teacher_staff → admin sees teacher name, teacher sees "Fairybread & Fractions"
 *   parent_teacher→ parent sees teacher name, teacher sees family name
 */
function resolveOtherPartyName(
  r: any,
  viewerRole: 'parent' | 'teacher' | 'admin'
): string {
  // If the RPC already returns a ready-made title/name field, use it.
  if (r.title) return r.title;
  if (r.other_name) return r.other_name;

  const kind = r.kind as string;
  if (kind === 'parent_staff') {
    return viewerRole === 'parent'
      ? 'Fairybread & Fractions'
      : (r.family_name ?? r.parent_name ?? 'Family');
  }
  if (kind === 'teacher_staff') {
    return viewerRole === 'teacher'
      ? 'Fairybread & Fractions'
      : (r.teacher_name ?? 'Teacher');
  }
  // parent_teacher
  return viewerRole === 'parent'
    ? (r.teacher_name ?? 'Teacher')
    : (r.family_name ?? r.parent_name ?? 'Family');
}

function mapConversation(r: any, viewerRole: 'parent' | 'teacher' | 'admin'): Conversation {
  return {
    id: r.id,
    kind: r.kind,
    other_party_name: resolveOtherPartyName(r, viewerRole),
    last_message_body: r.last_message_body ?? r.last_message ?? r.last_message_preview ?? '',
    last_message_at: r.last_message_at ?? r.created_at,
    unread_count: r.unread_count ?? 0,
    avatar_color: r.avatar_color ?? avatarColor(r.id),
    family_id: r.family_id ?? undefined,
    teacher_id: r.teacher_id ?? undefined,
  };
}

// ── Methods ───────────────────────────────────────────────────────────────────

export async function getConversations(sb: AppSupabase): Promise<Conversation[]> {
  // Fetch viewer role so we can resolve the "other party" name correctly.
  const ctx = await rpc<Record<string, unknown>>(sb, 'get_my_context').catch(() => null);
  const rawRole = ctx?.role as string | undefined;
  const viewerRole: 'parent' | 'teacher' | 'admin' =
    rawRole === 'admin' ? 'admin' : rawRole === 'teacher' ? 'teacher' : 'parent';

  const rows = await rpc<any[]>(sb, 'get_conversations');
  return (rows ?? []).map(r => mapConversation(r, viewerRole));
}

export async function startConversation(
  sb: AppSupabase,
  kind: ConversationKind,
  target: { familyId?: string; teacherId?: string }
): Promise<string> {
  const result = await rpc<any>(sb, 'start_conversation', {
    p_kind: kind,
    p_family_id: target.familyId ?? null,
    p_teacher_id: target.teacherId ?? null,
  });
  // The RPC may return a plain string id or an object with an id field.
  return typeof result === 'string' ? result : (result?.id ?? result);
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
