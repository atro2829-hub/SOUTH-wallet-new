'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseService } from '@/lib/supabase';
import type {
  DbUser,
  DbTransaction,
  DbNotification,
  DbSection,
  DbServiceProvider,
  DbProductPackage,
  DbExchangeRate,
  DbBanner,
  DbFeatureFlag,
  DbKillSwitch,
  DbMaintenance,
} from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { ServiceProvider, ProductPackage, ServiceCategory } from '@/lib/store';

// ─────────────────────────────────────────────────────────
//  Type Mappers: Supabase DB → Zustand Store
// ─────────────────────────────────────────────────────────

/** Map a Supabase DbUser row to the store's User shape.
 *  NOTE: store.user.id is the Firebase Auth UID, NOT the Supabase UUID. */
function mapDbUserToStore(dbUser: DbUser, firebaseUid: string) {
  const fullName =
    [dbUser.first_name, dbUser.second_name, dbUser.third_name, dbUser.family_name]
      .filter((n) => n && n.trim())
      .join(' ') ||
    dbUser.display_name ||
    '';

  return {
    id: firebaseUid, // store keeps Firebase UID as id
    email: dbUser.email || '',
    phone: dbUser.phone || '',
    name: fullName,
    firstName: dbUser.first_name || '',
    secondName: dbUser.second_name || '',
    thirdName: dbUser.third_name || '',
    familyName: dbUser.family_name || '',
    nationalId: dbUser.national_id || '',
    avatar: dbUser.avatar_url || '',
    role: (dbUser.role === 'agent' ? 'user' : dbUser.role) as 'user' | 'admin' | 'owner',
    userId: dbUser.id, // Supabase UUID stored here for reference
    kycStatus: dbUser.kyc_status || 'pending',
    isBlocked: dbUser.is_blocked || false,
    balanceYER: dbUser.balance_yer || 0,
    balanceSAR: dbUser.balance_sar || 0,
    balanceUSD: dbUser.balance_usd || 0,
    cardType: dbUser.card_type || '',
    cardNumber: dbUser.card_number || '',
    cardIssuedAt: '', // not in Supabase schema
    governorate: dbUser.governorate || '',
    theme: (dbUser.theme === 'system' ? 'light' : dbUser.theme) as 'light' | 'dark',
  };
}

/** Map a Supabase DbTransaction row to the store's Transaction shape. */
function mapDbTransactionToStore(dbTx: DbTransaction) {
  return {
    id: dbTx.id,
    fromUserId: dbTx.from_user_id || '',
    toUserId: dbTx.to_user_id || '',
    amount: dbTx.amount || 0,
    currency: dbTx.currency || 'YER',
    type: dbTx.type || 'order',
    status: dbTx.status || 'completed',
    description: dbTx.description || '',
    createdAt: dbTx.created_at || new Date().toISOString(),
  };
}

/** Map a Supabase DbNotification row to the store's Notification shape. */
function mapDbNotificationToStore(dbNotif: DbNotification) {
  return {
    id: dbNotif.id,
    title: dbNotif.title || '',
    body: dbNotif.body || '',
    type: (dbNotif.type || 'info') as 'info' | 'transaction' | 'security' | 'promo',
    isRead: dbNotif.is_read || false,
    createdAt: dbNotif.created_at || new Date().toISOString(),
    navigationTarget: dbNotif.navigation_target || undefined,
    navigationParams: dbNotif.navigation_params || undefined,
    data: dbNotif.data || undefined,
  };
}

/** Map a Supabase DbServiceProvider row to the store's ServiceProvider shape. */
function mapDbProviderToStore(dbProv: DbServiceProvider): ServiceProvider {
  return {
    id: dbProv.id,
    categoryId: dbProv.section_id || '',
    name: dbProv.name || '',
    color: dbProv.color || '',
    icon: dbProv.icon || '',
    isActive: dbProv.is_active ?? true,
    inputLabel: dbProv.input_label || '',
    inputType: dbProv.input_type === 'tel' ? 'phone' : 'text',
    inputPrefix: dbProv.input_prefix || undefined,
    subSectionId: dbProv.sub_section_id || undefined,
  };
}

