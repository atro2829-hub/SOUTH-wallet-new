/**
 * Firebase Database Seed Script for South Wallet
 *
 * Run this script to initialize the Firebase RTDB with the proper structure.
 * This seeds: sections, default providers, API provider (G2Bulk), and visibility settings.
 *
 * Usage: npx tsx scripts/seed-firebase.ts
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBdOZt0SBMoFimfWEyUKpP5h4lnMOCqKxM",
  authDomain: "southern-portfolio.firebaseapp.com",
  databaseURL: "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: "southern-portfolio",
  storageBucket: "southern-portfolio.appspot.com",
  messagingSenderId: "501045825605",
  appId: "1:501045825605:web:a0b11c5db57c9831d3932c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ─── Sections ──────────────────────────────────────────────────────────

const sections: Record<string, any> = {
  'entertainment': {
    id: 'entertainment',
    name: 'الخدمات الترفيهية',
    icon: 'gamepad',
    color: '#9333EA',
    sortOrder: 0,
    isActive: true,
    type: 'main',
    subSections: {
      'shooting': { id: 'shooting', name: 'ألعاب إطلاق النار', icon: '', sortOrder: 0, isActive: true, parentId: 'entertainment', providerIds: ['pubg', 'freefire', 'call-of-duty'] },
      'strategy': { id: 'strategy', name: 'ألعاب الاستراتيجية', icon: '', sortOrder: 1, isActive: true, parentId: 'entertainment', providerIds: ['clash-royale', 'clash-of-clans'] },
      'adventure': { id: 'adventure', name: 'ألعاب المغامرات', icon: '', sortOrder: 2, isActive: true, parentId: 'entertainment', providerIds: ['roblox', 'minecraft', 'genshin-impact'] },
      'platforms': { id: 'platforms', name: 'منصات الألعاب', icon: '', sortOrder: 3, isActive: true, parentId: 'entertainment', providerIds: ['steam', 'ea-fc'] },
      'streaming': { id: 'streaming', name: 'خدمات البث', icon: '', sortOrder: 4, isActive: true, parentId: 'entertainment', providerIds: ['netflix', 'spotify', 'youtube-premium'] },
      'store-cards': { id: 'store-cards', name: 'بطاقات المتاجر', icon: '', sortOrder: 5, isActive: true, parentId: 'entertainment', providerIds: ['google-play', 'apple-itunes', 'amazon-gift'] },
      'gaming-cards': { id: 'gaming-cards', name: 'بطاقات الألعاب', icon: '', sortOrder: 6, isActive: true, parentId: 'entertainment', providerIds: ['psn-card', 'xbox-card', 'nintendo-card'] },
      'payment-cards': { id: 'payment-cards', name: 'بطاقات الدفع', icon: '', sortOrder: 7, isActive: true, parentId: 'entertainment', providerIds: ['visa-virtual', 'mastercard-virtual', 'paypal'] },
    }
  },
  'telecom': {
    id: 'telecom',
    name: 'خدمات الاتصالات',
    icon: 'phone',
    color: '#2563EB',
    sortOrder: 1,
    isActive: true,
    type: 'main',
    providerIds: ['yemen-mobile', 'yo', 'sabafon', 'y']
  },
  'internet': {
    id: 'internet',
    name: 'الإنترنت',
    icon: 'wifi',
    color: '#059669',
    sortOrder: 2,
    isActive: true,
    type: 'main',
    providerIds: ['y-net-internet', 'sabafon-internet', 'y-internet', 'yemen-mobile-internet']
  },
  'electricity': {
    id: 'electricity',
    name: 'الكهرباء والماء',
    icon: 'zap',
    color: '#D97706',
    sortOrder: 3,
    isActive: true,
    type: 'main',
    subSections: {
      'elec': { id: 'elec', name: 'الكهرباء', icon: '', sortOrder: 0, isActive: true, parentId: 'electricity', providerIds: ['elec-sanaa', 'elec-aden'] },
      'water': { id: 'water', name: 'المياه', icon: '', sortOrder: 1, isActive: true, parentId: 'electricity', providerIds: ['water-sanaa', 'water-aden'] },
    }
  },
  'government': {
    id: 'government',
    name: 'خدمات حكومية',
    icon: 'landmark',
    color: '#7C3AED',
    sortOrder: 4,
    isActive: true,
    type: 'main',
    subSections: {
      'identity': { id: 'identity', name: 'الأوراق الثبوتية', icon: '', sortOrder: 0, isActive: true, parentId: 'government', providerIds: ['civil-registry', 'passport'] },
      'traffic-municipal': { id: 'traffic-municipal', name: 'المرور والبلدية', icon: '', sortOrder: 1, isActive: true, parentId: 'government', providerIds: ['traffic', 'municipal'] },
    }
  },
  'providers': {
    id: 'providers',
    name: 'خدمات المزودين',
    icon: 'globe',
    color: '#E60000',
    sortOrder: 5,
    isActive: true,
    type: 'main',
    apiProviderId: '__all__',
  },
  'wallet-services': {
    id: 'wallet-services',
    name: 'خدمات المحفظة الخاصة',
    icon: 'wallet',
    color: '#E60000',
    sortOrder: 6,
    isActive: true,
    type: 'main',
  },
  'crypto': {
    id: 'crypto',
    name: 'الكريبتو',
    icon: 'bitcoin',
    color: '#F59E0B',
    sortOrder: 7,
    isActive: true,
    type: 'main',
    providerIds: ['bitcoin', 'ethereum', 'usdt']
  },
};

// ─── Providers ─────────────────────────────────────────────────────────

const providers: Record<string, any> = {
  // Telecom
  'yemen-mobile': { id: 'yemen-mobile', name: 'يمن موبايل', color: '#FFD700', icon: '', categoryId: 'telecom', sectionId: 'telecom', inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967', isActive: true, sortOrder: 0, executionType: 'manual' },
  'yo': { id: 'yo', name: 'YO!', color: '#FF6B35', icon: '', categoryId: 'telecom', sectionId: 'telecom', inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967', isActive: true, sortOrder: 1, executionType: 'manual' },
  'sabafon': { id: 'sabafon', name: 'سبأفون', color: '#00A651', icon: '', categoryId: 'telecom', sectionId: 'telecom', inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967', isActive: true, sortOrder: 2, executionType: 'manual' },
  'y': { id: 'y', name: 'واي', color: '#E31937', icon: '', categoryId: 'telecom', sectionId: 'telecom', inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967', isActive: true, sortOrder: 3, executionType: 'manual' },

  // Internet
  'y-net-internet': { id: 'y-net-internet', name: 'Y نت', color: '#2563EB', icon: '', categoryId: 'internet', sectionId: 'internet', inputLabel: 'رقم الحساب', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'sabafon-internet': { id: 'sabafon-internet', name: 'سبأفون نت', color: '#059669', icon: '', categoryId: 'internet', sectionId: 'internet', inputLabel: 'رقم الحساب', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'y-internet': { id: 'y-internet', name: 'واي نت', color: '#7C3AED', icon: '', categoryId: 'internet', sectionId: 'internet', inputLabel: 'رقم الحساب', inputType: 'text', isActive: true, sortOrder: 2, executionType: 'manual' },
  'yemen-mobile-internet': { id: 'yemen-mobile-internet', name: 'يمن موبايل نت', color: '#D97706', icon: '', categoryId: 'internet', sectionId: 'internet', inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967', isActive: true, sortOrder: 3, executionType: 'manual' },

  // Electricity & Water
  'elec-sanaa': { id: 'elec-sanaa', name: 'كهرباء صنعاء', color: '#D97706', icon: '', categoryId: 'electricity', sectionId: 'electricity', subSectionId: 'elec', inputLabel: 'رقم العداد', inputType: 'number', isActive: true, sortOrder: 0, executionType: 'manual' },
  'elec-aden': { id: 'elec-aden', name: 'كهرباء عدن', color: '#F59E0B', icon: '', categoryId: 'electricity', sectionId: 'electricity', subSectionId: 'elec', inputLabel: 'رقم العداد', inputType: 'number', isActive: true, sortOrder: 1, executionType: 'manual' },
  'water-sanaa': { id: 'water-sanaa', name: 'مياه صنعاء', color: '#2563EB', icon: '', categoryId: 'electricity', sectionId: 'electricity', subSectionId: 'water', inputLabel: 'رقم الاشتراك', inputType: 'number', isActive: true, sortOrder: 0, executionType: 'manual' },
  'water-aden': { id: 'water-aden', name: 'مياه عدن', color: '#3B82F6', icon: '', categoryId: 'electricity', sectionId: 'electricity', subSectionId: 'water', inputLabel: 'رقم الاشتراك', inputType: 'number', isActive: true, sortOrder: 1, executionType: 'manual' },

  // Government
  'civil-registry': { id: 'civil-registry', name: 'الأحوال المدنية', color: '#7C3AED', icon: '', categoryId: 'government', sectionId: 'government', subSectionId: 'identity', inputLabel: 'رقم الهوية', inputType: 'number', isActive: true, sortOrder: 0, executionType: 'manual' },
  'passport': { id: 'passport', name: 'جواز السفر', color: '#2563EB', icon: '', categoryId: 'government', sectionId: 'government', subSectionId: 'identity', inputLabel: 'رقم الجواز', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'traffic': { id: 'traffic', name: 'المرور', color: '#DC2626', icon: '', categoryId: 'government', sectionId: 'government', subSectionId: 'traffic-municipal', inputLabel: 'رقم اللوحة', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'municipal': { id: 'municipal', name: 'البلدية', color: '#059669', icon: '', categoryId: 'government', sectionId: 'government', subSectionId: 'traffic-municipal', inputLabel: 'رقم الطلب', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },

  // Entertainment - Games
  'pubg': { id: 'pubg', name: 'ببجي موبايل', color: '#E8B531', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'shooting', inputLabel: 'Player ID', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'freefire': { id: 'freefire', name: 'فري فاير', color: '#FF4500', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'shooting', inputLabel: 'Player ID', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'call-of-duty': { id: 'call-of-duty', name: 'كول أوف ديوتي', color: '#1A1A2E', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'shooting', inputLabel: 'Player ID', inputType: 'text', isActive: true, sortOrder: 2, executionType: 'manual' },
  'clash-royale': { id: 'clash-royale', name: 'كلاش رويال', color: '#2563EB', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'strategy', inputLabel: 'Player Tag', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'clash-of-clans': { id: 'clash-of-clans', name: 'كلاش أوف كلانس', color: '#D97706', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'strategy', inputLabel: 'Player Tag', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'roblox': { id: 'roblox', name: 'روبلوكس', color: '#DC2626', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'adventure', inputLabel: 'Username', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'minecraft': { id: 'minecraft', name: 'ماين كرافت', color: '#059669', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'adventure', inputLabel: 'Username', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'genshin-impact': { id: 'genshin-impact', name: 'جينشن إمباكت', color: '#7C3AED', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'adventure', inputLabel: 'UID', inputType: 'text', isActive: true, sortOrder: 2, executionType: 'manual' },

  // Entertainment - Platforms & Streaming
  'steam': { id: 'steam', name: 'ستيم', color: '#1B2838', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'platforms', inputLabel: 'Username', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'ea-fc': { id: 'ea-fc', name: 'EA FC', color: '#1A1A2E', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'platforms', inputLabel: 'EA ID', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'netflix': { id: 'netflix', name: 'نتفليكس', color: '#E50914', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'streaming', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 0, executionType: 'manual' },
  'spotify': { id: 'spotify', name: 'سبوتيفاي', color: '#1DB954', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'streaming', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 1, executionType: 'manual' },
  'youtube-premium': { id: 'youtube-premium', name: 'يوتيوب بريميوم', color: '#FF0000', icon: '', categoryId: 'wallet-services', sectionId: 'entertainment', subSectionId: 'streaming', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 2, executionType: 'manual' },

  // Entertainment - Cards
  'google-play': { id: 'google-play', name: 'جوجل بلاي', color: '#34A853', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'store-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 0, executionType: 'manual' },
  'apple-itunes': { id: 'apple-itunes', name: 'آيتونز', color: '#555555', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'store-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 1, executionType: 'manual' },
  'amazon-gift': { id: 'amazon-gift', name: 'أمازون', color: '#FF9900', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'store-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 2, executionType: 'manual' },
  'psn-card': { id: 'psn-card', name: 'بلايستيشن', color: '#003087', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'gaming-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 0, executionType: 'manual' },
  'xbox-card': { id: 'xbox-card', name: 'إكس بوكس', color: '#107C10', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'gaming-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 1, executionType: 'manual' },
  'nintendo-card': { id: 'nintendo-card', name: 'نينتندو', color: '#E60012', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'gaming-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 2, executionType: 'manual' },

  // Payment Cards
  'visa-virtual': { id: 'visa-virtual', name: 'فيزا افتراضية', color: '#1A1F71', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'payment-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 0, executionType: 'manual' },
  'mastercard-virtual': { id: 'mastercard-virtual', name: 'ماستركارد افتراضية', color: '#EB001B', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'payment-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 1, executionType: 'manual' },
  'paypal': { id: 'paypal', name: 'باي بال', color: '#003087', icon: '', categoryId: 'cards', sectionId: 'entertainment', subSectionId: 'payment-cards', inputLabel: 'البريد الإلكتروني', inputType: 'email', isActive: true, sortOrder: 2, executionType: 'manual' },

  // Crypto
  'bitcoin': { id: 'bitcoin', name: 'بيتكوين', color: '#F7931A', icon: '', categoryId: 'crypto', sectionId: 'crypto', inputLabel: 'محفظة BTC', inputType: 'text', isActive: true, sortOrder: 0, executionType: 'manual' },
  'ethereum': { id: 'ethereum', name: 'إيثريوم', color: '#627EEA', icon: '', categoryId: 'crypto', sectionId: 'crypto', inputLabel: 'محفظة ETH', inputType: 'text', isActive: true, sortOrder: 1, executionType: 'manual' },
  'usdt': { id: 'usdt', name: 'USDT', color: '#26A17B', icon: '', categoryId: 'crypto', sectionId: 'crypto', inputLabel: 'محفظة USDT', inputType: 'text', isActive: true, sortOrder: 2, executionType: 'manual' },
};

// ─── API Provider (G2Bulk) ─────────────────────────────────────────────

const g2bulkProvider: Record<string, any> = {
  'g2bulk': {
    id: 'g2bulk',
    name: 'G2Bulk',
    baseUrl: 'https://api.g2bulk.com/v1/',
    apiKey: '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
    authHeader: 'X-API-Key',
    method: 'GET',
    responseFormat: 'json',
    isActive: true,
    syncEnabled: true,
    createdAt: new Date().toISOString(),
    sectionId: 'providers',
    sectionName: 'خدمات المزودين',
    sectionIcon: 'globe',
    commission: 5,
    commissionType: 'percentage',
    balance: 0,
    balanceCurrency: 'USD',
    lastBalanceCheck: '',
  }
};

// ─── Visibility ────────────────────────────────────────────────────────

const visibility: Record<string, any> = {
  sections: {},
  providers: {},
};

Object.keys(sections).forEach(key => {
  visibility.sections[key] = true;
});
Object.keys(providers).forEach(key => {
  visibility.providers[key] = true;
});

// ─── Seed Function ─────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding Firebase database...');

  try {
    // 1. Seed sections
    console.log('Seeding sections...');
    for (const [key, value] of Object.entries(sections)) {
      await set(ref(db, `sections/${key}`), value);
      console.log(`  Section: ${value.name}`);
    }

    // 2. Seed providers
    console.log('Seeding providers...');
    for (const [key, value] of Object.entries(providers)) {
      await set(ref(db, `providers/${key}`), value);
      console.log(`  Provider: ${value.name}`);
    }

    // 3. Seed API provider (G2Bulk) - only if doesn't exist
    console.log('Seeding API provider (G2Bulk)...');
    const g2bulkSnapshot = await get(ref(db, 'adminSettings/apiProviders/g2bulk'));
    if (!g2bulkSnapshot.exists()) {
      await set(ref(db, 'adminSettings/apiProviders/g2bulk'), g2bulkProvider.g2bulk);
      console.log('  G2Bulk provider created');
    } else {
      console.log('  G2Bulk provider already exists, skipping');
    }

    // 4. Seed visibility
    console.log('Seeding visibility...');
    await set(ref(db, 'adminSettings/visibility'), visibility);
    console.log('  Visibility settings created');

    // 5. Set feature flags if not exist
    console.log('Seeding feature flags...');
    const flagsSnapshot = await get(ref(db, 'adminSettings/featureFlags'));
    if (!flagsSnapshot.exists()) {
      await set(ref(db, 'adminSettings/featureFlags'), {
        transfersEnabled: true,
        depositsEnabled: true,
        withdrawalsEnabled: true,
        exchangeEnabled: true,
        servicesEnabled: true,
        rechargeEnabled: true,
        billsEnabled: true,
        investmentEnabled: true,
        cryptoEnabled: true,
        giftCodesEnabled: true,
        qrPaymentsEnabled: true,
        referralEnabled: true,
        notificationsEnabled: true,
        biometricEnabled: true,
        pinEnabled: true,
        darkModeEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: '',
        registrationEnabled: true,
      });
      console.log('  Feature flags created');
    } else {
      console.log('  Feature flags already exist, skipping');
    }

    console.log('\nFirebase database seeded successfully!');
    console.log(`  ${Object.keys(sections).length} sections`);
    console.log(`  ${Object.keys(providers).length} providers`);
    console.log(`  1 API provider (G2Bulk)`);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
