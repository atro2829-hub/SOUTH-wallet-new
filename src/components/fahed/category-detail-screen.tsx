'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Search, ChevronLeft, ArrowLeft, Package, ShoppingCart, Wallet } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { productIcons, getProductIcon } from '@/lib/product-icons';
import { serviceIcons } from '@/lib/service-icons';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import type { ApiProviderCategory, ApiProviderProduct, ApiProviderConfig } from '@/lib/api-provider';

// ─── Category display names ─────────────────────────────────────────
const categoryNames: Record<string, string> = {
  'service-providers': 'مزودين الخدمات',
  'wallet-services': 'خدمات المحفظة الخاصة بنا',
  entertainment: 'خدمات ترفيهية',
  cards: 'بطاقات رقمية',
  telecom: 'خدمات الاتصالات',
  electricity: 'الكهرباء والماء',
  government: 'خدمات حكومية',
  internet: 'الإنترنت',
  crypto: 'الكريبتو',
  'crypto-invest': 'استثمار الكريبتو',
};

// ─── Sub-section icon keys (maps to productIcons or serviceIcons) ───
const subSectionIcons: Record<string, string> = {
  shooting: 'pubg',
  strategy: 'clash-royale',
  adventure: 'roblox',
  platforms: 'steam',
  streaming: 'netflix',
  'store-cards': 'google-play',
  'gaming-cards': 'psn-card',
  'payment-cards': 'visa-virtual',
  recharge: 'yemen-mobile',
  'internet-packages': 'yemen-net',
  elec: 'electricity',
  water: 'water',
  identity: 'civil-registry',
  'traffic-municipal': 'traffic',
  providers: 'yemen-net',
  'buy-sell': 'bitcoin',
  'usdt-plans': 'usdt',
};

// ─── Sub-sections with provider IDs (legacy fallback) ────────────────
interface SubSection {
  id: string;
  name: string;
  description: string;
  providerIds: string[];
  iconKey: string;
  color: string;
}