/** Map a Supabase DbProductPackage row to the store's ProductPackage shape.
 *  Always displays prices in USD. If price_usd is not set, converts from
 *  YER or SAR using approximate exchange rates.
 */
function mapDbPackageToStore(dbPkg: DbProductPackage): ProductPackage {
  // USD-only pricing: prefer price_usd, convert from YER/SAR if needed
  // Exchange rates: 1 USD ≈ 1550 YER, 1 USD ≈ 3.75 SAR
  const YER_TO_USD = 1 / 1550;
  const SAR_TO_USD = 1 / 3.75;

  let priceUSD: number;
  if (dbPkg.price_usd && dbPkg.price_usd > 0) {
    priceUSD = dbPkg.price_usd;
  } else if (dbPkg.price_yer && dbPkg.price_yer > 0) {
    priceUSD = Math.ceil(dbPkg.price_yer * YER_TO_USD * 100) / 100; // round up to 2 decimals
  } else if (dbPkg.price_sar && dbPkg.price_sar > 0) {
    priceUSD = Math.ceil(dbPkg.price_sar * SAR_TO_USD * 100) / 100;
  } else {
    priceUSD = 0;
  }

  return {
    id: dbPkg.id,
    providerId: dbPkg.provider_id || '',
    name: dbPkg.name || '',
    price: priceUSD,
    currency: 'USD' as const, // Always USD
    executionType: dbPkg.execution_type === 'api' ? 'auto' : dbPkg.execution_type || 'manual',
    isActive: dbPkg.is_active ?? true,
    apiProvider: dbPkg.api_product_id || undefined,
    costPrice: dbPkg.cost_price || undefined,
    commission: dbPkg.commission_amount || undefined,
  };
}

/** Map a Supabase DbSection row to a store ServiceCategory shape. */
function mapDbSectionToCategory(dbSec: DbSection): ServiceCategory {
  return {
    id: dbSec.id,
    name: dbSec.name || '',
    type: (dbSec.type || 'telecom') as ServiceCategory['type'],
    icon: dbSec.icon || '',
  };
}

/** Map a Supabase DbExchangeRate row to the store's exchangeRates shape.
 *  Store expects: { YER: number, SAR: number, USD: number }
 *  Where SAR = how many YER per 1 SAR, USD = how many YER per 1 USD */
function mapDbExchangeRateToStore(dbRate: DbExchangeRate) {
  return {
    YER: 1, // base currency
    SAR: dbRate.sar_to_yer || 0,
    USD: dbRate.usd_to_yer || 0,
  };
}

/** Map a Supabase DbFeatureFlag array to the store's FeatureFlags shape. */
function mapDbFeatureFlagsToStore(dbFlags: DbFeatureFlag[]) {
  const flags: Record<string, boolean> = {};
  for (const f of dbFlags) {
    // Convert flag_key like "transfers_enabled" to "transfersEnabled"
    const camelKey = f.flag_key
      .replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
    flags[camelKey] = f.is_enabled;
  }
  return flags;
}

/** Map a Supabase DbKillSwitch row to the store's killSwitch shape. */
function mapDbKillSwitchToStore(dbKs: DbKillSwitch) {
  return {
    active: dbKs.is_active,
    message: dbKs.message || '',
    activatedAt: dbKs.activated_at || '',
    activatedBy: dbKs.activated_by || '',
    deactivateAt: dbKs.deactivate_at || '',
    duration: dbKs.duration_minutes || 0,
  };
}

/** Map a Supabase DbMaintenance row to the store's MaintenanceMode shape. */
function mapDbMaintenanceToStore(dbM: DbMaintenance) {
  return {
    active: dbM.is_active,
    message: dbM.message || '',
    estimatedTime: dbM.estimated_time || '',
    activatedAt: dbM.activated_at || undefined,
  };
}

