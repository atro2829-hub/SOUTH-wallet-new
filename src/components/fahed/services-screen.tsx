'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  Wallet,
  Gamepad2,
  Package,
  Zap,
  Wifi,
  Landmark,
  ShieldCheck,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { productIcons } from '@/lib/product-icons';
import { serviceIcons } from '@/lib/service-icons';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

// ═══════════════════════════════════════════════════════════════════════
// Firebase Data Types
// ═══════════════════════════════════════════════════════════════════════

interface FirebaseSubSection {
  id: string;
  name: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string;
  providerIds?: string[];
}

interface FirebaseSection {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  type?: string;
  parentId?: string;
  providerIds?: string[];
  apiProviderId?: string;
  subSections?: Record<string, FirebaseSubSection>;
}

interface FirebaseProvider {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  categoryId?: string;
  sectionId?: string;
  subSectionId?: string;
  inputLabel?: string;
  inputType?: string;
  inputPrefix?: string;
  isActive?: boolean;
  sortOrder?: number;
  executionType?: string;
}

interface FirebaseWalletServicePackage {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  costPrice?: number;
  commission?: number;
  commissionType?: string;
  executionType?: string;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
}

interface FirebaseWalletService {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  sectionId?: string;
  subSectionId?: string;
  inputLabel?: string;
  inputType?: string;
  inputPrefix?: string;
  isActive?: boolean;
  sortOrder?: number;
  packages?: Record<string, FirebaseWalletServicePackage>;
}

interface ApiProviderCategory {
  id: number | string;
  title: string;
  icon?: string;
  slug?: string;
  sectionId?: string;
  products?: Record<string, ApiProviderProduct>;
}

interface ApiProviderProduct {
  id: number | string;
  title: string;
  unit_price: number;
  stock?: number;
  icon?: string;
  description?: string;
  isActive?: boolean;
}

interface FirebaseApiProvider {
  id: string;
  name: string;
  baseUrl?: string;
  apiKey?: string;
  authHeader?: string;
  isActive?: boolean;
  syncEnabled?: boolean;
  sectionId?: string;
  sectionName?: string;
  commission?: number;
  commissionType?: string;
  balance?: number;
  balanceCurrency?: string;
  lastBalanceCheck?: string;
  categories?: Record<string, ApiProviderCategory>;
}

// ═══════════════════════════════════════════════════════════════════════
// Display Helper Types
// ═══════════════════════════════════════════════════════════════════════

interface ApiCategoryItem {
  id: string;
  name: string;
  providerId: string;
  categoryId: string | number;
  icon?: string;
  productsCount?: number;
}

interface SubSectionDisplay {
  id: string;
  name: string;
  providers: FirebaseProvider[];
  isApiCategory?: boolean;
  apiCategories?: ApiCategoryItem[];
}

interface SectionDisplay {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type?: string;
  providers: FirebaseProvider[];
  subSections: SubSectionDisplay[];
  isApiSection?: boolean;
  isWalletServicesSection?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const TELECOM_PROVIDER_IDS = new Set(['yemen-mobile', 'yo', 'sabafon', 'y']);
const COMPACT_LIMIT = 8;

const SECTION_TYPE_ICONS: Record<string, LucideIcon> = {
  'wallet-services': Wallet,
  'providers': Gamepad2,
  'telecom': Zap,
  'internet': Wifi,
  'government': Landmark,
  'crypto': Globe,
  'electricity': ShieldCheck,
};

// ═══════════════════════════════════════════════════════════════════════
// Icon Helper
// ═══════════════════════════════════════════════════════════════════════

function getIconForProvider(providerId: string): string {
  if (productIcons[providerId]) return productIcons[providerId];
  if (serviceIcons[providerId]) return serviceIcons[providerId];
  return serviceIcons['instant-pay'] || '';
}

function getIconForApiCategory(cat: ApiCategoryItem): string | null {
  if (cat.icon) return cat.icon;
  const key = `apicat-${cat.providerId}-${cat.categoryId}`;
  if (productIcons[key]) return productIcons[key];
  if (serviceIcons[key]) return serviceIcons[key];
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export default function ServicesScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, setSelectedCategory } = useAppStore();