const categorySubSections: Record<string, SubSection[]> = {
  'service-providers': [],
  'wallet-services': [
    { id: 'shooting', name: 'ألعاب إطلاق النار', description: 'ببجي، فري فاير، فالورانت والمزيد', providerIds: ['pubg', 'freefire', 'call-of-duty', 'fortnite', 'valorant', 'apex-legends'], iconKey: 'pubg', color: '#F59E0B' },
    { id: 'strategy', name: 'ألعاب الاستراتيجية', description: 'كلاش رويال، كلاش اوف كلانس والمزيد', providerIds: ['clash-royale', 'clash-of-clans', 'league-legends'], iconKey: 'clash-royale', color: '#3B82F6' },
    { id: 'adventure', name: 'ألعاب المغامرات', description: 'روبلوكس، ماينكرافت، جينشين والمزيد', providerIds: ['roblox', 'minecraft', 'genshin-impact', 'honkai-star'], iconKey: 'roblox', color: '#5C1A1B' },
    { id: 'platforms', name: 'منصات الألعاب', description: 'ستيم، EA FC والمزيد', providerIds: ['steam', 'ea-fc'], iconKey: 'steam', color: '#1B2838' },
    { id: 'streaming', name: 'خدمات البث', description: 'نتفلكس، سبوتيفاي، يوتيوب بريميوم', providerIds: ['netflix', 'spotify', 'youtube-premium'], iconKey: 'netflix', color: '#E50914' },
    { id: 'store-cards', name: 'بطاقات المتاجر', description: 'جوجل بلاي، آيتونز، امازون', providerIds: ['google-play', 'apple-itunes', 'amazon-gift'], iconKey: 'google-play', color: '#34A853' },
    { id: 'gaming-cards', name: 'بطاقات الألعاب', description: 'بلايستيشن، اكسبوكس، نينتندو', providerIds: ['psn-card', 'xbox-card', 'nintendo-card'], iconKey: 'psn-card', color: '#00439C' },
    { id: 'payment-cards', name: 'بطاقات الدفع', description: 'فيزا، ماستركارد، بايبال', providerIds: ['visa-virtual', 'mastercard-virtual', 'paypal'], iconKey: 'visa-virtual', color: '#1A1F71' },
  ],
  entertainment: [
    { id: 'shooting', name: 'ألعاب إطلاق النار', description: 'ببجي، فري فاير، فالورانت والمزيد', providerIds: ['pubg', 'freefire', 'call-of-duty', 'fortnite', 'valorant', 'apex-legends'], iconKey: 'pubg', color: '#F59E0B' },
    { id: 'strategy', name: 'ألعاب الاستراتيجية', description: 'كلاش رويال، كلاش اوف كلانس والمزيد', providerIds: ['clash-royale', 'clash-of-clans', 'league-legends'], iconKey: 'clash-royale', color: '#3B82F6' },
    { id: 'adventure', name: 'ألعاب المغامرات', description: 'روبلوكس، ماينكرافت، جينشين والمزيد', providerIds: ['roblox', 'minecraft', 'genshin-impact', 'honkai-star'], iconKey: 'roblox', color: '#5C1A1B' },
    { id: 'platforms', name: 'منصات الألعاب', description: 'ستيم، EA FC والمزيد', providerIds: ['steam', 'ea-fc'], iconKey: 'steam', color: '#1B2838' },
    { id: 'streaming', name: 'خدمات البث', description: 'نتفلكس، سبوتيفاي، يوتيوب بريميوم', providerIds: ['netflix', 'spotify', 'youtube-premium'], iconKey: 'netflix', color: '#E50914' },
  ],
  cards: [
    { id: 'store-cards', name: 'بطاقات المتاجر', description: 'جوجل بلاي، آيتونز، امازون', providerIds: ['google-play', 'apple-itunes', 'amazon-gift'], iconKey: 'google-play', color: '#34A853' },
    { id: 'gaming-cards', name: 'بطاقات الألعاب', description: 'بلايستيشن، اكسبوكس، نينتندو', providerIds: ['psn-card', 'xbox-card', 'nintendo-card'], iconKey: 'psn-card', color: '#00439C' },
    { id: 'payment-cards', name: 'بطاقات الدفع', description: 'فيزا، ماستركارد، بايبال', providerIds: ['visa-virtual', 'mastercard-virtual', 'paypal'], iconKey: 'visa-virtual', color: '#1A1F71' },
  ],
  telecom: [
    { id: 'recharge', name: 'شحن رصيد', description: 'يمن موبايل، يو، سبأفون، واي', providerIds: ['yemen-mobile', 'yo', 'sabafon', 'y'], iconKey: 'yemen-mobile', color: '#C41E3A' },
    { id: 'internet-packages', name: 'باقات الإنترنت', description: 'يمن نت، واي نت، سبأفون نت', providerIds: ['yemen-net', 'y-net-internet', 'sabafon-internet'], iconKey: 'yemen-net', color: '#8B5CF6' },
  ],
  electricity: [
    { id: 'elec', name: 'الكهرباء', description: 'دفع فواتير الكهرباء', providerIds: ['elec-sanaa', 'elec-aden'], iconKey: 'electricity', color: '#F59E0B' },
    { id: 'water', name: 'المياه', description: 'دفع فواتير المياه', providerIds: ['water-sanaa', 'water-aden'], iconKey: 'water', color: '#06B6D4' },
  ],
  government: [
    { id: 'identity', name: 'الأوراق الثبوتية', description: 'السجل المدني، جواز السفر', providerIds: ['civil-registry', 'passport'], iconKey: 'civil-registry', color: '#6B7280' },
    { id: 'traffic-municipal', name: 'المرور والبلدية', description: 'خدمات المرور والبلدية', providerIds: ['traffic', 'municipal'], iconKey: 'traffic', color: '#DC2626' },
  ],
  internet: [
    { id: 'providers', name: 'مزودي الإنترنت', description: 'يمن نت، واي نت، سبأفون نت', providerIds: ['yemen-net', 'y-net-internet', 'sabafon-internet'], iconKey: 'yemen-net', color: '#8B5CF6' },
  ],
  crypto: [
    { id: 'buy-sell', name: 'شراء وبيع', description: 'بيتكوين، إيثريوم، USDT والمزيد', providerIds: ['bitcoin', 'ethereum', 'usdt', 'bnb', 'solana', 'tron'], iconKey: 'bitcoin', color: '#F7931A' },
  ],
  'crypto-invest': [
    { id: 'usdt-plans', name: 'خطط USDT', description: 'خطط استثمارية يومية وأسبوعية وشهرية وربع سنوية', providerIds: ['usdt-daily', 'usdt-weekly', 'usdt-monthly', 'usdt-quarterly'], iconKey: 'usdt', color: '#26A17B' },
  ],
};

// ─── Product image URLs from real service providers ──
const PRODUCT_IMAGES: Record<string, string> = {
  'pubg': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/pubgm_tile_aug2024.jpg',
  'freefire': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/free_fire_new_tile.png',
  'call-of-duty': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/codm-wl_178x178.jpg',
  'fortnite': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/fortnite_usa_tile.png',
  'valorant': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
  'apex-legends': 'https://seagm-media.seagmcdn.com/game_480/3116.jpg',
  'clash-royale': 'https://img-cdn-sg.payermax.com/shoplay365/prod/upload/picture/20240412094815705_CLASH_ROYALE_icon.jpg',
  'clash-of-clans': 'https://img-cdn-sg.payermax.com/shoplay365/prod/upload/picture/20240418072604722_clashofclans_appicon.jpg',
  'league-legends': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/LOL_tile.jpg',
  'roblox': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Roblox-tiles-178x178-new.jpg',
  'minecraft': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Minecraft-Java-Bedrock-tile_update_178x178.jpg',
  'genshin-impact': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/genshinimpact_tile.jpg',
  'honkai-star': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/hsr_tile.jpg',
  'steam': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/steam_us_tile.jpg',
  'ea-fc': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/FCMNewUpdate/new-en.jpg',
  'netflix': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Netflix_rebrand2_tile.png',
  'spotify': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/spotify_usa_tile.png',
  'youtube-premium': 'https://static.eneba.games/84fba7421ae9417ec36c.jpg',
  'google-play': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/gp_usa_tile.png',
  'apple-itunes': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/itunes_us_tile.jpg',
  'amazon-gift': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles-plain/GC_Amazon_ae_178x178.png',
  'psn-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/psn_store_tile.jpg',
  'xbox-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/xboxgiftcard_tile.jpg',
  'nintendo-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/US_Nintendo-eShop.jpg',
  'visa-virtual': 'https://seagm-media.seagmcdn.com/icon_400/2211.jpg',
  'mastercard-virtual': 'https://seagm-media.seagmcdn.com/icon_400/2858.jpg',
  'paypal': 'https://seagm-media.seagmcdn.com/icon_400/1818.jpg',
};