// ─────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────

/**
 * Syncs data from Supabase (Realtime + REST) to the Zustand store.
 *
 * - On mount: fetches initial data via supabaseService
 * - Real-time: subscribes to postgres_changes for live updates
 * - On window focus / visibility change: refreshes user data
 * - Cleans up all subscriptions on unmount
 */
export function useSupabaseSync() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setProviders = useAppStore((s) => s.setProviders);
  const setPackages = useAppStore((s) => s.setPackages);
  const setCategories = useAppStore((s) => s.setCategories);
  const setExchangeRates = useAppStore((s) => s.setExchangeRates);
  const setFbSections = useAppStore((s) => s.setFbSections);
  const setKillSwitch = useAppStore((s) => s.setKillSwitch);
  const setFeatureFlags = useAppStore((s) => s.setFeatureFlags);
  const setMaintenance = useAppStore((s) => s.setMaintenance);

  // ── Refs for stable callback references ──
  const firebaseUidRef = useRef(user?.id);
  const supabaseUuidRef = useRef<string | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isRefreshing = useRef(false);

  const setUserRef = useRef(setUser);
  const setTransactionsRef = useRef(setTransactions);
  const setNotificationsRef = useRef(setNotifications);
  const setProvidersRef = useRef(setProviders);
  const setPackagesRef = useRef(setPackages);
  const setCategoriesRef = useRef(setCategories);
  const setExchangeRatesRef = useRef(setExchangeRates);
  const setFbSectionsRef = useRef(setFbSections);
  const setKillSwitchRef = useRef(setKillSwitch);
  const setFeatureFlagsRef = useRef(setFeatureFlags);
  const setMaintenanceRef = useRef(setMaintenance);

  // Keep refs in sync
  useEffect(() => {
    firebaseUidRef.current = user?.id;
    isAuthenticatedRef.current = isAuthenticated;
    setUserRef.current = setUser;
    setTransactionsRef.current = setTransactions;
    setNotificationsRef.current = setNotifications;
    setProvidersRef.current = setProviders;
    setPackagesRef.current = setPackages;
    setCategoriesRef.current = setCategories;
    setExchangeRatesRef.current = setExchangeRates;
    setFbSectionsRef.current = setFbSections;
    setKillSwitchRef.current = setKillSwitch;
    setFeatureFlagsRef.current = setFeatureFlags;
    setMaintenanceRef.current = setMaintenance;
  });

  // Track active Supabase Realtime channels for cleanup
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  // ─────────────────────────────────────────────────────────
  //  Refresh helpers
  // ─────────────────────────────────────────────────────────

  /** Resolve the Supabase UUID from the Firebase UID and cache it. */
  const resolveSupabaseUuid = useCallback(async (firebaseUid: string): Promise<string | null> => {
    try {
      const dbUser = await supabaseService.getUserByFirebaseUid(firebaseUid);
      if (dbUser) {
        supabaseUuidRef.current = dbUser.id;
        return dbUser.id;
      }
    } catch (error) {
      console.error('[SupabaseSync] Failed to resolve Supabase UUID:', error);
    }
    return null;
  }, []);

  /** Fetch fresh user data from Supabase and update store. */
  const refreshUser = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;
    if (isRefreshing.current) return;

    isRefreshing.current = true;
    try {
      const dbUser = await supabaseService.getUserByFirebaseUid(firebaseUid);
      if (dbUser) {
        supabaseUuidRef.current = dbUser.id;
        const storeUser = useAppStore.getState().user;
        const mapped = mapDbUserToStore(dbUser, firebaseUid);

        // Only update if data actually changed (avoid unnecessary re-renders)
        if (storeUser) {
          const hasChanges =
            storeUser.balanceYER !== mapped.balanceYER ||
            storeUser.balanceSAR !== mapped.balanceSAR ||
            storeUser.balanceUSD !== mapped.balanceUSD ||
            storeUser.name !== mapped.name ||
            storeUser.firstName !== mapped.firstName ||
            storeUser.secondName !== mapped.secondName ||
            storeUser.thirdName !== mapped.thirdName ||
            storeUser.familyName !== mapped.familyName ||
            storeUser.nationalId !== mapped.nationalId ||
            storeUser.kycStatus !== mapped.kycStatus ||
            storeUser.isBlocked !== mapped.isBlocked ||
            storeUser.phone !== mapped.phone ||
            storeUser.avatar !== mapped.avatar ||
            storeUser.cardType !== mapped.cardType ||
            storeUser.cardNumber !== mapped.cardNumber ||
            storeUser.governorate !== mapped.governorate ||
            storeUser.role !== mapped.role ||
            storeUser.theme !== mapped.theme;

          if (hasChanges) {
            setUserRef.current(mapped);
          }
        } else {
          setUserRef.current(mapped);
        }
      }

      // Also refresh transactions
      await refreshTransactions();
    } catch (error) {
      console.error('[SupabaseSync] refreshUser error:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  /** Fetch transactions for the current user from Supabase. */
  const refreshTransactions = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;

    try {
      // Ensure we have the Supabase UUID
      let supabaseUuid = supabaseUuidRef.current;
      if (!supabaseUuid) {
        supabaseUuid = await resolveSupabaseUuid(firebaseUid);
        if (!supabaseUuid) return;
      }

      const dbTransactions = await supabaseService.getTransactions(supabaseUuid, 100);
      const transactions = dbTransactions.map(mapDbTransactionToStore);
      setTransactionsRef.current(transactions);
    } catch (error) {
      console.error('[SupabaseSync] refreshTransactions error:', error);
    }
  }, [resolveSupabaseUuid]);

  /** Fetch notifications for the current user from Supabase. */
  const refreshNotifications = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;

    try {
      let supabaseUuid = supabaseUuidRef.current;
      if (!supabaseUuid) {
        supabaseUuid = await resolveSupabaseUuid(firebaseUid);
        if (!supabaseUuid) return;
      }

      const dbNotifs = await supabaseService.getNotifications(supabaseUuid);
      const notifications = dbNotifs.map(mapDbNotificationToStore);
      setNotificationsRef.current(notifications);
    } catch (error) {
      console.error('[SupabaseSync] refreshNotifications error:', error);
    }
  }, [resolveSupabaseUuid]);

  // ─────────────────────────────────────────────────────────
  //  Global data fetch (not user-specific)
  // ─────────────────────────────────────────────────────────

  const fetchGlobalData = useCallback(async () => {
    try {
      // Fetch all global data in parallel for speed
      const [
        sectionsResult,
        providersResult,
        exchangeRatesResult,
        featureFlagsResult,
        killSwitchResult,
        maintenanceResult,
      ] = await Promise.allSettled([
        supabaseService.getSections(),
        supabaseService.getServiceProviders(),
        supabaseService.getExchangeRates(),
        supabaseService.getFeatureFlags(),
        supabaseService.getKillSwitch(),
        supabaseService.getMaintenance(),
      ]);

      // Sections → categories + fbSections
      if (sectionsResult.status === 'fulfilled' && sectionsResult.value) {
        const sections = sectionsResult.value;
        const categories = sections.filter((s) => s.is_visible).map(mapDbSectionToCategory);
        setCategoriesRef.current(categories);

        // Also set raw fbSections for components that still use the old shape
        const sectionsMap: Record<string, DbSection> = {};
        for (const s of sections) {
          sectionsMap[s.id] = s;
        }
        setFbSectionsRef.current(sectionsMap as Record<string, any>);
      }

      // Providers
      if (providersResult.status === 'fulfilled' && providersResult.value) {
        const providers = providersResult.value.map(mapDbProviderToStore);
        setProvidersRef.current(providers);

        // Fetch packages for all providers in parallel
        const packagePromises = providersResult.value.map((p: DbServiceProvider) =>
          supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
        );
        const packageResults = await Promise.allSettled(packagePromises);
        const allPackages: ProductPackage[] = [];
        for (const result of packageResults) {
          if (result.status === 'fulfilled' && result.value) {
            allPackages.push(...result.value.map(mapDbPackageToStore));
          }
        }
        setPackagesRef.current(allPackages);
      }

      // Exchange rates
      if (exchangeRatesResult.status === 'fulfilled' && exchangeRatesResult.value) {
        setExchangeRatesRef.current(mapDbExchangeRateToStore(exchangeRatesResult.value));
      }

      // Feature flags
      if (featureFlagsResult.status === 'fulfilled' && featureFlagsResult.value) {
        const flags = mapDbFeatureFlagsToStore(featureFlagsResult.value);
        setFeatureFlagsRef.current(flags);
      }

      // Kill switch
      if (killSwitchResult.status === 'fulfilled' && killSwitchResult.value) {
        const ks = killSwitchResult.value;
        // Auto-deactivate if deactivate_at has passed
        if (ks.is_active && ks.deactivate_at && new Date(ks.deactivate_at) <= new Date()) {
          setKillSwitchRef.current(null);
        } else {
          setKillSwitchRef.current(mapDbKillSwitchToStore(ks));
        }
      } else {
        setKillSwitchRef.current(null);
      }

      // Maintenance
      if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value) {
        setMaintenanceRef.current(mapDbMaintenanceToStore(maintenanceResult.value));
      }
    } catch (error) {
      console.error('[SupabaseSync] fetchGlobalData error:', error);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Realtime subscriptions – user-specific data
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      // Clean up user-specific channels when not authenticated
      channelsRef.current.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
      channelsRef.current = [];
      supabaseUuidRef.current = null;
      return;
    }

    const firebaseUid = user.id;
    let cancelled = false;

    // Clean up previous user channels before creating new ones
    channelsRef.current.forEach((ch) => {
      try { supabase.removeChannel(ch); } catch {}
    });
    channelsRef.current = [];

    // First resolve the Supabase UUID, then set up subscriptions
    resolveSupabaseUuid(firebaseUid).then((supabaseUuid) => {
      if (!supabaseUuid || cancelled) return;

      // ── User data changes ──
      const userChannel = supabase
        .channel(`user-${supabaseUuid}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${supabaseUuid}`,
          },
          (payload: { new: DbUser }) => {
            const dbUser = payload.new;
            if (dbUser) {
              const mapped = mapDbUserToStore(dbUser, firebaseUid);
              const currentUser = useAppStore.getState().user;
              if (currentUser) {
                const hasChanges =
                  currentUser.balanceYER !== mapped.balanceYER ||
                  currentUser.balanceSAR !== mapped.balanceSAR ||
                  currentUser.balanceUSD !== mapped.balanceUSD ||
                  currentUser.name !== mapped.name ||
                  currentUser.kycStatus !== mapped.kycStatus ||
                  currentUser.isBlocked !== mapped.isBlocked ||
                  currentUser.role !== mapped.role ||
                  currentUser.theme !== mapped.theme ||
                  currentUser.phone !== mapped.phone ||
                  currentUser.avatar !== mapped.avatar ||
                  currentUser.cardType !== mapped.cardType ||
                  currentUser.cardNumber !== mapped.cardNumber ||
                  currentUser.governorate !== mapped.governorate;

                if (hasChanges) {
                  setUserRef.current(mapped);
                }
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] User channel error');
          }
        });

      // ── Transactions changes ──
      const txChannel = supabase
        .channel(`tx-${supabaseUuid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            // Refresh all transactions when a new one is inserted
            refreshTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            refreshTransactions();
          }
        )
        // Also listen for transactions where user is sender or receiver
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `from_user_id=eq.${supabaseUuid}`,
          },
          () => {
            refreshTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `to_user_id=eq.${supabaseUuid}`,
          },
          () => {
            refreshTransactions();
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] Transactions channel error');
          }
        });

      // ── Notifications changes ──
      const notifChannel = supabase
        .channel(`notif-${supabaseUuid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          (payload: { new: DbNotification }) => {
            const dbNotif = payload.new;
            if (dbNotif) {
              const mapped = mapDbNotificationToStore(dbNotif);
              // Prepend the new notification instead of full refresh
              const currentNotifs = useAppStore.getState().notifications;
              // Avoid duplicate if it's already there
              if (!currentNotifs.find((n) => n.id === mapped.id)) {
                setNotificationsRef.current([mapped, ...currentNotifs]);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            refreshNotifications();
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] Notifications channel error');
          }
        });

      channelsRef.current.push(userChannel, txChannel, notifChannel);
    });

    return () => {
      cancelled = true;
      // Remove user-specific channels
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user?.id, isAuthenticated, resolveSupabaseUuid, refreshTransactions, refreshNotifications]);

  // ─────────────────────────────────────────────────────────
  //  Realtime subscriptions – global (public) data
  //  Uses unique channel names with instance suffix to prevent
  //  "cannot add callbacks after subscribe" errors when the
  //  component remounts before the old channel is cleaned up.
  // ─────────────────────────────────────────────────────────

  const globalChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const globalSubscribedRef = useRef(false);
  const instanceSuffixRef = useRef(`-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    // Prevent duplicate subscriptions in StrictMode or re-renders
    if (globalSubscribedRef.current) return;
    globalSubscribedRef.current = true;

    // Regenerate suffix on each new subscription cycle
    instanceSuffixRef.current = `-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const suf = instanceSuffixRef.current;

    // Clean up any leftover channels from a previous mount
    globalChannelsRef.current.forEach((ch) => {
      try { supabase.removeChannel(ch); } catch {}
    });
    globalChannelsRef.current = [];

    // ── Sections ──
    const sectionsChannel = supabase
      .channel(`sections-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        async () => {
          try {
            const sections = await supabaseService.getSections();
            const categories = sections.filter((s) => s.is_visible).map(mapDbSectionToCategory);
            setCategoriesRef.current(categories);

            const sectionsMap: Record<string, DbSection> = {};
            for (const s of sections) {
              sectionsMap[s.id] = s;
            }
            setFbSectionsRef.current(sectionsMap as Record<string, any>);
          } catch (error) {
            console.error('[SupabaseSync] Sections realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Sub Sections ──
    const subSectionsChannel = supabase
      .channel(`sub-sections-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_sections' },
        async () => {
          try {
            // Refresh sections to get sub-section updates
            const sections = await supabaseService.getSections();
            const sectionsMap: Record<string, DbSection> = {};
            for (const s of sections) {
              sectionsMap[s.id] = s;
            }
            setFbSectionsRef.current(sectionsMap as Record<string, any>);
          } catch (error) {
            console.error('[SupabaseSync] Sub-sections realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Service Providers ──
    const providersChannel = supabase
      .channel(`providers-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_providers' },
        async () => {
          try {
            const providers = await supabaseService.getServiceProviders();
            setProvidersRef.current(providers.map(mapDbProviderToStore));

            // Also refresh packages since providers may have changed
            const packagePromises = providers.map((p: DbServiceProvider) =>
              supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
            );
            const packageResults = await Promise.allSettled(packagePromises);
            const allPackages: ProductPackage[] = [];
            for (const result of packageResults) {
              if (result.status === 'fulfilled' && result.value) {
                allPackages.push(...result.value.map(mapDbPackageToStore));
              }
            }
            setPackagesRef.current(allPackages);
          } catch (error) {
            console.error('[SupabaseSync] Providers realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Product Packages ──
    const packagesChannel = supabase
      .channel(`packages-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_packages' },
        async () => {
          try {
            // Refetch all providers to get their packages
            const providers = await supabaseService.getServiceProviders();
            const packagePromises = providers.map((p: DbServiceProvider) =>
              supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
            );
            const packageResults = await Promise.allSettled(packagePromises);
            const allPackages: ProductPackage[] = [];
            for (const result of packageResults) {
              if (result.status === 'fulfilled' && result.value) {
                allPackages.push(...result.value.map(mapDbPackageToStore));
              }
            }
            setPackagesRef.current(allPackages);
          } catch (error) {
            console.error('[SupabaseSync] Packages realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Exchange Rates ──
    const exchangeRatesChannel = supabase
      .channel(`exchange-rates-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exchange_rates' },
        async () => {
          try {
            const rate = await supabaseService.getExchangeRates();
            if (rate) {
              setExchangeRatesRef.current(mapDbExchangeRateToStore(rate));
            }
          } catch (error) {
            console.error('[SupabaseSync] Exchange rates realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Banners ──
    const bannersChannel = supabase
      .channel(`banners-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        async () => {
          try {
            const banners = await supabaseService.getBanners();
            void banners;
          } catch (error) {
            console.error('[SupabaseSync] Banners realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Feature Flags ──
    const featureFlagsChannel = supabase
      .channel(`feature-flags-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        async () => {
          try {
            const flags = await supabaseService.getFeatureFlags();
            setFeatureFlagsRef.current(mapDbFeatureFlagsToStore(flags));
          } catch (error) {
            console.error('[SupabaseSync] Feature flags realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Kill Switch ──
    const killSwitchChannel = supabase
      .channel(`kill-switch-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kill_switch' },
        async () => {
          try {
            const ks = await supabaseService.getKillSwitch();
            if (ks) {
              if (ks.is_active && ks.deactivate_at && new Date(ks.deactivate_at) <= new Date()) {
                setKillSwitchRef.current(null);
              } else {
                setKillSwitchRef.current(mapDbKillSwitchToStore(ks));
              }
            } else {
              setKillSwitchRef.current(null);
            }
          } catch (error) {
            console.error('[SupabaseSync] Kill switch realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    // ── Maintenance ──
    const maintenanceChannel = supabase
      .channel(`maintenance-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance' },
        async () => {
          try {
            const maintenance = await supabaseService.getMaintenance();
            if (maintenance) {
              setMaintenanceRef.current(mapDbMaintenanceToStore(maintenance));
            }
          } catch (error) {
            console.error('[SupabaseSync] Maintenance realtime refresh error:', error);
          }
        }
      )
      .subscribe();

    globalChannelsRef.current = [
      sectionsChannel,
      subSectionsChannel,
      providersChannel,
      packagesChannel,
      exchangeRatesChannel,
      bannersChannel,
      featureFlagsChannel,
      killSwitchChannel,
      maintenanceChannel,
    ];

    return () => {
      globalSubscribedRef.current = false;
      globalChannelsRef.current.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
      globalChannelsRef.current = [];
    };
  }, []); // Run once on mount

  // ─────────────────────────────────────────────────────────
  //  Initialize G2Bulk API provider on first load
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    const initProvider = async () => {
      try {
        const { initializeDefaultProviders } = await import('@/lib/api-providers');
        await initializeDefaultProviders();
      } catch (error) {
        console.error('[SupabaseSync] Failed to initialize API providers:', error);
      }
    };
    initProvider();
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Initial data fetch on mount
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch global data regardless of auth state
    fetchGlobalData();

    // Fetch user-specific data if authenticated
    if (isAuthenticated && user?.id) {
      refreshUser();
      refreshNotifications();
    }
  }, [isAuthenticated, user?.id, fetchGlobalData, refreshUser, refreshNotifications]);

  // ─────────────────────────────────────────────────────────
  //  Refresh on window focus / visibility change / online
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    const handleRefresh = () => {
      if (isAuthenticatedRef.current && firebaseUidRef.current) {
        refreshUser();
        refreshNotifications();
      }
      // Always refresh global data
      fetchGlobalData();
    };

    const handleFocus = () => {
      handleRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    const handleOnline = () => {
      handleRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshUser, refreshNotifications, fetchGlobalData]);

  return { refreshUser };
}