  // ─── Firebase Real-Time State ─────────────────────────────────────

  const [fbSections, setFbSections] = useState<Record<string, FirebaseSection>>({});
  const [fbProviders, setFbProviders] = useState<Record<string, FirebaseProvider>>({});
  const [fbWalletServices, setFbWalletServices] = useState<Record<string, FirebaseWalletService>>({});
  const [fbApiProviders, setFbApiProviders] = useState<Record<string, FirebaseApiProvider>>({});
  const [visibilitySections, setVisibilitySections] = useState<Record<string, boolean>>({});
  const [visibilityProviders, setVisibilityProviders] = useState<Record<string, boolean>>({});

  // ─── UI State ─────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ═══════════════════════════════════════════════════════════════════
  // Firebase Real-Time Listeners
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsub = onValue(
      ref(database, 'sections'),
      (snap) => setFbSections(snap.exists() ? snap.val() : {}),
      (err) => console.error('[sections]', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(database, 'providers'),
      (snap) => setFbProviders(snap.exists() ? snap.val() : {}),
      (err) => console.error('[providers]', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(database, 'walletServices'),
      (snap) => setFbWalletServices(snap.exists() ? snap.val() : {}),
      (err) => console.error('[walletServices]', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(database, 'adminSettings/apiProviders'),
      (snap) => setFbApiProviders(snap.exists() ? snap.val() : {}),
      (err) => console.error('[apiProviders]', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(database, 'adminSettings/visibility'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();
        if (data.sections) setVisibilitySections(data.sections);
        if (data.providers) setVisibilityProviders(data.providers);
      },
      (err) => console.error('[visibility]', err)
    );
    return () => unsub();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════

  const isProviderVisible = useCallback(
    (id: string, isActive?: boolean): boolean =>
      isActive !== false && visibilityProviders[id] !== false,
    [visibilityProviders]
  );

  const isSectionVisible = useCallback(
    (id: string, isActive?: boolean): boolean =>
      isActive !== false && visibilitySections[id] !== false,
    [visibilitySections]
  );

  const isSubSectionVisible = useCallback(
    (sectionId: string, subId: string, isActive?: boolean): boolean => {
      if (isActive === false) return false;
      // Check parent section visibility
      if (visibilitySections[sectionId] === false) return false;
      // Check sub-section specific visibility (stored as "sectionId/subId")
      const key = `${sectionId}/${subId}`;
      return visibilitySections[key] !== false;
    },
    [visibilitySections]
  );

  /** Convert a wallet service into a provider-like shape for rendering */
  const walletServiceToProvider = useCallback(
    (ws: FirebaseWalletService): FirebaseProvider => ({
      id: ws.id,
      name: ws.name,
      color: ws.color,
      icon: ws.icon,
      categoryId: ws.categoryId,
      sectionId: ws.sectionId,
      subSectionId: ws.subSectionId,
      inputLabel: ws.inputLabel,
      inputType: ws.inputType,
      inputPrefix: ws.inputPrefix,
      isActive: ws.isActive,
      sortOrder: ws.sortOrder,
    }),
    []
  );

  const toggleExpand = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // Navigation Handlers
  // ═══════════════════════════════════════════════════════════════════

  const handleProviderClick = useCallback(
    (providerId: string) => {
      if (TELECOM_PROVIDER_IDS.has(providerId)) {
        setActiveScreen('recharge');
        return;
      }
      setSelectedCategory(providerId);
      setActiveScreen('category-detail');
    },
    [setActiveScreen, setSelectedCategory]
  );

  const handleApiCategoryClick = useCallback(
    (providerId: string, categoryId: string | number) => {
      setSelectedCategory(`apicat-${providerId}-${categoryId}`);
      setActiveScreen('category-detail');
    },
    [setActiveScreen, setSelectedCategory]
  );

  const handleSectionHeaderClick = useCallback(
    (sectionId: string) => {
      setSelectedCategory(sectionId);
      setActiveScreen('category-detail');
    },
    [setActiveScreen, setSelectedCategory]
  );

  // ═══════════════════════════════════════════════════════════════════
  // Build API Category Items (flat list from all active API providers)
  // ═══════════════════════════════════════════════════════════════════

  const apiCategoryItems = useMemo<ApiCategoryItem[]>(() => {
    const items: ApiCategoryItem[] = [];

    for (const ap of Object.values(fbApiProviders)) {
      if (ap.isActive === false) continue;
      if (!ap.categories) continue;

      for (const cat of Object.values(ap.categories)) {
        if (cat == null) continue;
        const productsCount = cat.products
          ? Object.values(cat.products).filter((p) => p != null).length
          : 0;

        items.push({
          id: `apicat-${ap.id}-${cat.id}`,
          name: cat.title || 'خدمة',
          providerId: ap.id,
          categoryId: cat.id,
          icon: cat.icon,
          productsCount,
        });
      }
    }

    return items;
  }, [fbApiProviders]);

  // ═══════════════════════════════════════════════════════════════════
  // Build Sections from Firebase Data
  // ═══════════════════════════════════════════════════════════════════

  const allSections = useMemo<SectionDisplay[]>(() => {
    const sorted = Object.values(fbSections)
      .filter((s) => isSectionVisible(s.id, s.isActive))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    const result: SectionDisplay[] = [];

    for (const section of sorted) {
      const isApiSection = !!section.apiProviderId; // any apiProviderId, not just '__all__'
      const isWalletSection =
        section.type === 'wallet-services' || section.id === 'wallet-services';

      // ── API Providers Section ──────────────────────────────────
      if (isApiSection) {
        result.push(buildApiSection(section));
        continue;
      }

      // ── Wallet Services Section ────────────────────────────────
      if (isWalletSection) {
        const built = buildWalletServicesSection(section);
        if (built) result.push(built);
        continue;
      }

      // ── Regular Section ────────────────────────────────────────
      const built = buildRegularSection(section);
      if (built) result.push(built);
    }

    return result;

    // ─── Inner builders (close over outer scope) ────────────────

    function buildApiSection(section: FirebaseSection): SectionDisplay {
      // If apiProviderId is '__all__', show all API providers' categories
      // If apiProviderId is a specific ID (e.g., 'g2bulk'), show only that provider's categories
      const targetProviderId = section.apiProviderId === '__all__' ? null : section.apiProviderId;

      // Group API categories by provider (or use single provider)
      const grouped: Record<string, ApiCategoryItem[]> = {};
      for (const item of apiCategoryItems) {
        if (targetProviderId && item.providerId !== targetProviderId) continue;
        (grouped[item.providerId] ??= []).push(item);
      }

      const apiSubSections: SubSectionDisplay[] = Object.entries(grouped).map(
        ([provId, items]) => ({
          id: `api-${provId}`,
          name: fbApiProviders[provId]?.name || 'مزود خدمات',
          providers: [],
          isApiCategory: true,
          apiCategories: items,
        })
      );

      // Also include regular providers linked to this section
      const providers = collectSectionProviders(section);

      return {
        id: section.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        type: section.type,
        providers,
        subSections: apiSubSections,
        isApiSection: true,
        isWalletServicesSection: false,
      };
    }

    function buildWalletServicesSection(
      section: FirebaseSection
    ): SectionDisplay | null {
      const wsProviders: FirebaseProvider[] = [];
      const walletSubSections: SubSectionDisplay[] = [];

      if (hasActiveSubSections(section.subSections)) {
        // Distribute wallet services into sub-sections
        const subEntries = sortSubSections(section.subSections!);
        const assignedIds = new Set<string>();

        for (const sub of subEntries) {
          // Check sub-section visibility
          if (!isSubSectionVisible(section.id, sub.id, sub.isActive)) continue;

          const subProviders = resolveSubSectionProviders(
            sub,
            /* preferWalletServices */ true
          );
          subProviders.forEach((p) => assignedIds.add(p.id));

          if (subProviders.length > 0) {
            walletSubSections.push({
              id: sub.id,
              name: sub.name,
              providers: subProviders,
            });
          }
        }

        // Collect unassigned wallet services for this section
        const unassigned = Object.values(fbWalletServices)
          .filter(
            (ws) =>
              ws.sectionId === section.id &&
              isProviderVisible(ws.id, ws.isActive) &&
              !assignedIds.has(ws.id)
          )
          .map(walletServiceToProvider)
          .sort(bySortOrder);

        wsProviders.push(...unassigned);
      } else {
        // No sub-sections: flat list of wallet services
        const flat = Object.values(fbWalletServices)
          .filter(
            (ws) =>
              ws.sectionId === section.id && isProviderVisible(ws.id, ws.isActive)
          )
          .map(walletServiceToProvider)
          .sort(bySortOrder);

        wsProviders.push(...flat);
      }

      if (wsProviders.length === 0 && walletSubSections.length === 0) return null;

      return {
        id: section.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        type: section.type,
        providers: wsProviders,
        subSections: walletSubSections,
        isApiSection: false,
        isWalletServicesSection: true,
      };
    }

    function buildRegularSection(
      section: FirebaseSection
    ): SectionDisplay | null {
      const providers = collectSectionProviders(section);
      const sectionSubSections: SubSectionDisplay[] = [];

      if (hasActiveSubSections(section.subSections)) {
        const subEntries = sortSubSections(section.subSections!);

        for (const sub of subEntries) {
          // Check sub-section visibility
          if (!isSubSectionVisible(section.id, sub.id, sub.isActive)) continue;

          const subProviders = resolveSubSectionProviders(
            sub,
            /* preferWalletServices */ false
          );
          if (subProviders.length > 0) {
            sectionSubSections.push({
              id: sub.id,
              name: sub.name,
              providers: subProviders,
            });
          }
        }
      }

      if (providers.length === 0 && sectionSubSections.length === 0) return null;

      return {
        id: section.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        type: section.type,
        providers,
        subSections: sectionSubSections,
        isApiSection: false,
        isWalletServicesSection: false,
      };
    }

    /** Collect top-level providers for a section */
    function collectSectionProviders(section: FirebaseSection): FirebaseProvider[] {
      if (section.providerIds?.length) {
        return section.providerIds
          .map((pid) => fbProviders[pid])
          .filter((p): p is FirebaseProvider => !!p && isProviderVisible(p.id, p.isActive))
          .sort(bySortOrder);
      }

      return Object.values(fbProviders)
        .filter(
          (p) =>
            p.sectionId === section.id && isProviderVisible(p.id, p.isActive)
        )
        .sort(bySortOrder);
    }

    /** Resolve providers for a sub-section, optionally preferring wallet services */
    function resolveSubSectionProviders(
      sub: FirebaseSubSection,
      preferWalletServices: boolean
    ): FirebaseProvider[] {
      const result: FirebaseProvider[] = [];

      if (sub.providerIds?.length) {
        for (const pid of sub.providerIds) {
          if (preferWalletServices) {
            const ws = fbWalletServices[pid];
            if (ws && isProviderVisible(ws.id, ws.isActive)) {
              result.push(walletServiceToProvider(ws));
              continue;
            }
          }
          const prov = fbProviders[pid];
          if (prov && isProviderVisible(prov.id, prov.isActive)) {
            result.push(prov);
          }
        }
      } else {
        // Resolve by subSectionId
        if (preferWalletServices) {
          for (const ws of Object.values(fbWalletServices)) {
            if (
              ws.subSectionId === sub.id &&
              isProviderVisible(ws.id, ws.isActive)
            ) {
              result.push(walletServiceToProvider(ws));
            }
          }
        }
        for (const prov of Object.values(fbProviders)) {
          if (
            prov.subSectionId === sub.id &&
            isProviderVisible(prov.id, prov.isActive) &&
            !result.find((r) => r.id === prov.id)
          ) {
            result.push(prov);
          }
        }
      }

      return result.sort(bySortOrder);
    }

    function hasActiveSubSections(
      subs?: Record<string, FirebaseSubSection>
    ): boolean {
      return !!subs && Object.values(subs).some((s) => s.isActive !== false);
    }

    function sortSubSections(subs: Record<string, FirebaseSubSection>) {
      return Object.values(subs)
        .filter((s) => s.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    }

    function bySortOrder(a: { sortOrder?: number }, b: { sortOrder?: number }) {
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    }
  }, [
    fbSections,
    fbProviders,
    fbWalletServices,
    fbApiProviders,
    apiCategoryItems,
    visibilitySections,
    visibilityProviders,
    isSectionVisible,
    isSubSectionVisible,
    isProviderVisible,
    walletServiceToProvider,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // Search Filtering
  // ═══════════════════════════════════════════════════════════════════

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return allSections;

    return allSections
      .map((section) => {
        const matchingProviders = section.providers.filter((p) =>
          p.name.includes(q)
        );
        const matchingSubSections = section.subSections
          .map((sub) => ({
            ...sub,
            providers: sub.providers.filter((p) => p.name.includes(q)),
            apiCategories: sub.apiCategories?.filter((c) => c.name.includes(q)),
          }))
          .filter(
            (sub) =>
              sub.providers.length > 0 ||
              (sub.apiCategories && sub.apiCategories.length > 0)
          );

        return { ...section, providers: matchingProviders, subSections: matchingSubSections };
      })
      .filter(
        (section) =>
          section.providers.length > 0 || section.subSections.length > 0
      );
  }, [allSections, searchQuery]);

  // ═══════════════════════════════════════════════════════════════════
  // Counting
  // ═══════════════════════════════════════════════════════════════════

  const countSectionItems = (section: SectionDisplay): number => {
    let count = section.providers.length;
    for (const sub of section.subSections) {
      count += sub.isApiCategory
        ? (sub.apiCategories?.length ?? 0)
        : sub.providers.length;
    }
    return count;
  };

  // ═══════════════════════════════════════════════════════════════════
  // Theme Styles
  // ═══════════════════════════════════════════════════════════════════

  const cardStyle = {
    background: isDark ? '#1A1A1A' : '#FFFFFF',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
    boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
  };

  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  // ═══════════════════════════════════════════════════════════════════
  // Render: Provider Item
  // ═══════════════════════════════════════════════════════════════════

  const renderProviderItem = (provider: FirebaseProvider, index: number) => {
    const iconSrc = provider.icon || getIconForProvider(provider.id);

    return (
      <motion.button
        key={provider.id}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.02 * index, duration: 0.25 }}
        onClick={() => handleProviderClick(provider.id)}
        whileTap={{ scale: 0.92 }}
        className="flex flex-col items-center justify-center gap-1.5 py-2"
      >
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          <img
            src={iconSrc}
            alt={provider.name}
            className="w-10 h-10 object-contain"
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#888' : '#666'}" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`;
              }
            }}
          />
        </div>
        <span
          className="text-[10px] font-medium text-center leading-tight max-w-[72px]"
          style={{
            color: isDark ? '#BBB' : '#555',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {provider.name}
        </span>
      </motion.button>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // Render: API Category Item
  // ═══════════════════════════════════════════════════════════════════

  const renderApiCategoryItem = (cat: ApiCategoryItem, index: number) => {
    const iconSrc = getIconForApiCategory(cat);

    return (
      <motion.button
        key={cat.id}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.02 * index, duration: 0.25 }}
        onClick={() => handleApiCategoryClick(cat.providerId, cat.categoryId)}
        whileTap={{ scale: 0.92 }}
        className="flex flex-col items-center justify-center gap-1.5 py-2"
      >
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={cat.name}
              className="w-10 h-10 object-contain"
              draggable={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#888' : '#666'}" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
                }
              }}
            />
          ) : (
            <Package size={24} strokeWidth={1.5} color={isDark ? '#888' : '#666'} />
          )}
        </div>
        <span
          className="text-[10px] font-medium text-center leading-tight max-w-[72px]"
          style={{
            color: isDark ? '#BBB' : '#555',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {cat.name}
        </span>
        {cat.productsCount !== undefined && cat.productsCount > 0 && (
          <span className="text-[8px] font-medium" style={{ color: isDark ? '#666' : '#999' }}>
            {cat.productsCount} منتج
          </span>
        )}
      </motion.button>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // Render: Sub-Sections
  // ═══════════════════════════════════════════════════════════════════

  const renderSubSections = (
    subSections: SubSectionDisplay[],
    isExpanded: boolean
  ) => {
    // Apply compact limit when collapsed
    const displaySubSections = isExpanded
      ? subSections
      : applyCompactLimit(subSections);

    return (
      <AnimatePresence mode="popLayout">
        {displaySubSections.map((sub, subIndex) => (
          <div key={sub.id}>
            {/* Sub-section header with red right border */}
            <div
              className={`mb-2 pr-2 ${subIndex === 0 ? '' : 'mt-3'}`}
              style={{ borderRight: '2px solid #5C1A1B' }}
            >
              <span
                className="text-xs font-semibold"
                style={{ color: isDark ? '#AAA' : '#666' }}
              >
                {sub.name}
              </span>
            </div>

            {/* Grid: API categories or providers */}
            {sub.isApiCategory && sub.apiCategories ? (
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {sub.apiCategories.map((cat, pIdx) =>
                  renderApiCategoryItem(cat, pIdx)
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {sub.providers.map((provider, pIdx) =>
                  renderProviderItem(provider, pIdx)
                )}
              </div>
            )}

            {/* Divider between sub-sections */}
            {subIndex < displaySubSections.length - 1 && (
              <div
                className="my-3"
                style={{ height: '1px', background: dividerColor }}
              />
            )}
          </div>
        ))}
      </AnimatePresence>
    );
  };

  /** Trim items across sub-sections to respect COMPACT_LIMIT */
  function applyCompactLimit(subs: SubSectionDisplay[]): SubSectionDisplay[] {
    let remaining = COMPACT_LIMIT;
    return subs
      .map((sub) => {
        if (sub.isApiCategory && sub.apiCategories) {
          const take = Math.min(sub.apiCategories.length, remaining);
          remaining -= take;
          return { ...sub, apiCategories: sub.apiCategories.slice(0, take) };
        }
        const take = Math.min(sub.providers.length, remaining);
        remaining -= take;
        return { ...sub, providers: sub.providers.slice(0, take) };
      })
      .filter((sub) =>
        sub.isApiCategory
          ? (sub.apiCategories?.length ?? 0) > 0
          : sub.providers.length > 0
      );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render: Section Header Icon
  // ═══════════════════════════════════════════════════════════════════

  const getSectionIcon = (section: SectionDisplay): LucideIcon | null => {
    if (section.isWalletServicesSection) return Wallet;
    if (section.isApiSection) return Gamepad2;
    if (section.type && SECTION_TYPE_ICONS[section.type]) {
      return SECTION_TYPE_ICONS[section.type];
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="pb-6" dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-xl font-bold"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          >
            القائمة
          </h1>
        </div>

        {/* Search Bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{
            background: isDark ? '#1A1A1A' : '#F0F0F0',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <Search size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
          <input
            type="text"
            placeholder="ابحث عن خدمة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                color: isDark ? '#888' : '#999',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>

      {/* Recently Used Services */}
      {!searchQuery.trim() && recentServices && recentServices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-4"
        >
          <h3 className="text-xs font-bold mb-2" style={{ color: isDark ? '#888' : '#999' }}>الأخيرة</h3>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recentServices.slice(0, 6).map((service: any, index: number) => {
              const iconSrc = service.icon ? (service.icon.startsWith('data:') || service.icon.startsWith('http') ? service.icon : undefined) : undefined;
              return (
                <motion.button
                  key={service.id || index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * index }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (service.id) {
                      useAppStore.getState().setSelectedCategory(service.id);
                      useAppStore.getState().setActiveScreen('category-detail');
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 min-w-[60px]"
                >
                  <div
                    className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      background: iconSrc ? 'transparent' : `${service.color || '#5C1A1B'}15`,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt={service.name || ''} className="w-full h-full object-contain" />
                    ) : (
                      <Zap size={18} strokeWidth={1.5} color={service.color || '#5C1A1B'} />
                    )}
                  </div>
                  <span className="text-[9px] font-medium truncate max-w-[60px]" style={{ color: isDark ? '#999' : '#666' }}>
                    {service.name || 'خدمة'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Section Cards ───────────────────────────────────────── */}
      {filteredSections.map((section, sectionIndex) => {
        const isExpanded =
          expandedSections.has(section.id) || !!searchQuery.trim();
        const totalItems = countSectionItems(section);
        const hasMore = totalItems > COMPACT_LIMIT;
        const hasSubSections = section.subSections.length > 0;

        // Flat providers when no sub-sections
        const displayFlatProviders: FirebaseProvider[] | null =
          hasSubSections
            ? null
            : isExpanded
            ? section.providers
            : section.providers.slice(0, COMPACT_LIMIT);

        const SectionIcon = getSectionIcon(section);

        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * sectionIndex, duration: 0.4 }}
            className="px-4 mt-4"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => handleSectionHeaderClick(section.id)}
                className="active:scale-95 transition-transform"
              >
                <h3
                  className="text-sm font-bold flex items-center gap-1.5"
                  style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                >
                  {SectionIcon && (
                    <SectionIcon
                      size={14}
                      strokeWidth={2}
                      color="#5C1A1B"
                    />
                  )}
                  {section.name}
                </h3>
              </button>

              {hasMore && !searchQuery.trim() && (
                <button
                  onClick={() => toggleExpand(section.id)}
                  className="text-xs font-medium flex items-center gap-0.5 active:scale-95 transition-transform"
                  style={{ color: '#5C1A1B' }}
                >
                  {isExpanded ? 'إخفاء' : 'الكل'}
                  <ChevronLeft
                    size={14}
                    strokeWidth={1.5}
                    style={{
                      transform: isExpanded
                        ? 'rotate(90deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
              )}
            </div>

            {/* Provider Content Card */}
            <div className="rounded-2xl p-4" style={cardStyle}>
              {hasSubSections ? (
                renderSubSections(section.subSections, isExpanded)
              ) : displayFlatProviders && displayFlatProviders.length > 0 ? (
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  <AnimatePresence mode="popLayout">
                    {displayFlatProviders.map((provider, index) =>
                      renderProviderItem(provider, index)
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6">
                  <p
                    className="text-xs"
                    style={{ color: isDark ? '#555' : '#AAA' }}
                  >
                    لا توجد خدمات متاحة
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* ─── Empty: No Search Results ────────────────────────────── */}
      {filteredSections.length === 0 && searchQuery.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 mt-8"
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={cardStyle}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: isDark ? '#222' : '#F5F5F5' }}
            >
              <Search
                size={24}
                strokeWidth={1.5}
                color={isDark ? '#333' : '#DDD'}
              />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: isDark ? '#555' : '#AAA' }}
            >
              لا توجد نتائج
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: isDark ? '#444' : '#CCC' }}
            >
              جرب البحث بكلمات مختلفة
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Empty: No Sections Loaded Yet ───────────────────────── */}
      {filteredSections.length === 0 && !searchQuery.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 mt-8"
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={cardStyle}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: isDark ? '#222' : '#F5F5F5' }}
            >
              <Package
                size={24}
                strokeWidth={1.5}
                color={isDark ? '#333' : '#DDD'}
              />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: isDark ? '#555' : '#AAA' }}
            >
              جاري تحميل الخدمات...
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: isDark ? '#444' : '#CCC' }}
            >
              يرجى الانتظار أو تحديث الصفحة
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
