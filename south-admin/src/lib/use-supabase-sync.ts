'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  DbDepositRequest,
  DbWithdrawRequest,
  DbOrder,
  DbUser,
} from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';

/**
 * useSupabaseSync
 *
 * Subscribes to Supabase Realtime for all admin-relevant tables and
 * populates the admin Zustand store with live data.
 *
 * Tables watched:
 *   - deposit_requests  (status = 'pending')
 *   - withdraw_requests (status = 'pending' | 'processing')
 *   - orders            (status = 'pending' | 'processing')
 *   - users             (kyc_status changes + full list for allUsers)
 *
 * The hook performs an initial fetch for every table and then listens
 * to postgres_changes events so the store stays in sync in real-time.
 * All subscriptions are cleaned up when the owning component unmounts.
 */
export function useSupabaseSync() {
  const {
    isAuthenticated,
    setDepositRequests,
    setWithdrawRequests,
    setKycPendingUsers,
    setOrders,
    setAllUsers,
    setDataLoaded,
  } = useAdminStore();

  // Keep a ref to the channel so we can clean up
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Guard against double-initialisation in React StrictMode
  const initialisedRef = useRef(false);

  // ------------------------------------------------------------------
  // Fetch helpers
  // ------------------------------------------------------------------

  const fetchDepositRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositRequests((data ?? []) as DbDepositRequest[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchDepositRequests error:', err);
    }
  }, [setDepositRequests]);

  const fetchWithdrawRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawRequests((data ?? []) as DbWithdrawRequest[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchWithdrawRequests error:', err);
    }
  }, [setWithdrawRequests]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as DbOrder[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchOrders error:', err);
    }
  }, [setOrders]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const users = (data ?? []) as DbUser[];
      setAllUsers(users);

      // KYC pending = submitted (also include verified/rejected so admin can review history)
      const kycUsers = users.filter(
        (u) =>
          u.kyc_status === 'submitted' ||
          u.kyc_status === 'verified' ||
          u.kyc_status === 'rejected'
      );
      setKycPendingUsers(kycUsers);
    } catch (err) {
      console.error('[SupabaseSync] fetchAllUsers error:', err);
    }
  }, [setAllUsers, setKycPendingUsers]);

  // ------------------------------------------------------------------
  // Initial data fetch
  // ------------------------------------------------------------------

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchDepositRequests(),
      fetchWithdrawRequests(),
      fetchOrders(),
      fetchAllUsers(),
    ]);
    setDataLoaded(true);
  }, [fetchDepositRequests, fetchWithdrawRequests, fetchOrders, fetchAllUsers, setDataLoaded]);

  // ------------------------------------------------------------------
  // Effect: subscribe when authenticated, unsubscribe when not
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated – tear down any existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      initialisedRef.current = false;
      return;
    }

    // Prevent double-init in StrictMode
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    // 1. Initial fetch
    fetchAllData();

    // 2. Realtime subscriptions via a single channel
    const channel = supabase.channel('admin-realtime-sync');

    // --- deposit_requests ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deposit_requests' },
      (payload) => {
        const record = payload.new as DbDepositRequest | null;
        const oldRecord = payload.old as DbDepositRequest | null;

        if (payload.eventType === 'INSERT') {
          // Only add if pending
          if (record && record.status === 'pending') {
            const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
            setDepositRequests([record, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
          if (record) {
            if (record.status === 'pending') {
              // Update existing or add
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setDepositRequests(updated);
              } else {
                setDepositRequests([record, ...current]);
              }
            } else {
              // No longer pending – remove
              setDepositRequests(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setDepositRequests(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- withdraw_requests ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'withdraw_requests' },
      (payload) => {
        const record = payload.new as DbWithdrawRequest | null;
        const oldRecord = payload.old as DbWithdrawRequest | null;

        const isActive = (r: DbWithdrawRequest | null) =>
          r && (r.status === 'pending' || r.status === 'processing');

        if (payload.eventType === 'INSERT') {
          if (isActive(record)) {
            const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
            setWithdrawRequests([record!, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
          if (record) {
            if (isActive(record)) {
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setWithdrawRequests(updated);
              } else {
                setWithdrawRequests([record, ...current]);
              }
            } else {
              setWithdrawRequests(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setWithdrawRequests(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- orders ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        const record = payload.new as DbOrder | null;
        const oldRecord = payload.old as DbOrder | null;

        const isActive = (r: DbOrder | null) =>
          r && (r.status === 'pending' || r.status === 'processing');

        if (payload.eventType === 'INSERT') {
          if (isActive(record)) {
            const current = useAdminStore.getState().orders as DbOrder[];
            setOrders([record!, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().orders as DbOrder[];
          if (record) {
            if (isActive(record)) {
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setOrders(updated);
              } else {
                setOrders([record, ...current]);
              }
            } else {
              setOrders(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().orders as DbOrder[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setOrders(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- users ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        const record = payload.new as DbUser | null;
        const oldRecord = payload.old as DbUser | null;

        if (payload.eventType === 'INSERT') {
          if (record) {
            const current = useAdminStore.getState().allUsers as DbUser[];
            setAllUsers([record, ...current]);

            // Update KYC list if relevant
            if (
              record.kyc_status === 'submitted' ||
              record.kyc_status === 'verified' ||
              record.kyc_status === 'rejected'
            ) {
              const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
              setKycPendingUsers([record, ...kycCurrent]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          if (record) {
            // Update allUsers
            const currentUsers = useAdminStore.getState().allUsers as DbUser[];
            const idx = currentUsers.findIndex((u) => u.id === record.id);
            if (idx >= 0) {
              const updated = [...currentUsers];
              updated[idx] = record;
              setAllUsers(updated);
            } else {
              setAllUsers([record, ...currentUsers]);
            }

            // Update KYC list
            const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
            const isKycRelevant =
              record.kyc_status === 'submitted' ||
              record.kyc_status === 'verified' ||
              record.kyc_status === 'rejected';

            if (isKycRelevant) {
              const kycIdx = kycCurrent.findIndex((u) => u.id === record.id);
              if (kycIdx >= 0) {
                const updated = [...kycCurrent];
                updated[kycIdx] = record;
                setKycPendingUsers(updated);
              } else {
                setKycPendingUsers([record, ...kycCurrent]);
              }
            } else {
              // User no longer in KYC pipeline – remove from KYC list
              setKycPendingUsers(kycCurrent.filter((u) => u.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const currentUsers = useAdminStore.getState().allUsers as DbUser[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setAllUsers(currentUsers.filter((u) => u.id !== deletedId));
            const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
            setKycPendingUsers(kycCurrent.filter((u) => u.id !== deletedId));
          }
        }
      }
    );

    // Subscribe
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[SupabaseSync] Realtime channel subscribed');
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[SupabaseSync] Realtime channel error:', status);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount or when auth changes
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      initialisedRef.current = false;
    };
  }, [
    isAuthenticated,
    fetchAllData,
    setDepositRequests,
    setWithdrawRequests,
    setOrders,
    setAllUsers,
    setKycPendingUsers,
  ]);
}