const STARTING_PRICES: Record<string, number> = {
  'pubg': 1200, 'freefire': 800, 'call-of-duty': 1500, 'fortnite': 2000,
  'valorant': 1800, 'apex-legends': 1500, 'clash-royale': 1000, 'clash-of-clans': 1000,
  'league-legends': 2000, 'roblox': 900, 'minecraft': 2500, 'genshin-impact': 1500,
  'honkai-star': 1500, 'steam': 5000, 'ea-fc': 3000,
  'netflix': 3500, 'spotify': 2500, 'youtube-premium': 3000,
  'google-play': 3000, 'apple-itunes': 3500, 'amazon-gift': 3000,
  'psn-card': 6000, 'xbox-card': 6000, 'nintendo-card': 6000,
  'visa-virtual': 5000, 'mastercard-virtual': 5000, 'paypal': 5000,
  'yemen-mobile': 100, 'yo': 100, 'sabafon': 100, 'y': 100,
  'yemen-net': 150, 'y-net-internet': 250, 'sabafon-internet': 400,
  'elec-sanaa': 500, 'elec-aden': 500, 'water-sanaa': 300, 'water-aden': 300,
  'civil-registry': 1000, 'passport': 5000, 'traffic': 500, 'municipal': 500,
  'bitcoin': 1550, 'ethereum': 3500, 'usdt': 15500, 'bnb': 4000, 'solana': 2000, 'tron': 1500,
  'usdt-daily': 15500, 'usdt-weekly': 38750, 'usdt-monthly': 77500, 'usdt-quarterly': 155000,
};

const iconFallbackMap: Record<string, string> = {
  'elec-sanaa': 'electricity', 'elec-aden': 'electricity',
  'water-sanaa': 'water', 'water-aden': 'water',
  'y-net-internet': 'y-net-internet', 'sabafon-internet': 'sabafon-internet',
  'bitcoin': 'bitcoin', 'ethereum': 'ethereum', 'usdt': 'usdt',
  'bnb': 'bitcoin', 'solana': 'bitcoin', 'tron': 'bitcoin',
  'usdt-daily': 'usdt', 'usdt-weekly': 'usdt', 'usdt-monthly': 'usdt', 'usdt-quarterly': 'usdt',
};

const telecomProviderIds = ['yemen-mobile', 'yo', 'sabafon', 'y'];

function getIconForProvider(providerId: string): string {
  if (productIcons[providerId]) return productIcons[providerId];
  const fallbackKey = iconFallbackMap[providerId];
  if (fallbackKey && productIcons[fallbackKey]) return productIcons[fallbackKey];
  if (serviceIcons[providerId]) return serviceIcons[providerId];
  if (fallbackKey && serviceIcons[fallbackKey]) return serviceIcons[fallbackKey];
  return serviceIcons['instant-pay'] || '';
}

function getProductImage(providerId: string): { src: string; isExternal: boolean } {
  const externalUrl = PRODUCT_IMAGES[providerId];
  if (externalUrl) return { src: externalUrl, isExternal: true };
  return { src: getIconForProvider(providerId), isExternal: false };
}

function formatPrice(price: number): string {
  return price.toLocaleString('ar-SA');
}

function ProductImage({ providerId, providerName, size = 'sm', iconUrl }: { providerId: string; providerName: string; size?: 'sm' | 'md' | 'lg'; iconUrl?: string }) {
  const { src: defaultSrc, isExternal } = getProductImage(providerId);
  const src = iconUrl || defaultSrc;
  const [imgError, setImgError] = useState(false);
  const fallbackIcon = getIconForProvider(providerId);
  const sizeClass = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-12 h-12' : 'w-9 h-9';
  const imgSizeClass = size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  if ((!isExternal && !iconUrl) || imgError) {
    return <img src={fallbackIcon} alt={providerName} className={`${imgSizeClass} object-contain`} draggable={false} />;
  }
  return <img src={src} alt={providerName} className={`${imgSizeClass} object-contain`} draggable={false} onError={() => setImgError(true)} />;
}

function SubSectionImage({ iconKey, color, firebaseIcon }: { iconKey: string; color: string; firebaseIcon?: string }) {
  // Prefer Firebase base64 icon over hardcoded maps
  if (firebaseIcon) {
    return <img src={firebaseIcon} alt="" className="w-10 h-10 object-contain" draggable={false} />;
  }
  const iconSrc = productIcons[iconKey] || serviceIcons[iconKey] || productIcons['pubg'];
  const externalUrl = PRODUCT_IMAGES[iconKey];
  const [imgError, setImgError] = useState(false);

  if (externalUrl && !imgError) {
    return <img src={externalUrl} alt="" className="w-10 h-10 object-contain" draggable={false} onError={() => setImgError(true)} />;
  }
  return <img src={iconSrc} alt="" className="w-10 h-10 object-contain" draggable={false} />;
}

