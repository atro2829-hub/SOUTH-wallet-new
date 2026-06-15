// Categories Service - محفظة الجنوب
// Dynamic sections/categories loaded from Firebase - NO hardcoded data

import { get, ref, onValue, off, update, push, set, remove } from 'firebase/database';
import { database } from './firebase';

export interface DynamicCategory {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  icon: string; // lucide icon name or emoji
  iconType: 'lucide' | 'emoji' | 'image';
  color: string; // tailwind color class
  order: number;
  isVisible: boolean;
  screenType: 'api-products' | 'api-games' | 'manual' | 'link' | 'exchange' | 'usdt' | 'telecom' | 'investment' | 'escrow';
  apiProviderId: string; // reference to apiProviders
  description: string;
  descriptionAr: string;
  image: string; // optional image URL
  showInHome: boolean; // show in home screen grid
  showInServices: boolean; // show in services tab
  createdAt: string;
  updatedAt: string;
}

// ===== CRUD =====

export async function getCategories(): Promise<DynamicCategory[]> {
  const snapshot = await get(ref(database, 'categories'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, val]: [string, any]) => ({ id, ...val } as DynamicCategory))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function saveCategory(cat: Partial<DynamicCategory> & { name: string }): Promise<string> {
  const now = new Date().toISOString();

  if (cat.id) {
    const updates: Record<string, any> = {};
    Object.entries(cat).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates[`categories/${cat.id}/${key}`] = value;
      }
    });
    updates[`categories/${cat.id}/updatedAt`] = now;
    // Sync visibility
    updates[`adminSettings/visibility/sections/${cat.id}`] = cat.isVisible ?? true;
    await update(ref(database), updates);
    return cat.id;
  } else {
    const newRef = push(ref(database, 'categories'));
    const id = newRef.key!;
    const existing = await getCategories();
    await set(newRef, {
      name: cat.name,
      nameAr: cat.nameAr || cat.name,
      nameEn: cat.nameEn || cat.name,
      icon: cat.icon || '📋',
      iconType: cat.iconType || 'emoji',
      color: cat.color || 'bg-primary',
      order: cat.order ?? existing.length,
      isVisible: cat.isVisible ?? true,
      screenType: cat.screenType || 'manual',
      apiProviderId: cat.apiProviderId || '',
      description: cat.description || '',
      descriptionAr: cat.descriptionAr || '',
      image: cat.image || '',
      showInHome: cat.showInHome ?? true,
      showInServices: cat.showInServices ?? true,
      createdAt: now,
      updatedAt: now,
    });
    // Sync visibility
    await update(ref(database), {
      [`adminSettings/visibility/sections/${id}`]: cat.isVisible ?? true,
    });
    return id;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const updates: Record<string, any> = {
    [`categories/${id}`]: null,
    [`adminSettings/visibility/sections/${id}`]: null,
  };
  await update(ref(database), updates);
}

export async function toggleCategory(id: string, isVisible: boolean): Promise<void> {
  const updates: Record<string, any> = {
    [`categories/${id}/isVisible`]: isVisible,
    [`categories/${id}/updatedAt`]: new Date().toISOString(),
    [`adminSettings/visibility/sections/${id}`]: isVisible,
  };
  await update(ref(database), updates);
}

export async function reorderCategories(categories: DynamicCategory[]): Promise<void> {
  const updates: Record<string, any> = {};
  categories.forEach((cat, index) => {
    updates[`categories/${cat.id}/order`] = index;
  });
  await update(ref(database), updates);
}

// ===== Subscription =====

export function subscribeToCategories(
  callback: (categories: DynamicCategory[]) => void
): () => void {
  const catRef = ref(database, 'categories');
  const unsub = onValue(catRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const categories = Object.entries(data)
      .map(([id, val]: [string, any]) => ({ id, ...val } as DynamicCategory))
      .filter(c => c.isVisible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(categories);
  });
  return () => off(catRef);
}

// ===== Initialize Default Categories =====

export async function initializeDefaultCategories(): Promise<void> {
  const existing = await getCategories();
  if (existing.length > 0) return;

  const defaults: Omit<DynamicCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'الألعاب',
      nameAr: 'الألعاب',
      nameEn: 'Games',
      icon: 'Gamepad2',
      iconType: 'lucide',
      color: 'bg-red-500',
      order: 0,
      isVisible: true,
      screenType: 'api-games',
      apiProviderId: '',
      description: 'شحن الألعاب وشراء UC و diamonds',
      descriptionAr: 'شحن الألعاب وشراء UC و diamonds',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'بطاقات الهدايا',
      nameAr: 'بطاقات الهدايا',
      nameEn: 'Gift Cards',
      icon: 'Gift',
      iconType: 'lucide',
      color: 'bg-amber-500',
      order: 1,
      isVisible: true,
      screenType: 'api-products',
      apiProviderId: '',
      description: 'بطاقات رقمية متنوعة',
      descriptionAr: 'بطاقات رقمية متنوعة',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'المحافظ الرقمية',
      nameAr: 'المحافظ الرقمية',
      nameEn: 'Digital Wallets',
      icon: 'Wallet',
      iconType: 'lucide',
      color: 'bg-teal-500',
      order: 2,
      isVisible: true,
      screenType: 'api-products',
      apiProviderId: '',
      description: 'شحن المحافظ الرقمية',
      descriptionAr: 'شحن المحافظ الرقمية',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'شراء USDT',
      nameAr: 'شراء USDT',
      nameEn: 'Buy USDT',
      icon: 'Coins',
      iconType: 'lucide',
      color: 'bg-green-500',
      order: 3,
      isVisible: true,
      screenType: 'usdt',
      apiProviderId: '',
      description: 'شراء وبيع USDT',
      descriptionAr: 'شراء وبيع USDT',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'صرف العملات',
      nameAr: 'صرف العملات',
      nameEn: 'Exchange',
      icon: 'ArrowLeftRight',
      iconType: 'lucide',
      color: 'bg-cyan-500',
      order: 4,
      isVisible: true,
      screenType: 'exchange',
      apiProviderId: '',
      description: 'تحويل العملات',
      descriptionAr: 'تحويل العملات',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'الاتصالات',
      nameAr: 'الاتصالات',
      nameEn: 'Telecom',
      icon: 'Phone',
      iconType: 'lucide',
      color: 'bg-blue-500',
      order: 5,
      isVisible: true,
      screenType: 'telecom',
      apiProviderId: '',
      description: 'شحن الرصيد وباقات الإنترنت',
      descriptionAr: 'شحن الرصيد وباقات الإنترنت',
      image: '',
      showInHome: true,
      showInServices: true,
    },
  ];

  for (const def of defaults) {
    const newRef = push(ref(database, 'categories'));
    const now = new Date().toISOString();
    await set(newRef, { ...def, createdAt: now, updatedAt: now });
    await update(ref(database), {
      [`adminSettings/visibility/sections/${newRef.key}`]: def.isVisible,
    });
  }
}
