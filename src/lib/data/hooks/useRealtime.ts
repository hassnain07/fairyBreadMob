import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import { qk } from '../queryKeys';
import { useAuth } from '@/app/_providers';

/**
 * useRealtime - subscribe to real-time changes and invalidate queries
 * 
 * Subscribes to:
 * - notifications (new alerts, status changes)
 * - messages (new chat messages, conversation updates)
 * - bookings (changes made by admin)
 * - terms/payments (admin updates)
 * 
 * Handles:
 * - App lifecycle (pause/resume subscriptions)
 * - Query invalidation on changes
 * - Automatic re-connection
 */
export function useRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);
  const appStateRef = useRef<AppStateStatus>('active');

  useEffect(() => {
    if (!user?.id) return; // Only subscribe when authenticated

    // ────────────────────────────────────────────────────────────────
    // Notifications channel (new alerts, term expiring, etc.)
    // ────────────────────────────────────────────────────────────────
    const notificationsChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate notifications list
          qc.invalidateQueries({ queryKey: qk.notifications(user.id) });

          // Based on notification type, invalidate related queries
          const notif = payload.new as any;
          if (notif.type?.includes('booking')) {
            qc.invalidateQueries({ queryKey: qk.bookings(user.id) });
          }
          if (notif.type?.includes('payment')) {
            qc.invalidateQueries({ queryKey: qk.payments(user.id) });
          }
          if (notif.type?.includes('term')) {
            qc.invalidateQueries({ queryKey: qk.gating(user.id) });
            qc.invalidateQueries({ queryKey: qk.terms(user.id) });
          }
          if (notif.type?.includes('report')) {
            qc.invalidateQueries({ queryKey: qk.reports() });
          }
        }
      )
      .subscribe();

    channelsRef.current.push(notificationsChannel);

    // ────────────────────────────────────────────────────────────────
    // Messages channel (new chat messages)
    // ────────────────────────────────────────────────────────────────
    const messagesChannel = supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Invalidate conversations (unread count changes)
          qc.invalidateQueries({ queryKey: qk.conversations(user.id) });
        }
      )
      .subscribe();

    channelsRef.current.push(messagesChannel);

    // ────────────────────────────────────────────────────────────────
    // Bookings channel (admin changes booking status)
    // ────────────────────────────────────────────────────────────────
    const bookingsChannel = supabase
      .channel('bookings:all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'class_bookings',
        },
        (payload) => {
          // Invalidate user's bookings
          qc.invalidateQueries({ queryKey: qk.bookings(user.id) });
        }
      )
      .subscribe();

    channelsRef.current.push(bookingsChannel);

    // ────────────────────────────────────────────────────────────────
    // Payments channel (admin approves/rejects payment)
    // ────────────────────────────────────────────────────────────────
    const paymentsChannel = supabase
      .channel('payments:all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          // Invalidate user's payments
          qc.invalidateQueries({ queryKey: qk.payments(user.id) });
          // Also invalidate gating in case a payment activated a term
          qc.invalidateQueries({ queryKey: qk.gating(user.id) });
        }
      )
      .subscribe();

    channelsRef.current.push(paymentsChannel);

    // ────────────────────────────────────────────────────────────────
    // App state listener (pause/resume on foreground/background)
    // ────────────────────────────────────────────────────────────────
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      if (state === 'active') {
        // App came to foreground - re-subscribe
        channelsRef.current.forEach((channel) => {
          channel.subscribe();
        });
        // Refetch critical queries to catch missed updates
        qc.invalidateQueries({ queryKey: qk.bookings(user.id) });
        qc.invalidateQueries({ queryKey: qk.payments(user.id) });
        qc.invalidateQueries({ queryKey: qk.conversations(user.id) });
      } else if (state === 'background') {
        // App backgrounded - pause subscriptions to save battery
        channelsRef.current.forEach((channel) => {
          channel.unsubscribe();
        });
      }
    });

    // ────────────────────────────────────────────────────────────────
    // Cleanup: unsubscribe on unmount or user change
    // ────────────────────────────────────────────────────────────────
    return () => {
      subscription.remove();
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, qc]);
}