// ─── Wallet Service / Package types ──────────────────────────────────
interface WalletServicePackage {
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

interface WalletServiceItem {
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
  packages?: Record<string, WalletServicePackage>;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function CategoryDetailScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    selectedCategory,
    setSelectedCategory,
    providers,
    setSelectedProvider,
    setOrderOpen,
    setActiveScreen,
    fbSections,
    fbWalletServices,
    fbApiProviders,
    fbVisibility,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'subsections' | 'products' | 'api-products' | 'wallet-packages'>('subsections');
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // API provider state
  const [apiCategoryData, setApiCategoryData] = useState<{ provider: ApiProviderConfig; category: ApiProviderCategory; products: ApiProviderProduct[] } | null>(null);
  const [selectedApiProduct, setSelectedApiProduct] = useState<ApiProviderProduct | null>(null);
  const [customerInput, setCustomerInput] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Wallet service state
  const [selectedWalletService, setSelectedWalletService] = useState<WalletServiceItem | null>(null);
  const [selectedWalletPackage, setSelectedWalletPackage] = useState<WalletServicePackage | null>(null);

  // ─── Derive API providers list from store ──────────────────────────
  const apiProviders = useMemo<ApiProviderConfig[]>(() => {
    const data = fbApiProviders;
    if (!data || Object.keys(data).length === 0) return [];
    return Object.entries(data)
      .filter(([, p]: [string, any]) => p.isActive !== false)
      .map(([key, p]: [string, any]) => ({
        id: key || p.id || '',
        name: p.name || '',
        baseUrl: p.baseUrl || '',
        apiKey: p.apiKey || '',
        apiSecret: p.apiSecret || '',
        authHeader: p.authHeader || 'X-API-Key',
        method: p.method || 'POST',
        headers: p.headers || {},
        bodyTemplate: p.bodyTemplate || '',
        responseFormat: p.responseFormat || 'json',
        fieldMappings: p.fieldMappings || undefined,
        isActive: p.isActive !== false,
        syncEnabled: p.syncEnabled !== false,
        lastSync: p.lastSync || '',
        createdAt: p.createdAt || '',
        categories: p.categories || {},
      }));
  }, [fbApiProviders]);

  const visibilityProviders = fbVisibility.providers;

  // ─── Determine the current section from Firebase ──────────────────
  const currentSection = useMemo(() => {
    if (!selectedCategory || selectedCategory.startsWith('apicat-')) return null;
    const sections = fbSections as Record<string, any> | null;
    if (!sections) return null;
    return sections[selectedCategory] || null;
  }, [selectedCategory, fbSections]);

  // ─── Determine section type ───────────────────────────────────────
  const sectionType = useMemo(() => {
    if (!currentSection) return 'regular';
    if (currentSection.apiProviderId) return 'api';
    if (currentSection.type === 'wallet-services' || currentSection.id === 'wallet-services') return 'wallet-services';
    return 'regular';
  }, [currentSection]);

  // Check if selectedCategory is an API category (from services-screen navigation)
  const isApiCategory = selectedCategory?.startsWith('apicat-') || false;

  // ─── Parse API category info from selectedCategory ────────────────
  const parseApiCategoryInfo = (): { providerId: string; categoryId: string } | null => {
    if (!selectedCategory?.startsWith('apicat-')) return null;
    // The provider ID might contain dashes, so we need to find the matching provider
    for (const ap of apiProviders) {
      const prefix = ap.id;
      const catStr = selectedCategory.replace(`apicat-${prefix}-`, '');
      if (catStr && catStr !== selectedCategory) {
        return { providerId: prefix, categoryId: catStr };
      }
    }
    return null;
  };

  const apiCategoryInfo = parseApiCategoryInfo();

  // Helper: safely convert Firebase data (array with nulls or object) to clean array
  const safeArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter((item: any) => item !== null && item !== undefined) as T[];
    if (typeof data === 'object') return Object.values(data).filter((item: any) => item !== null && item !== undefined) as T[];
    return [];
  };

  // ─── Load API category data when it's an API category ─────────────
  useEffect(() => {
    if (isApiCategory && apiCategoryInfo && apiProviders.length > 0) {
      const provider = apiProviders.find(ap => ap.id === apiCategoryInfo.providerId);
      if (provider) {
        const cats = provider.categories || {};
        const catList = safeArray<ApiProviderCategory>(cats);
        // Try matching by id (could have cat_ prefix from Firebase sync)
        const category = catList.find(c => String(c.id) === String(apiCategoryInfo.categoryId) || `cat_${c.id}` === apiCategoryInfo.categoryId || String(c.id) === apiCategoryInfo.categoryId.replace('cat_', ''));
        if (category) {
          const products = safeArray<ApiProviderProduct>(category.products).filter(p => p.isActive !== false);
          setApiCategoryData({ provider, category, products });
          setViewMode('api-products');
          return;
        }
      }
      setApiCategoryData(null);
      setViewMode('products');
    } else if (!isApiCategory) {
      // Check if this is a section with apiProviderId
      if (sectionType === 'api' && currentSection?.apiProviderId) {
        const providerId = currentSection.apiProviderId;
        const provider = apiProviders.find(ap => ap.id === providerId);
        if (provider) {
          const cats = provider.categories || {};
          const catList = safeArray<ApiProviderCategory>(cats);
          if (catList.length > 0) {
            // Show the first category's products, or list all categories
            setApiCategoryData(null); // Will show category list instead
            setViewMode('api-products');
          }
        }
      } else {
        setApiCategoryData(null);
      }
    }
  }, [selectedCategory, apiProviders, isApiCategory, apiCategoryInfo, sectionType, currentSection]);

