'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { revalidateOperationalViews } from '@/app/actions/operations';

/**
 * Global Supabase Realtime Subscription Hook
 * Establishes a WebSocket channel listening to all database table changes
 * (bookings, sales, expenses, customer_memberships, gift_cards, daily_closings).
 * Instantly triggers server-side revalidation and component state updates.
 */
export function useRealtimeSync(onUpdate?: () => void) {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !('channel' in supabase)) return;

    const channel = supabase
      .channel('public:operating_os_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        async (payload) => {
          console.log('⚡ Realtime Event [bookings]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          console.log('⚡ Realtime Event [sales]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        async (payload) => {
          console.log('⚡ Realtime Event [expenses]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_closings' },
        async (payload) => {
          console.log('⚡ Realtime Event [daily_closings]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_memberships' },
        async (payload) => {
          console.log('⚡ Realtime Event [customer_memberships]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gift_cards' },
        async (payload) => {
          console.log('⚡ Realtime Event [gift_cards]:', payload.eventType);
          await revalidateOperationalViews();
          if (onUpdate) onUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Realtime Channel Subscribed: OS Engine Live');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
