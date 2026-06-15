// Wallet Addresses Service - محفظة الجنوب
// Manages deposit wallet addresses with QR code support

import { get, ref, update, push, set, onValue, off, remove } from 'firebase/database';
import { database } from './firebase';

export interface WalletAddress {
  id: string;
  label: string;
  labelAr: string;
  network: string; // TRC20, ERC20, BTC, etc.
  address: string;
  currency: string; // USDT, BTC, ETH, etc.
  icon: string; // emoji or icon key
  color: string; // tailwind color class
  active: boolean;
  minDeposit: number;
  minDepositCurrency: string; // USD
  instructions: string;
  instructionsAr: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ===== CRUD =====

export async function getWalletAddresses(): Promise<WalletAddress[]> {
  const snapshot = await get(ref(database, 'walletAddresses'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, val]: [string, any]) => ({ id, ...val } as WalletAddress))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function saveWalletAddress(wallet: Partial<WalletAddress> & { address: string; currency: string }): Promise<string> {
  const now = new Date().toISOString();

  if (wallet.id) {
    const updates: Record<string, any> = {};
    Object.entries(wallet).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates[`walletAddresses/${wallet.id}/${key}`] = value;
      }
    });
    updates[`walletAddresses/${wallet.id}/updatedAt`] = now;
    await update(ref(database), updates);
    return wallet.id;
  } else {
    const newRef = push(ref(database, 'walletAddresses'));
    const id = newRef.key!;
    const existing = await getWalletAddresses();
    await set(newRef, {
      label: wallet.label || wallet.currency,
      labelAr: wallet.labelAr || wallet.label || wallet.currency,
      network: wallet.network || '',
      address: wallet.address,
      currency: wallet.currency,
      icon: wallet.icon || '💳',
      color: wallet.color || 'bg-primary',
      active: wallet.active ?? true,
      minDeposit: wallet.minDeposit || 10,
      minDepositCurrency: wallet.minDepositCurrency || 'USD',
      instructions: wallet.instructions || '',
      instructionsAr: wallet.instructionsAr || '',
      order: wallet.order ?? existing.length,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }
}

export async function deleteWalletAddress(id: string): Promise<void> {
  await remove(ref(database, `walletAddresses/${id}`));
}

export async function toggleWalletAddress(id: string, active: boolean): Promise<void> {
  await update(ref(database, `walletAddresses/${id}`), { active, updatedAt: new Date().toISOString() });
}

export async function reorderWalletAddresses(addresses: WalletAddress[]): Promise<void> {
  const updates: Record<string, any> = {};
  addresses.forEach((addr, index) => {
    updates[`walletAddresses/${addr.id}/order`] = index;
  });
  await update(ref(database), updates);
}

// ===== Subscription =====

export function subscribeToWalletAddresses(
  callback: (addresses: WalletAddress[]) => void
): () => void {
  const addrRef = ref(database, 'walletAddresses');
  const unsub = onValue(addrRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const addresses = Object.entries(data)
      .map(([id, val]: [string, any]) => ({ id, ...val } as WalletAddress))
      .filter(a => a.active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(addresses);
  });
  return () => off(addrRef);
}

// ===== Initialize Default Wallet Addresses =====

export async function initializeDefaultWalletAddresses(): Promise<void> {
  const existing = await getWalletAddresses();
  if (existing.length > 0) return;

  const defaults: Omit<WalletAddress, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      label: 'USDT TRC20',
      labelAr: 'USDT شبكة TRC20',
      network: 'TRC20',
      address: 'TYourTRC20WalletAddressHere',
      currency: 'USDT',
      icon: '💰',
      color: 'bg-green-500',
      active: true,
      minDeposit: 10,
      minDepositCurrency: 'USD',
      instructions: 'Send USDT to the address above on TRC20 network',
      instructionsAr: 'أرسل USDT إلى العنوان أعلاه على شبكة TRC20',
      order: 0,
    },
    {
      label: 'USDT ERC20',
      labelAr: 'USDT شبكة ERC20',
      network: 'ERC20',
      address: '0xYourERC20WalletAddressHere',
      currency: 'USDT',
      icon: '🔷',
      color: 'bg-blue-500',
      active: true,
      minDeposit: 20,
      minDepositCurrency: 'USD',
      instructions: 'Send USDT to the address above on ERC20 network',
      instructionsAr: 'أرسل USDT إلى العنوان أعلاه على شبكة ERC20',
      order: 1,
    },
  ];

  for (const def of defaults) {
    const newRef = push(ref(database, 'walletAddresses'));
    const now = new Date().toISOString();
    await set(newRef, { ...def, createdAt: now, updatedAt: now });
  }
}