  // ─── Normal category logic (non-API) ──────────────────────────────
  const categoryId = !isApiCategory && sectionType !== 'api' ? (selectedCategory || '') : '';
  const categoryProviders = !isApiCategory && sectionType !== 'api' ? providers.filter(p => p.categoryId === categoryId && p.isActive && visibilityProviders[p.id] !== false) : [];
  const rawSubSections = !isApiCategory && sectionType !== 'api' ? (categorySubSections[categoryId] || []) : [];
  const resolvedSubSections = rawSubSections.map(sub => {
    const subProviders = sub.providerIds
      .map(pid => categoryProviders.find(p => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => !!p);
    return { ...sub, providers: subProviders };
  }).filter(sub => sub.providers.length > 0);

  // ─── Wallet services for this section from Firebase ───────────────
  const walletServicesForSection = useMemo<WalletServiceItem[]>(() => {
    if (sectionType !== 'wallet-services') return [];
    const wsData = fbWalletServices as Record<string, any> | null;
    if (!wsData) return [];
    return Object.entries(wsData)
      .filter(([, ws]: [string, any]) => {
        if (ws.isActive === false) return false;
        if (visibilityProviders[ws.id] === false) return false;
        // Match by sectionId or by being unassigned with matching categoryId
        return ws.sectionId === categoryId || (!ws.sectionId && ws.categoryId === categoryId);
      })
      .map(([key, ws]: [string, any]) => ({
        id: key || ws.id || '',
        name: ws.name || '',
        description: ws.description || '',
        icon: ws.icon || '',
        color: ws.color || '',
        categoryId: ws.categoryId || '',
        sectionId: ws.sectionId || '',
        subSectionId: ws.subSectionId || '',
        inputLabel: ws.inputLabel || '',
        inputType: ws.inputType || 'text',
        inputPrefix: ws.inputPrefix || '',
        isActive: ws.isActive !== false,
        sortOrder: ws.sortOrder || 0,
        packages: ws.packages || {},
      }))
      .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  }, [fbWalletServices, sectionType, categoryId, visibilityProviders]);

  // ─── API categories for this section from Firebase ────────────────
  const apiCategoriesForSection = useMemo(() => {
    if (sectionType !== 'api' || !currentSection?.apiProviderId) return [];
    const providerId = currentSection.apiProviderId === '__all__' ? null : currentSection.apiProviderId;
    const result: { providerId: string; providerName: string; categoryId: string; category: ApiProviderCategory }[] = [];
    
    for (const ap of apiProviders) {
      if (providerId && ap.id !== providerId) continue;
      if (!ap.categories) continue;
      const catList = safeArray<ApiProviderCategory>(ap.categories);
      for (const cat of catList) {
        result.push({
          providerId: ap.id,
          providerName: ap.name,
          categoryId: String(cat.id),
          category: cat,
        });
      }
    }
    return result;
  }, [apiProviders, sectionType, currentSection]);

  // ─── Reset view when category changes ─────────────────────────────
  useEffect(() => {
    if (isApiCategory) {
      setViewMode('api-products');
    } else if (sectionType === 'api') {
      setViewMode('api-products');
    } else if (sectionType === 'wallet-services') {
      setViewMode('products'); // Show wallet services list
    } else {
      const subSections = categorySubSections[selectedCategory || ''] || [];
      if (subSections.length === 1) {
        setSelectedSubSection(subSections[0].id);
        setViewMode('products');
      } else {
        setViewMode('subsections');
        setSelectedSubSection(null);
      }
    }
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedApiProduct(null);
    setSelectedWalletService(null);
    setSelectedWalletPackage(null);
    setCustomerInput('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedCategory, sectionType]);

  // Auto-skip single sub-section
  useEffect(() => {
    if (!isApiCategory && sectionType === 'regular' && resolvedSubSections.length === 1 && viewMode === 'subsections') {
      setSelectedSubSection(resolvedSubSections[0].id);
      setViewMode('products');
    }
  }, [resolvedSubSections.length, viewMode, isApiCategory, sectionType]);

  if (!selectedCategory) return null;

  // Get category name
  const getCategoryName = (): string => {
    if (isApiCategory && apiCategoryData) {
      return apiCategoryData.category.title || 'خدمة';
    }
    if (currentSection?.name) return currentSection.name;
    return categoryNames[categoryId] || categoryId;
  };

  const categoryName = getCategoryName();
  const currentSubSection = resolvedSubSections.find(s => s.id === selectedSubSection);
  const currentProviders = currentSubSection?.providers || [];
  const filteredProviders = searchQuery.trim()
    ? currentProviders.filter(p => p.name.includes(searchQuery.trim()))
    : currentProviders;
  const flatProviders = categoryProviders;
  const hasSubSections = !isApiCategory && sectionType === 'regular' && resolvedSubSections.length > 1;

  // Handle provider click
  const handleProviderClick = (providerId: string) => {
    if (telecomProviderIds.includes(providerId)) {
      setActiveScreen('recharge');
      return;
    }
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      setOrderOpen(true);
    }
  };

  // Handle wallet service click
  const handleWalletServiceClick = (ws: WalletServiceItem) => {
    setSelectedWalletService(ws);
    setViewMode('wallet-packages');
    setSelectedWalletPackage(null);
    setCustomerInput('');
  };

  // Handle API product purchase
  const handleApiProductPurchase = async () => {
    if (!selectedApiProduct || !apiCategoryData || !customerInput.trim()) return;
    
    setIsPurchasing(true);
    try {
      const { push, ref, set: firebaseSet } = await import('firebase/database');
      const { database: db } = await import('@/lib/firebase');
      
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = useAppStore.getState().user;
      
      // Prices in USD
      const priceUSD = selectedApiProduct.unit_price;
      
      const orderData = {
        id: orderId,
        userId: user?.id || '',
        userName: user?.name || '',
        userPhone: user?.phone || '',
        providerId: `api-${apiCategoryData.provider.id}`,
        providerName: apiCategoryData.provider.name,
        packageId: String(selectedApiProduct.id),
        packageName: selectedApiProduct.title,
        customerInput: customerInput.trim(),
        amount: priceUSD,
        currency: 'USD',
        status: 'pending',
        executionType: 'auto' as const,
        apiProviderId: apiCategoryData.provider.id,
        apiProductId: String(selectedApiProduct.id),
        apiCategoryId: String(apiCategoryData.category.id),
        createdAt: new Date().toISOString(),
      };
      
      // Write order to Firebase
      await firebaseSet(ref(db, `orders/${orderId}`), orderData);
      
      // Add to local store
      useAppStore.getState().addOrder(orderData);
      
      // Reset purchase state
      setSelectedApiProduct(null);
      setCustomerInput('');
      
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle wallet package purchase
  const handleWalletPackagePurchase = async () => {
    if (!selectedWalletPackage || !selectedWalletService || !customerInput.trim()) return;
    
    setIsPurchasing(true);
    try {
      const { ref, set: firebaseSet } = await import('firebase/database');
      const { database: db } = await import('@/lib/firebase');
      
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = useAppStore.getState().user;
      
      const orderData = {
        id: orderId,
        userId: user?.id || '',
        userName: user?.name || '',
        userPhone: user?.phone || '',
        providerId: selectedWalletService.id,
        providerName: selectedWalletService.name,
        packageId: selectedWalletPackage.id,
        packageName: selectedWalletPackage.name,
        customerInput: customerInput.trim(),
        amount: selectedWalletPackage.price || 0,
        currency: selectedWalletPackage.currency || 'YER',
        status: 'pending' as const,
        executionType: (selectedWalletPackage.executionType || 'manual') as 'manual' | 'auto',
        createdAt: new Date().toISOString(),
      };
      
      await firebaseSet(ref(db, `orders/${orderId}`), orderData);
      useAppStore.getState().addOrder(orderData);
      
      setSelectedWalletPackage(null);
      setCustomerInput('');
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (selectedApiProduct) {
      setSelectedApiProduct(null);
      setCustomerInput('');
      return;
    }
    if (selectedWalletPackage) {
      setSelectedWalletPackage(null);
      setCustomerInput('');
      return;
    }
    if (selectedWalletService && viewMode === 'wallet-packages') {
      setSelectedWalletService(null);
      setViewMode('products');
      return;
    }
    if (!isApiCategory && sectionType === 'regular' && viewMode === 'products' && hasSubSections) {
      setViewMode('subsections');
      setSelectedSubSection(null);
      setSearchQuery('');
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } else {
      setSelectedCategory(null);
      const prev = useAppStore.getState().previousScreen;
      useAppStore.getState().setActiveScreen(prev || '');
    }
  };

  const handleSubSectionClick = (subId: string) => {
    setSelectedSubSection(subId);
    setViewMode('products');
    setSearchQuery('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const handleApiCategoryClick = (providerId: string, categoryId: string) => {
    setSelectedCategory(`apicat-${providerId}-${categoryId}`);
  };

  // Colors
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#FFF' : '#1a1a1a';
  const secondaryTextColor = isDark ? '#AAA' : '#666';
  const subtleTextColor = isDark ? '#666' : '#999';
  const bgColor = isDark ? '#0A0A0A' : '#F5F5F5';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30"
        style={{ background: bgColor, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronRight size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold" style={{ color: textColor }}>
              {selectedApiProduct ? selectedApiProduct.title : selectedWalletPackage ? selectedWalletPackage.name : selectedWalletService ? selectedWalletService.name : categoryName}
            </h1>
            {(selectedApiProduct || selectedWalletPackage || selectedWalletService) && (
              <p className="text-[10px]" style={{ color: subtleTextColor }}>{categoryName}</p>
            )}
          </div>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <Search size={20} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
          </button>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-4 pb-3"
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${borderColor}` }}
              >
                <Search size={16} strokeWidth={1.5} color={subtleTextColor} />
                <input
                  type="text"
                  placeholder="ابحث عن خدمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: textColor }}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
                    مسح
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pb-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait">
          {/* API Product Purchase Dialog */}
          {selectedApiProduct ? (
            <motion.div
              key="api-purchase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                {/* Product Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    {selectedApiProduct.icon ? (
                      <img src={selectedApiProduct.icon} alt="" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Package size={24} color={isDark ? '#888' : '#666'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>{selectedApiProduct.title}</h3>
                    <p className="text-lg font-bold mt-1" style={{ color: '#5C1A1B' }}>
                      ${formatPrice(selectedApiProduct.unit_price)} $
                    </p>
                    {selectedApiProduct.stock !== undefined && (
                      <p className="text-[10px] mt-0.5" style={{ color: subtleTextColor }}>
                        المتوفر: {selectedApiProduct.stock}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Input */}
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    معرف العميل / رقم الحساب
                  </label>
                  <input
                    type="text"
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder="أدخل معرف العميل"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handleApiProductPurchase}
                  disabled={!customerInput.trim() || isPurchasing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (!customerInput.trim() || isPurchasing) ? '#666' : '#5C1A1B',
                    boxShadow: (!customerInput.trim() || isPurchasing) ? 'none' : '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      تأكيد الشراء
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : selectedWalletPackage ? (
            /* Wallet Package Purchase Dialog */
            <motion.div
              key="wallet-purchase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    {selectedWalletService?.icon ? (
                      <img src={selectedWalletService.icon} alt="" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Wallet size={24} color={isDark ? '#888' : '#666'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>{selectedWalletPackage.name}</h3>
                    {selectedWalletPackage.price !== undefined && (
                      <p className="text-lg font-bold mt-1" style={{ color: '#5C1A1B' }}>
                        {formatPrice(selectedWalletPackage.price)} $
                      </p>
                    )}
                    {selectedWalletPackage.description && (
                      <p className="text-[10px] mt-0.5" style={{ color: subtleTextColor }}>
                        {selectedWalletPackage.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    {selectedWalletService?.inputLabel || 'معرف العميل / رقم الحساب'}
                  </label>
                  <input
                    type={selectedWalletService?.inputType === 'phone' ? 'tel' : 'text'}
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder={selectedWalletService?.inputLabel || 'أدخل معرف العميل'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                <button
                  onClick={handleWalletPackagePurchase}
                  disabled={!customerInput.trim() || isPurchasing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (!customerInput.trim() || isPurchasing) ? '#666' : '#5C1A1B',
                    boxShadow: (!customerInput.trim() || isPurchasing) ? 'none' : '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      تأكيد الشراء
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : isApiCategory && viewMode === 'api-products' && apiCategoryData ? (
            /* API Products View */
            <motion.div
              key="api-products"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              {/* Provider badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  {apiCategoryData.provider.name}
                </span>
              </div>

              {/* Products grid */}
              {apiCategoryData.products.length > 0 ? (
                <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    {apiCategoryData.products.map((product, pIndex) => {
                      const priceUSD = product.unit_price;
                      return (
                        <motion.button
                          key={String(product.id)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => { setSelectedApiProduct(product); setCustomerInput(''); }}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            {product.icon ? (
                              <img src={product.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Package size={20} color={isDark ? '#888' : '#666'} />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                            {product.title}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                            {formatPrice(priceUSD)} $
                          </span>
                          {product.stock !== undefined && product.stock > 0 && (
                            <span className="text-[8px]" style={{ color: subtleTextColor }}>
                              متوفر: {product.stock}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد منتجات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم مزامنة المنتجات بعد</p>
                </div>
              )}
            </motion.div>
          ) : !isApiCategory && sectionType === 'api' && apiCategoriesForSection.length > 0 ? (
            /* API Categories List for section with apiProviderId */
            <motion.div
              key="api-section-categories"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 gap-2">
                  {apiCategoriesForSection.map((item, pIndex) => {
                    const productsCount = item.category.products ? Object.values(item.category.products).filter((p: any) => p && p.isActive !== false).length : 0;
                    return (
                      <motion.button
                        key={`${item.providerId}-${item.categoryId}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                        onClick={() => handleApiCategoryClick(item.providerId, item.categoryId)}
                        whileTap={{ scale: 0.93 }}
                        className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                        style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                      >
                        <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          {item.category.icon ? (
                            <img src={item.category.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Package size={20} color={isDark ? '#888' : '#666'} />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                          {item.category.title}
                        </span>
                        {productsCount > 0 && (
                          <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                            {productsCount} منتج
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : !isApiCategory && sectionType === 'wallet-services' && viewMode === 'wallet-packages' && selectedWalletService ? (
            /* Wallet Service Packages */
            <motion.div
              key={`wallet-packages-${selectedWalletService.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              {/* Service badge */}
              <div className="flex items-center gap-2 mb-3">
                {selectedWalletService.icon ? (
                  <img src={selectedWalletService.icon} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Wallet size={14} color="#5C1A1B" />
                )}
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  {selectedWalletService.name}
                </span>
              </div>

              {/* Packages grid */}
              {(() => {
                const pkgs = safeArray<WalletServicePackage>(selectedWalletService.packages).filter(p => p.isActive !== false);
                return pkgs.length > 0 ? (
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      {pkgs.map((pkg, pIndex) => (
                        <motion.button
                          key={pkg.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => { setSelectedWalletPackage(pkg); setCustomerInput(''); }}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            {selectedWalletService.icon ? (
                              <img src={selectedWalletService.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Package size={20} color={isDark ? '#888' : '#666'} />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                            {pkg.name}
                          </span>
                          {pkg.price !== undefined && (
                            <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                              {formatPrice(pkg.price)} $
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد باقات</p>
                    <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم إضافة باقات لهذه الخدمة بعد</p>
                  </div>
                );
              })()}
            </motion.div>
          ) : !isApiCategory && sectionType === 'wallet-services' && viewMode === 'products' ? (
            /* Wallet Services List */
            <motion.div
              key="wallet-services-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              {walletServicesForSection.length > 0 ? (
                <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="grid grid-cols-3 gap-2">
                    {walletServicesForSection.map((ws, pIndex) => {
                      const startingPrice = ws.packages ? Math.min(...safeArray<WalletServicePackage>(ws.packages).filter(p => p.isActive !== false && p.price).map(p => p.price || Infinity)) : (STARTING_PRICES[ws.id] || 0);
                      return (
                        <motion.button
                          key={ws.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => handleWalletServiceClick(ws)}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            <ProductImage providerId={ws.id} providerName={ws.name} size="lg" iconUrl={ws.icon} />
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ws.name}
                          </span>
                          {startingPrice > 0 && startingPrice !== Infinity && (
                            <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                              من {formatPrice(startingPrice)} $
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد خدمات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم إضافة خدمات بعد</p>
                </div>
              )}
            </motion.div>
          ) : hasSubSections && viewMode === 'subsections' ? (
            /* Sub-sections Grid (normal categories) */
            <motion.div
              key="subsections"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              <div className="mb-4">
                <p className="text-sm" style={{ color: secondaryTextColor }}>
                  اختر القسم الفرعي لعرض الخدمات المتاحة
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {resolvedSubSections.map((sub, index) => (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.06 * index, duration: 0.35 }}
                    onClick={() => handleSubSectionClick(sub.id)}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-2xl text-right active:scale-[0.97] transition-transform"
                    style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}
                  >
                    <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl" style={{ background: sub.color }} />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: sub.color }} />
                    <div className="relative z-10 p-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        <SubSectionImage iconKey={sub.iconKey} color={sub.color} firebaseIcon={currentSection?.subSections?.[sub.id]?.icon} />
                      </div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: textColor }}>{sub.name}</h3>
                      <p className="text-[10px] leading-relaxed mb-2" style={{ color: subtleTextColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sub.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sub.color}15`, color: sub.color }}>
                          {sub.providers.length} خدمة
                        </span>
                        <ChevronLeft size={14} strokeWidth={1.5} color={subtleTextColor} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : hasSubSections && viewMode === 'products' ? (
            /* Products in selected sub-section */
            <motion.div
              key={`products-${selectedSubSection}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {resolvedSubSections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { setSelectedSubSection(sub.id); setSearchQuery(''); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                      style={{
                        background: selectedSubSection === sub.id ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: selectedSubSection === sub.id ? '#FFFFFF' : secondaryTextColor,
                        boxShadow: selectedSubSection === sub.id ? '0 2px 8px rgba(92,26,27,0.3)' : 'none',
                      }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProviders.length > 0 ? (
                <div className="px-4 mt-2">
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredProviders.map((provider, pIndex) => {
                        const startingPrice = STARTING_PRICES[provider.id] || 0;
                        return (
                          <motion.button
                            key={provider.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                            onClick={() => handleProviderClick(provider.id)}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              <ProductImage providerId={provider.id} providerName={provider.name} size="lg" />
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {provider.name}
                            </span>
                            {startingPrice > 0 && (
                              <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                                من {formatPrice(startingPrice)} $
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 mt-8">
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Search size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد نتائج</p>
                    <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>جرب البحث بكلمات مختلفة</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Flat grid for categories without sub-sections */
            <motion.div
              key="flat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 mt-4"
            >
              {(() => {
                const displayProviders = searchQuery.trim()
                  ? flatProviders.filter(p => p.name.includes(searchQuery.trim()))
                  : flatProviders;
                return displayProviders.length > 0 ? (
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-3 gap-2">
                      {displayProviders.map((provider, pIndex) => {
                        const startingPrice = STARTING_PRICES[provider.id] || 0;
                        return (
                          <motion.button
                            key={provider.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                            onClick={() => handleProviderClick(provider.id)}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              <ProductImage providerId={provider.id} providerName={provider.name} size="lg" />
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {provider.name}
                            </span>
                            {startingPrice > 0 && (
                              <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                                من {formatPrice(startingPrice)} $
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Search size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد نتائج</p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
